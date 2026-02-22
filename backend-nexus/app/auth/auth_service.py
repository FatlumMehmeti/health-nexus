import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from fastapi import HTTPException

from app.auth.auth_schema import TokenResponse
from app.auth.auth_utils import (
    create_access_token,
    create_refresh_token,
    TokenError,
    verify_password,
    verify_refresh_token,
)
from app.db import SessionLocal
from app.models import Session, User

logger = logging.getLogger(__name__)


def login_user(email: str, password: str) -> TokenResponse:
    """
    Authenticate a user by email and password.

    Returns a JWT access token on success. Raises HTTPException 401 if
    credentials are invalid.
    """
    session = SessionLocal()
    try:
        # Load user by email with role eagerly to avoid extra query
        stmt = select(User).where(User.email == email).options(joinedload(User.role))
        user = session.execute(stmt).scalar_one_or_none()
        if user is None:
            logger.warning("auth.login_failed user_not_found email=%s", email)
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not verify_password(password, user.password):
            logger.warning("auth.login_failed bad_password email=%s", email)
            raise HTTPException(status_code=401, detail="Invalid email or password")
        tenant_id = getattr(user, "tenant_id", None)
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
            raise HTTPException(status_code=500, detail="Failed to issue refresh token")
        jti = refresh_payload.get("jti")
        exp = refresh_payload.get("exp")
        if jti is None or exp is None:
            raise HTTPException(status_code=500, detail="Failed to issue refresh token")
        db_session = Session(
            user_id=user.id,
            refresh_jti=jti,
            state="active",
            expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
            revoked_at=None,
        )
        session.add(db_session)
        session.commit()
        logger.info("auth.login_success user_id=%s email=%s role=%s", user.id, user.email, user.role.name)
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
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user_id = payload.get("user_id")
    jti = payload.get("jti")
    if user_id is None or jti is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    session = SessionLocal()
    try:
        stmt = select(Session).where(Session.refresh_jti == jti)
        db_session = session.execute(stmt).scalar_one_or_none()
        if db_session is None:
            logger.warning("auth.refresh_denied session_not_found jti=%s user_id=%s", jti, user_id)
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if db_session.state != "active":
            logger.warning("auth.refresh_denied session_state=%s jti=%s user_id=%s", db_session.state, jti, user_id)
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        now = datetime.now(timezone.utc)
        if db_session.expires_at < now:
            db_session.state = "expired"
            session.commit()
            logger.warning("auth.refresh_denied session_state=%s jti=%s user_id=%s", db_session.state, jti, user_id)
            raise HTTPException(status_code=401, detail="Refresh token expired")
        user_stmt = select(User).where(User.id == user_id).options(joinedload(User.role))
        user = session.execute(user_stmt).scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        new_payload = {"user_id": user.id, "email": user.email, "role": user.role.name}
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id is not None:
            new_payload["tenant_id"] = tenant_id
        new_access = create_access_token(new_payload)
        logger.info("auth.refresh_success user_id=%s email=%s", user.id, user.email)
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
        logger.warning("auth.logout_denied reason=%s jti=%s", "invalid_token", None)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    jti = payload.get("jti")
    if jti is None:
        logger.warning("auth.logout_denied reason=%s jti=%s", "missing_jti", jti)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    session = SessionLocal()
    try:
        stmt = select(Session).where(Session.refresh_jti == jti)
        db_session = session.execute(stmt).scalar_one_or_none()
        if db_session is None:
            logger.warning("auth.logout_denied reason=%s jti=%s", "session_not_found", jti)
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if db_session.state != "active":
            logger.warning("auth.logout_denied reason=%s jti=%s", "session_not_active", jti)
            return
        db_session.state = "revoked"
        db_session.revoked_at = datetime.now(timezone.utc)
        session.commit()
        logger.info("auth.logout_success jti=%s user_id=%s", jti, db_session.user_id)
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
