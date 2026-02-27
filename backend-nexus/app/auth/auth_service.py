import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from fastapi import HTTPException

from app.auth.auth_schema import SignupRequest, SignupResponse, TokenResponse
from app.auth.auth_utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
    TokenError,
    verify_password,
    verify_refresh_token,
)
from app.db import SessionLocal
from app.models import Role, Session, Tenant, User, Enrollment, TenantManager

logger = logging.getLogger(__name__)

# Backward-compatible role name aliases (input after .upper() -> DB role name)
ROLE_NAME_ALIASES = {"ADMIN": "SUPER_ADMIN"}


def get_tenant_id_for_user(session, user: User) -> int | None:
    """
    Get the tenant_id for a user based on their role.
    - For TENANT_MANAGER: returns the first managed tenant id
    - For other roles: returns None
    """
    if user.role.name == "TENANT_MANAGER":
        # Get the first managed tenant for the tenant manager
        manager = session.execute(
            select(TenantManager).where(TenantManager.user_id == user.id)
        ).scalars().first()
        if manager:
            return manager.tenant_id
    return None


def login_user(email: str, password: str) -> TokenResponse:
    """
    Authenticate a user by email and password.

    Returns a JWT access token on success. Raises HTTPException 401 if
    credentials are invalid.
    """
    session = SessionLocal()
    try:
        # Load user by email with role eagerly to avoid extra query
        stmt = select(User).where(
            User.email == email).options(joinedload(User.role))
        user = session.execute(stmt).scalar_one_or_none()
        if user is None:
            logger.warning("auth.login_failed user_not_found email=%s", email)
            raise HTTPException(
                status_code=401, detail="Invalid email or password")
        if not verify_password(password, user.password):
            logger.warning("auth.login_failed bad_password email=%s", email)
            raise HTTPException(
                status_code=401, detail="Invalid email or password")

        # Get tenant_id based on user role
        tenant_id = get_tenant_id_for_user(session, user)
        payload = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.name,
        }
        if tenant_id is not None:
            payload["tenant_id"] = tenant_id
        token = create_access_token(data=payload)
        refresh_data = {"user_id": user.id, "email": user.email}
        if tenant_id is not None:
            refresh_data["tenant_id"] = tenant_id
        refresh_token = create_refresh_token(data=refresh_data)
        try:
            refresh_payload = verify_refresh_token(refresh_token)
        except TokenError:
            raise HTTPException(
                status_code=500, detail="Failed to issue refresh token")
        jti = refresh_payload.get("jti")
        exp = refresh_payload.get("exp")
        if jti is None or exp is None:
            raise HTTPException(
                status_code=500, detail="Failed to issue refresh token")
        db_session = Session(
            user_id=user.id,
            refresh_jti=jti,
            state="active",
            expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
            revoked_at=None,
        )
        session.add(db_session)
        session.commit()
        logger.info("auth.login_success user_id=%s email=%s role=%s",
                    user.id, user.email, user.role.name)
        return TokenResponse(access_token=token, refresh_token=refresh_token, token_type="bearer")
    except HTTPException:
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def refresh_access_token(refresh_token: str) -> TokenResponse:
    """
    Issue a new access token from a valid refresh token with session state enforcement.
    """
    try:
        payload = verify_refresh_token(refresh_token)
    except TokenError:
        logger.warning("auth.refresh_denied invalid_token")
        raise HTTPException(
            status_code=401, detail="Invalid or expired refresh token")
    user_id = payload.get("user_id")
    jti = payload.get("jti")
    if user_id is None or jti is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    session = SessionLocal()
    try:
        stmt = select(Session).where(Session.refresh_jti == jti)
        db_session = session.execute(stmt).scalar_one_or_none()
        if db_session is None:
            logger.warning(
                "auth.refresh_denied session_not_found jti=%s user_id=%s", jti, user_id)
            raise HTTPException(
                status_code=401, detail="Invalid refresh token")
        if db_session.state != "active":
            logger.warning(
                "auth.refresh_denied session_state=%s jti=%s user_id=%s", db_session.state, jti, user_id)
            raise HTTPException(
                status_code=401, detail="Invalid refresh token")
        now = datetime.now(timezone.utc)
        if db_session.expires_at < now:
            db_session.state = "expired"
            session.commit()
            logger.warning(
                "auth.refresh_denied session_state=%s jti=%s user_id=%s", db_session.state, jti, user_id)
            raise HTTPException(
                status_code=401, detail="Refresh token expired")
        user_stmt = select(User).where(
            User.id == user_id).options(joinedload(User.role))
        user = session.execute(user_stmt).scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=401, detail="Invalid refresh token")

        # Get tenant_id based on user role
        tenant_id = get_tenant_id_for_user(session, user)

        new_payload = {"user_id": user.id, "email": user.email, "role": user.role.name}
        if tenant_id is not None:
            new_payload["tenant_id"] = tenant_id
        new_access = create_access_token(new_payload)
        logger.info("auth.refresh_success user_id=%s email=%s",
                    user.id, user.email)
        return TokenResponse(access_token=new_access, token_type="bearer")
    except HTTPException:
        session.rollback()
        raise
    finally:
        session.close()


