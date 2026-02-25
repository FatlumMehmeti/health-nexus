from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    contact: Optional[str] = None
    address: Optional[str] = None
    role_id: Optional[int] = None


class DoctorProfile(BaseModel):
    specialization: Optional[str] = None
    education: Optional[str] = None
    licence_number: Optional[str] = None
    tenant_id: Optional[int] = None
    working_hours: Optional[dict] = None


class PatientProfile(BaseModel):
    birthdate: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None


class TenantManagerProfile(BaseModel):
    tenant_id: int


class UserCreate(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    email: EmailStr
    password: str
    contact: Optional[str] = None
    address: Optional[str] = None
    role_id: int

    # Nested profile objects (optional)
    doctor: Optional[DoctorProfile] = None
    patient: Optional[PatientProfile] = None
    tenant_manager: Optional[TenantManagerProfile] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    role_id: Optional[int] = None
    password: Optional[str] = None


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True