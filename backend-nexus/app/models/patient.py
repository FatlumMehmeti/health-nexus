from sqlalchemy import Date, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True
    )

    birthdate: Mapped[str | None] = mapped_column(
        Date,
        nullable=True
    )

    gender: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    blood_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="patient_profile",
        uselist=False
    )

    appointments = relationship(
        "Appointment",
        back_populates="patient"
    )