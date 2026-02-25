from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

class UserTenantPlanBase(BaseModel):
    tenant_id: int
    name: str
    description: Optional[str] = None
    price: float

    duration: Optional[timedelta] = None
    max_appointments: Optional[int] = None
    max_consultations: Optional[int] = None
    is_active: Optional[bool] = True


class UserTenantPlanCreate(UserTenantPlanBase):
    pass


class UserTenantPlanRead(UserTenantPlanBase):
    id: int

    class Config:
        from_attributes = True


class UserTenantPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[timedelta] = None
    max_appointments: Optional[int] = None
    max_consultations: Optional[int] = None
    is_active: Optional[bool] = None