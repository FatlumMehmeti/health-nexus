from fastapi import HTTPException

from app.auth.auth_schema import TokenResponse
from app.auth.auth_utils import create_access_token, hash_password, verify_password

HARDCODED_EMAIL = "admin@test.com"
HARDCODED_PASSWORD_HASH = "$2b$12$Y1Ktc9FoLKoFuVpi3LpShOAEFA1ZuaIPlsQ24quj4AqbBRD7yjzRe"


def login_user(email: str, password: str) -> TokenResponse:
    """
    Authenticate a user by email and password.

    Returns a JWT access token on success. Raises HTTPException 401 if
    credentials are invalid.
    """
    if email != HARDCODED_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(password, HARDCODED_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"email": email})
    return TokenResponse(access_token=token, token_type="bearer")
