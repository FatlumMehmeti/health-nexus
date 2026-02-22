from fastapi import APIRouter, Depends

from app.auth.auth_schema import LoginRequest, RefreshRequest, TokenResponse
from app.auth.auth_service import login_user, logout_user, refresh_access_token
from app.auth.auth_utils import get_current_user, require_permission

# Router for authentication endpoints
router = APIRouter(prefix="/auth", tags=["auth"])

# Login endpoint - returns JWT token
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest) -> TokenResponse:
    return login_user(body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest) -> TokenResponse:
    return refresh_access_token(body.refresh_token)


@router.post("/logout")
def logout(body: RefreshRequest) -> dict:
    logout_user(body.refresh_token)
    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return {"message": "You are authenticated", "user": user}

# Protected admin route using RBAC
@router.get("/admin")
def get_admin(user=Depends(require_permission("auth:admin"))):
    return {"message": "Welcome, admin!"}