def logout_user(refresh_token: str) -> None:
    """
    Revoke the refresh session identified by the given refresh token.
    Idempotent: if the session is already revoked/expired, returns silently.
    """
    try:
        payload = verify_refresh_token(refresh_token)
    except TokenError:
        logger.warning("auth.logout_denied reason=%s jti=%s",
                       "invalid_token", None)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    jti = payload.get("jti")
    if jti is None:
        logger.warning("auth.logout_denied reason=%s jti=%s",
                       "missing_jti", jti)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    session = SessionLocal()
    try:
        stmt = select(Session).where(Session.refresh_jti == jti)
        db_session = session.execute(stmt).scalar_one_or_none()
        if db_session is None:
            logger.warning("auth.logout_denied reason=%s jti=%s",
                           "session_not_found", jti)
            raise HTTPException(
                status_code=401, detail="Invalid refresh token")
        if db_session.state != "active":
            logger.warning("auth.logout_denied reason=%s jti=%s",
                           "session_not_active", jti)
            return
        db_session.state = "revoked"
        db_session.revoked_at = datetime.now(timezone.utc)
        session.commit()
        logger.info("auth.logout_success jti=%s user_id=%s",
                    jti, db_session.user_id)
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def signup_user(body: SignupRequest) -> SignupResponse:
    """
    Create a user account and tenant enrollment. If the user already exists
    (same email), only create the enrollment for the given tenant if not already present.
    Raises 404 if tenant or role not found, 409 if enrollment already exists for (email, tenant).
    """
    session = SessionLocal()
    try:
        # Tenant must exist
        tenant = session.execute(select(Tenant).where(
            Tenant.id == body.tenant_id)).scalar_one_or_none()
        if tenant is None:
            logger.warning(
                "auth.signup_tenant_not_found tenant_id=%s", body.tenant_id)
            raise HTTPException(status_code=404, detail="Tenant not found")

        # Resolve role by name (normalized uppercase to match Roles table)
        role_name = (body.role or "client").strip().upper()
        role_name = ROLE_NAME_ALIASES.get(role_name, role_name)
        role = session.execute(select(Role).where(
            Role.name == role_name)).scalar_one_or_none()
        if role is None:
            logger.warning("auth.signup_role_not_found role=%s", role_name)
            raise HTTPException(status_code=404, detail="Role not found")

        # Find existing user by email (with role for response)
        user = session.execute(
            select(User).where(User.email == body.email).options(
                joinedload(User.role))
        ).scalar_one_or_none()

        if user is not None:
            # User exists: check if enrollment for this tenant already exists
            existing = session.execute(
                select(Enrollment).where(
                    Enrollment.user_id == user.id,
                    Enrollment.tenant_id == body.tenant_id,
                )
            ).scalar_one_or_none()
            if existing is not None:
                logger.warning(
                    "auth.signup_duplicate email=%s tenant_id=%s",
                    body.email,
                    body.tenant_id,
                )
                raise HTTPException(
                    status_code=409,
                    detail="User already has a enrollment for this tenant",
                )
            # Create enrollment only
            enrollment = Enrollment(user_id=user.id, tenant_id=body.tenant_id)
            session.add(enrollment)

            # If role is TENANT_MANAGER, also create TenantManager record
            if role.name == "TENANT_MANAGER":
                tenant_manager = TenantManager(
                    user_id=user.id, tenant_id=body.tenant_id)
                session.add(tenant_manager)

            session.commit()
            session.refresh(enrollment)
            logger.info(
                "auth.signup_enrollment_created user_id=%s tenant_id=%s",
                user.id,
                body.tenant_id,
            )
            return SignupResponse(
                user_id=user.id,
                email=user.email,
                role=user.role.name,
                tenant_id=body.tenant_id,
            )
        else:
            # Create user and enrollment
            hashed = hash_password(body.password)
            new_user = User(
                email=body.email,
                password=hashed,
                first_name=body.first_name,
                last_name=body.last_name,
                role_id=role.id,
            )
            session.add(new_user)
            session.flush()
            enrollment = Enrollment(
                user_id=new_user.id,
                tenant_id=body.tenant_id,
            )
            session.add(enrollment)

            # If role is TENANT_MANAGER, also create TenantManager record
            if role.name == "TENANT_MANAGER":
                tenant_manager = TenantManager(
                    user_id=new_user.id, tenant_id=body.tenant_id)
                session.add(tenant_manager)

            session.commit()
            session.refresh(new_user)
            logger.info(
                "auth.signup_success user_id=%s email=%s tenant_id=%s",
                new_user.id,
                new_user.email,
                body.tenant_id,
            )
            return SignupResponse(
                user_id=new_user.id,
                email=new_user.email,
                role=role.name,
                tenant_id=body.tenant_id,
            )
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
