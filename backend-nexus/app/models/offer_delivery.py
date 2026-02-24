import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class OfferDeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class OfferDelivery(Base, TimestampMixin):
    __tablename__ = "offer_deliveries"

    id: Mapped[int] = mapped_column(primary_key=True)

    recommendation_id: Mapped[int] = mapped_column(
        ForeignKey("recommendations.id"),
        nullable=False
    )

    patient_user_id: Mapped[int] = mapped_column(
        ForeignKey("patients.user_id"),
        nullable=False
    )

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False
    )

    status: Mapped[OfferDeliveryStatus] = mapped_column(
        Enum(OfferDeliveryStatus, name="offer_delivery_status"),
        default=OfferDeliveryStatus.PENDING,
        nullable=False
    )

    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    recommendation = relationship("Recommendation")