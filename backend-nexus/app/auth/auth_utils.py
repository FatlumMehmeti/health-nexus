import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

security = HTTPBearer()

SECRET_KEY = "secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Role -> list of permission identifiers (for documentation / tooling)
ROLE_PERMISSIONS: Dict[str, list[str]] = {
    "admin": ["auth:me"],
    "doctor": ["auth:me"],
    "sales": [],
}

# Centralized RBAC: (method, route_id) -> allowed roles (lowercase)
PERMISSIONS_MATRIX: Dict[tuple[str, str], set[str]] = {
    ("GET", "auth:admin"): {"admin", "super_admin"},
    ("GET", "auth:me"): {"admin", "doctor"},
}

# Create pwd_context using CryptContext for bcrypt hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def normalize_role(role: Optional[str]) -> str:
    """Normalize role string for comparison (strip and lower)."""
    return (role or "").strip().lower()


class TokenError(Exception):
    """Raised when a JWT token is invalid or expired."""


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt via passlib.
    The hash includes a salt and is safe to store in the database.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify that a plaintext password matches the stored bcrypt hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_jti() -> str:
    """Generate a unique JWT ID for refresh tokens."""
    return secrets.token_urlsafe(32)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    - `data` is copied so the input is not mutated.
    - An expiration claim (`exp`) is always included.
    """
    to_encode = data.copy()
    to_encode["token_type"] = "access"
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT refresh token.

    - `data` is copied so the input is not mutated.
    - Adds token_type "refresh", jti, and exp.
    """
    to_encode = data.copy()
    to_encode["token_type"] = "refresh"
    to_encode["jti"] = generate_jti()
    to_encode["exp"] = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Returns the payload if valid. Raises `TokenError` if:
    - the token is malformed
    - the signature is invalid
    - the token has expired
    """
    try:
        payload: Dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("token_type") == "refresh":
            raise TokenError("Invalid token type")
        return payload
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT refresh token.

    Returns the payload if valid. Raises `TokenError` if:
    - the token is malformed, invalid, or expired
    - token_type is not "refresh"
    - jti is missing
    """
    try:
        payload: Dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("token_type") != "refresh":
            raise TokenError("Invalid token type")
        if "jti" not in payload:
            raise TokenError("Missing jti")
        return payload
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    # Retrieve the JWT token from the incoming request's Authorization header
    token = credentials.credentials

    try:
        # Verify token integrity and decode its payload (e.g. user identity, expiration)
        return verify_token(token)
    except TokenError:
        # If verification fails, deny access with an Unauthorized response
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _user_role_normalized(user: Dict[str, Any]) -> str:
    """Extract role from user payload (JWT or object) and return normalized (strip + lower) for consistent RBAC checks."""
    user_role_raw = user.get("role")
    user_role_str = (
        getattr(user_role_raw, "name", user_role_raw)
        if user_role_raw is not None
        else ""
    )
    if not isinstance(user_role_str, str):
        user_role_str = ""
    return user_role_str.strip().lower()


def require_role(role: str):
    """
    RBAC dependency factory.
    Usage: Depends(require_role("admin"))
    Assumes JWT payload includes a "role" field.
    Role comparison is case-insensitive. Treats "admin" as alias for "super_admin".
    """
    required_normalized = normalize_role(role)
    # Roles that satisfy SUPER_ADMIN requirement (admin is alias for super_admin)
    super_admin_aliases = {"super_admin", "admin"}

    def dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role_normalized = _user_role_normalized(user)
        if required_normalized == "super_admin":
            allowed = super_admin_aliases
        else:
            allowed = {required_normalized}
        if user_role_normalized not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency


def require_permission(route_id: str, method: Optional[str] = None):
    """
    RBAC dependency factory using the centralized permissions matrix.
    Usage: Depends(require_permission("auth:me")), or with method: Depends(require_permission("auth:admin", "GET"))
    """
    def dependency(
        request: Request,
        user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        effective_method = (method or request.method).upper()
        allowed_roles = PERMISSIONS_MATRIX.get((effective_method, route_id))
        if allowed_roles is None:
            logger.warning(
                "auth.rbac_denied missing_matrix method=%s route_id=%s user_id=%s role=%s",
                effective_method, route_id, user.get("user_id"), user.get("role"),
            )
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if _user_role_normalized(user) not in allowed_roles:
            logger.warning(
                "auth.rbac_denied role_not_allowed method=%s route_id=%s user_id=%s role=%s",
                effective_method, route_id, user.get("user_id"), user.get("role"),
            )
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency


def get_tenant_id_from_request(request: Request, header_name: str = "X-Tenant-Id") -> int:
    """
    Extract tenant_id from the request header as an integer.

    Raises HTTPException 400 if the header is missing or the value is not a valid integer.
    """
    value = request.headers.get(header_name)
    if value is None or (isinstance(value, str) and value.strip() == ""):
        raise HTTPException(
            status_code=400,
            detail=f"Missing or empty {header_name} header",
        )
    try:
        return int(value.strip() if isinstance(value, str) else value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail=f"{header_name} must be a valid integer",
        )


def require_tenant_access(tenant_id: int | None = None, header_name: str = "X-Tenant-Id"):
    """
    Tenant-safe authorization dependency factory.
    Ensures the current user's tenant_id matches the request's tenant (from argument or header).

    - If ``tenant_id`` is provided, it is used as the required tenant.
    - Otherwise, the tenant is read from the request header (default: ``X-Tenant-Id``).
    - User payload must contain ``tenant_id`` (int or str); otherwise 403.
    - If tenant does not match, raises 403 "Tenant access denied".

    Usage::

        # Require tenant from header X-Tenant-Id
        Depends(require_tenant_access())

        # Require tenant 123 (e.g. from path)
        Depends(require_tenant_access(tenant_id=123))
    """
    def dependency(
        request: Request,
        user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        if tenant_id is not None:
            effective_tenant_id = tenant_id
        else:
            effective_tenant_id = get_tenant_id_from_request(request, header_name)

        user_tenant_raw = user.get("tenant_id")
        if user_tenant_raw is None:
            raise HTTPException(status_code=403, detail="Tenant access denied")
        try:
            user_tenant_id = (
                int(user_tenant_raw) if not isinstance(user_tenant_raw, int) else user_tenant_raw
            )
        except (ValueError, TypeError):
            raise HTTPException(status_code=403, detail="Tenant access denied")

        if user_tenant_id != effective_tenant_id:
            raise HTTPException(status_code=403, detail="Tenant access denied")
        return user

    return dependency