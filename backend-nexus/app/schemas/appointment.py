from pydantic import BaseModel
from datetime import datetime

from app.models.appointment import AppointmentStatus


class AppointmentBase(BaseModel):
    appointment_datetime: datetime | None = None
    description: str | None = None

    doctor_user_id: int
    patient_user_id: int
    tenant_id: int

    status: AppointmentStatus = AppointmentStatus.REQUESTED


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    appointment_datetime: datetime | None = None
    description: str | None = None
    status: AppointmentStatus | None = None


class AppointmentRead(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True