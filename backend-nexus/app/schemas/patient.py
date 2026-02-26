from pydantic import BaseModel, ConfigDict
from datetime import date


class PatientBase(BaseModel):
    birthdate: date | None = None
    gender: str | None = None
    blood_type: str | None = None


class PatientCreate(PatientBase):
    user_id: int


class PatientUpdate(PatientBase):
    pass


class PatientRead(PatientBase):
    user_id: int

    model_config = ConfigDict(from_attributes=True)
