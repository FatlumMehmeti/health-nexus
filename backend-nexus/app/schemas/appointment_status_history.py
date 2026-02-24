from pydantic import BaseModel
from datetime import datetime


class AppointmentStatusHistoryRead(BaseModel):
    id: int
    appointment_id: int
    old_status: str | None
    new_status: str
    changed_by: int | None
    changed_at: datetime

    class Config:
        from_attributes = True