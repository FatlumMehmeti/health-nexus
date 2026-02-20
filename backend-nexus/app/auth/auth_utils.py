from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

security = HTTPBearer()


SECRET_KEY = "secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Returns the payload if valid. Raises `TokenError` if:
    - the token is malformed
    - the signature is invalid
    - the token has expired
    """
    try:
        payload: Dict[str, Any] = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return payload
    except JWTError as exc:
        # Includes expired tokens (`ExpiredSignatureError`) and other JWT issues.
        raise TokenError("Invalid or expired token") from exc


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Retrieve the JWT token from the incoming request's Authorization header
    token = credentials.credentials

    try:
        # Verify token integrity and decode its payload (e.g. user identity, expiration)
        payload = verify_token(token)
        return payload
    except TokenError:
        # If verification fails, deny access with an Unauthorized response
        raise HTTPException(status_code=401, detail="Invalid or expired token")
