from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TenantSubscriptionBase(BaseModel):
    tenant_id: int
    subscription_plan_id: int


class TenantSubscriptionCreate(TenantSubscriptionBase):
    pass


class TenantSubscriptionRead(TenantSubscriptionBase):
    id: int
    activated_at: Optional[datetime]
    expires_at: Optional[datetime]
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    terminated_reason: Optional[str]

    model_config = ConfigDict(from_attributes=True)
