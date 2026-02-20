import enum
from sqlalchemy import String, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class TenantStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    suspended = "suspended"
    rejected = "rejected"
    archived = "archived"


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo: Mapped[str] = mapped_column(String(255), nullable=True)
    moto: Mapped[str] = mapped_column(String(255), nullable=True)

    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus), default=TenantStatus.pending
    )

    subscriptions = relationship("TenantSubscription", back_populates="tenant")