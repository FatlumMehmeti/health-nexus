from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import List, Optional


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class OrderBase(BaseModel):
    patient_user_id: int
    tenant_id: int


class OrderCreate(OrderBase):
    pass


class OrderRead(OrderBase):
    id: int
    status: OrderStatus
    subtotal: float
    tax: float
    discount: float
    total_amount: float

    model_config = ConfigDict(from_attributes=True)
