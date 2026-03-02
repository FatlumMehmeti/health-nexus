from pydantic import BaseModel, ConfigDict
from typing import Optional
from enum import Enum


class CartStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CONVERTED = "CONVERTED"
    ABANDONDED = "ABANDONDED"


class CartBase(BaseModel):
    patient_user_id: int
    tenant_id: int


class CartCreate(CartBase):
    pass


class CartRead(CartBase):
    id: int
    status: CartStatus

    model_config = ConfigDict(from_attributes=True)
