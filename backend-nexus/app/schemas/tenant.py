from pydantic import BaseModel
from datetime import datetime
from app.models import TenantStatus


class TenantBase(BaseModel):
    name: str
    logo: str | None = None
    moto: str | None = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = None
    logo: str | None = None
    moto: str | None = None
    status: TenantStatus | None = None


class TenantRead(TenantBase):
    id: int
    status: TenantStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True