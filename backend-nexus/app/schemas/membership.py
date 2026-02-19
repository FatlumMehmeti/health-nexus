from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class MembershipBase(BaseModel):
    name: str
    price: Decimal
    duration: int  # days


class MembershipCreate(MembershipBase):
    pass


class MembershipUpdate(BaseModel):
    name: str | None = None
    price: Decimal | None = None
    duration: int | None = None


class MembershipRead(MembershipBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
