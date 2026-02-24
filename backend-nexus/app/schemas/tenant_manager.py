from pydantic import BaseModel


class TenantManagerBase(BaseModel):
    user_id: int
    tenant_id: int


class TenantManagerCreate(TenantManagerBase):
    pass


class TenantManagerRead(TenantManagerBase):
    class Config:
        from_attributes = True