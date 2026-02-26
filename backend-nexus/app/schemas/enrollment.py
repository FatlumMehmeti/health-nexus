from pydantic import BaseModel
from enum import Enum
from typing import Optional


class EnrollmentStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class EnrollmentBase(BaseModel):
    tenant_id: int
    patient_user_id: int
    user_tenant_plan_id: int
    created_by: int


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentRead(EnrollmentBase):
    id: int
    status: EnrollmentStatus

    activated_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    expires_at: Optional[str] = None

    class Config:
        from_attributes = True

class EnrollmentCreateRequest(BaseModel):
    tenant_id: int
    patient_user_id: int
    user_tenant_plan_id: int


class EnrollmentStatusRead(BaseModel):
    id: int
    status: EnrollmentStatus
    activated_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    expires_at: Optional[str] = None
    updated_at: Optional[str] = None


class EnrollmentOperationalStatus(BaseModel):
    enrollment_id: int
    status: EnrollmentStatus
    isActive: bool
    expires_at: Optional[str] = None
    isExpired: bool
    last_updated: Optional[str] = None