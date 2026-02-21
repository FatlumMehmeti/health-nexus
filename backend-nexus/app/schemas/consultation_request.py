from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.models.consultation_request import ConsultationStatus

# Schema for tenant input when creating a consultation request (Body of the request)
class ConsultationRequestCreate(BaseModel):
    tenant_name: str
    contact_email: EmailStr
    description: str | None = None
    preferred_date: datetime | None = None

# Schema for reading/returning consultation requests (Body of the response)
class ConsultationRequestRead(BaseModel):
    id: int
    tenant_name: str
    contact_email: EmailStr
    description: str | None = None
    date_of_request: datetime
    preferred_date: datetime | None = None
    status: ConsultationStatus
    sales_agent_id: int | None = None

    class Config:
        from_attributes = True
        