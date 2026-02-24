import enum
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class TenantStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"
    archived = "archived"


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Application/Identity fields
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    licence_number: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus), default=TenantStatus.pending, nullable=False
    )

    # Relationships
    subscriptions = relationship("TenantSubscription", back_populates="tenant")
    details = relationship("TenantDetails", back_populates="tenant", uselist=False)
    user_memberships = relationship(
        "UserTenantMembership", back_populates="tenant", cascade="all, delete-orphan"
    )

    tenant_departments = relationship(
        "TenantDepartment",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    services = relationship("Service", back_populates="tenant")