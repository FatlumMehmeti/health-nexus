from pydantic import BaseModel
from datetime import datetime


class TenantBase(BaseModel):
    logo: str | None = None
    moto: str


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    logo: str | None = None
    moto: str | None = None


class TenantRead(TenantBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
