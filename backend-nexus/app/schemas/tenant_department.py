from pydantic import BaseModel, ConfigDict
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from typing import Any as ServiceLandingItem


class TenantDepartmentBase(BaseModel):
    tenant_id: int
    department_id: int
    phone_number: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None


class TenantDepartmentCreate(TenantDepartmentBase):
    pass


class TenantDepartmentUpdate(BaseModel):
    phone_number: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None


class TenantDepartmentRead(TenantDepartmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class TenantDepartmentWithServicesRead(TenantDepartmentRead):
    """Tenant department with department name and services."""
    department_name: str
    services: list = []  # list[ServiceLandingItem]
