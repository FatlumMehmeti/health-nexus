from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AppointmentStatusHistoryRead(BaseModel):
    id: int
    appointment_id: int
    old_status: str | None
    new_status: str
    changed_by: int | None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)
