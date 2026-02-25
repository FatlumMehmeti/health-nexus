from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional
from datetime import datetime


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., max_length=100)
    price: Decimal = Field(..., gt=0)
    duration: int = Field(..., gt=0, description="Duration in days")

    max_doctors: Optional[int] = None
    max_patients: Optional[int] = None
    max_departments: Optional[int] = None


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    price: Optional[Decimal] = Field(None, gt=0)
    duration: Optional[int] = Field(None, gt=0)

    max_doctors: Optional[int] = None
    max_patients: Optional[int] = None
    max_departments: Optional[int] = None


class SubscriptionPlanRead(SubscriptionPlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }