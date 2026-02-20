from pydantic import BaseModel
from datetime import datetime


class TenantSubscriptionBase(BaseModel):
    tenant_id: int
    membership_plan_id: int
    activated_at: datetime
    expires_at: datetime
    is_active: bool = True


class TenantSubscriptionCreate(TenantSubscriptionBase):
    pass


class TenantSubscriptionRead(TenantSubscriptionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
