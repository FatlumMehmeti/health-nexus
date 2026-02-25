from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    email: EmailStr
    contact: Optional[str]
    address: Optional[str]
    role_id: Optional[int]


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    contact: Optional[str]
    address: Optional[str]
    role_id: Optional[int]
    password: Optional[str]


class UserRead(UserBase):
    id: int
    created_at: datetime
    email: EmailStr

    class Config:
        from_attributes = True