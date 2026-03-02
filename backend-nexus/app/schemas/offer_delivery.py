from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.offer_delivery import OfferDeliveryStatus


class OfferDeliveryBase(BaseModel):
    recommendation_id: int
    patient_user_id: int
    tenant_id: int
    status: OfferDeliveryStatus = OfferDeliveryStatus.PENDING
    delivered_at: datetime | None = None
    responded_at: datetime | None = None
    expires_at: datetime | None = None


class OfferDeliveryCreate(OfferDeliveryBase):
    pass


class OfferDeliveryRead(OfferDeliveryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
