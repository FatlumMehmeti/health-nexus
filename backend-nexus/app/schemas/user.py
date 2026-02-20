from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    contact: str | None = None
    address: str | None = None


class UserCreate(UserBase):
    password: str
    role_id: int


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    contact: str | None = None
    address: str | None = None


class UserRead(UserBase):
    id: int
    role_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
