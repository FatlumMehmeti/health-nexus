import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

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


def require_role(role: str):
    """
    RBAC dependency factory.
    Usage: Depends(require_role("admin"))
    Assumes JWT payload includes a "role" field.
    """
    def dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role")
        if user_role != role:
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
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if normalize_role(user.get("role")) not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency