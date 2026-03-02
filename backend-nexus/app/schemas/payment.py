from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional


class PaymentStatus(str, Enum):
    INITIATED = "INITIATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentType(str, Enum):
    TENANT_SUBSCRIPTION = "TENANT_SUBSCRIPTION"
    ENROLLMENT = "ENROLLMENT"
    ORDER = "ORDER"
    CONSULTATION = "CONSULTATION"


class PaymentBase(BaseModel):
    payment_type: PaymentType
    price: float
    tenant_id: int
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentRead(PaymentBase):
    payment_id: int
    status: PaymentStatus

    model_config = ConfigDict(from_attributes=True)
