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

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    licence_number: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus), default=TenantStatus.pending, nullable=False
    )

    # Relationships
    subscriptions = relationship("TenantSubscription", back_populates="tenant")
    details = relationship("TenantDetails", back_populates="tenant", uselist=False)
    enrollments = relationship(
        "Enrollment",
        back_populates="tenant",
        overlaps="patient",
        cascade="all, delete-orphan"
    )
    user_tenant_plans = relationship(
        "UserTenantPlan",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    tenant_departments = relationship(
        "TenantDepartment",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    services = relationship("Service", back_populates="tenant")

    doctors = relationship(
        "Doctor",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    patients = relationship(
        "Patient",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    managers = relationship(
        "TenantManager",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    products = relationship(
        "Product",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

    carts = relationship(
        "Cart",
        back_populates="tenant",
        overlaps="patient,carts",
        cascade="all, delete-orphan"
    )

    orders = relationship(
        "Order",
        back_populates="tenant",
        overlaps="patient,orders",
        cascade="all, delete-orphan"
    )

    payments = relationship(
        "Payment",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
