from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class DoctorBase(BaseModel):
    specialization: Optional[str]
    education: Optional[str]
    licence_number: Optional[str]
    tenant_id: int
    working_hours: Optional[dict]


class DoctorCreate(DoctorBase):
    user_id: int


class AssignDoctorRequest(BaseModel):
    user_id: int


class DoctorCreateForTenant(BaseModel):
    """Create/assign doctor to tenant. tenant_id from JWT."""
    user_id: int
    specialization: Optional[str] = None
    education: Optional[str] = None
    licence_number: Optional[str] = None
    working_hours: Optional[dict] = None


class DoctorUpdate(BaseModel):
    specialization: Optional[str]
    education: Optional[str]
    licence_number: Optional[str]
    working_hours: Optional[dict]
    is_active: Optional[bool]


class DoctorRead(DoctorBase):
    user_id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
