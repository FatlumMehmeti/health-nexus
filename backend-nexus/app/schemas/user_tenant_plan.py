from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import timedelta
from decimal import Decimal

class UserTenantPlanBase(BaseModel):
    tenant_id: int
    name: str
    description: Optional[str] = None

    price: Decimal = Field(..., gt=0)

    duration: Optional[int] = None

    max_appointments: Optional[int] = None
    max_consultations: Optional[int] = None
    is_active: Optional[bool] = True

class UserTenantPlanCreate(UserTenantPlanBase):
    pass


class UserTenantPlanRead(UserTenantPlanBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class UserTenantPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    duration: Optional[int] = None
    max_appointments: Optional[int] = None
    max_consultations: Optional[int] = None
    is_active: Optional[bool] = None
