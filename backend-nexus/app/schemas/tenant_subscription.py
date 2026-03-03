from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ChangePlanRequest(BaseModel):
    """Request to change subscription plan"""
    new_plan_id: int


class SubscriptionStatsRead(BaseModel):
    """Response with resource usage stats and current plan info"""
    doctors_used: int
    patients_used: int
    departments_used: int
    current_plan_id: int
    current_plan_name: str

class TenantSubscriptionBase(BaseModel):
    tenant_id: int
    subscription_plan_id: int


class TenantSubscriptionCreate(TenantSubscriptionBase):
    pass


class TenantSubscriptionRead(TenantSubscriptionBase):
    id: int
    status: str
    activated_at: Optional[datetime]
    expires_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]

    model_config = ConfigDict(from_attributes=True)
