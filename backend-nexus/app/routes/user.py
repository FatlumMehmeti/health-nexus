from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.models import User, Role
from app.schemas.user import UserRead, UserCreate
from app.auth.auth_utils import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserRead, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    """
    Create a user and assign role by role name.
    """

    # 1️⃣ Check email uniqueness
    existing_user = db.execute(
        select(User).where(User.email == body.email)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")

    # 2️⃣ Find role by name
    role = db.execute(
        select(Role).where(Role.name == body.role.upper())
    ).scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # 3️⃣ Hash password
    hashed_password = hash_password(body.password)

    # 4️⃣ Create user using relationship
    new_user = User(
        email=body.email,
        password=hashed_password,
        first_name=body.first_name,
        last_name=body.last_name,
        role=role,  # ✅ use relationship instead of role_id manually
        contact=body.contact,
        address=body.address,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/", response_model=list[UserRead])
def get_users(db: Session = Depends(get_db)):
    """
    Simple test route to verify users are loading correctly.
    """
    users = db.query(User).all()
    return users


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get single user by ID.
    """
    user = db.query(User).filter(User.id == user_id).first()

    return user