import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class EnrollmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class Enrollment(Base, TimestampMixin):
    __tablename__ = "enrollments"

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_enrollment_user_tenant"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False,
    )

    # Compatibility with auth signup tests: enrollment is user-tenant membership.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    # Domain-specific enrollment fields are optional for auth membership flow.
    patient_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("patients.user_id"),
        nullable=True,
    )

    user_tenant_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_tenant_plans.id"),
        nullable=True,
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus, name="enrollment_status"),
        default=EnrollmentStatus.PENDING,
        nullable=False,
    )

    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    tenant = relationship("Tenant", back_populates="enrollments")
    user = relationship("User", foreign_keys=[user_id])
    patient = relationship("Patient")
    user_tenant_plan = relationship("UserTenantPlan", back_populates="enrollments")
    creator = relationship("User", foreign_keys=[created_by])
