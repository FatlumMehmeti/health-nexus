import enum

from sqlalchemy import ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class CartStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CONVERTED = "CONVERTED"
    ABANDONDED = "ABANDONDED"


class Cart(Base, TimestampMixin):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(primary_key=True)

    patient_user_id: Mapped[int] = mapped_column(
        ForeignKey("patients.user_id"),
        nullable=False
    )

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False
    )

    status: Mapped[CartStatus] = mapped_column(
        Enum(CartStatus, name="cart_status"),
        default=CartStatus.ACTIVE,
        nullable=False
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="carts")
    patient = relationship("Patient", back_populates="carts")