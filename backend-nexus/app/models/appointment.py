import enum
from sqlalchemy import ForeignKey, Text, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base, TimestampMixin


class AppointmentStatus(enum.Enum):
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)

    appointment_datetime: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    doctor_user_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.user_id")
    )

    patient_user_id: Mapped[int] = mapped_column(
        ForeignKey("patients.user_id")
    )

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id")
    )

    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"),
        default=AppointmentStatus.REQUESTED
    )

    # Relationships
    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")
    tenant = relationship("Tenant")
    status_history = relationship(
        "AppointmentStatusHistory",
        back_populates="appointment",
        cascade="all, delete-orphan"
    )