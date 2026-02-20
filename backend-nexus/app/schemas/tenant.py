from pydantic import BaseModel
from datetime import datetime
from app.models.tenant import TenantStatus


class TenantBase(BaseModel):
    logo: str | None = None
    moto: str | None = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    logo: str | None = None
    moto: str | None = None


class TenantRead(TenantBase):
    id: int
    status: TenantStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantStatusUpdate(BaseModel):
    status: TenantStatus
    reason: str | None = None


# For future pagination support
class TenantListResponse(BaseModel):
    items: list[TenantRead]
    total: int
    page: int
    page_size: int