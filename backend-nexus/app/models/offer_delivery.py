import enum
from datetime import datetime

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Enum, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class OfferDeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class OfferDelivery(Base, TimestampMixin):
    __tablename__ = "offer_deliveries"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "patient_user_id"],
            ["patients.tenant_id", "patients.user_id"],
            name="fk_offer_deliveries_patient_tenant_user",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    recommendation_id: Mapped[int] = mapped_column(ForeignKey("recommendations.id"), nullable=False)

    patient_user_id: Mapped[int] = mapped_column(nullable=False)

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)

    status: Mapped[OfferDeliveryStatus] = mapped_column(
        Enum(OfferDeliveryStatus, name="offer_delivery_status"),
        default=OfferDeliveryStatus.PENDING,
        nullable=False,
    )

    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    recommendation = relationship("Recommendation")
