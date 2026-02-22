from sqlalchemy import select
from sqlalchemy.orm import joinedload

from fastapi import HTTPException

from app.auth.auth_schema import TokenResponse
from app.auth.auth_utils import create_access_token, create_refresh_token, verify_password
from app.db import SessionLocal
from app.models import User


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
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not verify_password(password, user.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        payload = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.name,
        }
        token = create_access_token(data=payload)
        refresh_token = create_refresh_token(data={"user_id": user.id, "email": user.email})
        return TokenResponse(access_token=token, refresh_token=refresh_token, token_type="bearer")
    finally:
        session.close()
