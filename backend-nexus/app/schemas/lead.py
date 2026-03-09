from datetime import datetime
from pydantic import BaseModel
from app.models.lead import LeadStatus


class LeadBase(BaseModel):
    company_name: str
    contact_name: str | None = None
    email: str | None = None
    phone: str | None = None
    status: LeadStatus | None = None
    notes: str | None = None
    tenant_id: int


class LeadCreate(LeadBase):
    # Optional: if you want status to default automatically
    status: LeadStatus | None = None


class PublicLeadCreate(BaseModel):
    """Schema for public consultation/contact form - no tenant_id required."""

    tenant_name: str
    contact_email: str
    description: str | None = None


class LeadUpdate(BaseModel):
    status: LeadStatus | None = None
    notes: str | None = None


class LeadRead(LeadBase):
    id: int

    class Config:
        from_attributes = True


class PublicLeadTrackingStep(BaseModel):
    """
    One step of the public lead roadmap.

    state values are intentionally UI-friendly:
    - DONE (green)
    - IN_PROGRESS (orange)
    - NOT_STARTED (gray)
    """

    status: str
    state: str


class PublicLeadTrackingRead(BaseModel):
    """
    Public-safe lead tracking payload.

    Uses lead_id + contact email verification in the route layer
    so the frontend can render a status roadmap without authentication.
    """

    lead_id: int
    organization_name: str | None = None
    contact_email: str | None = None
    current_status: str
    created_at: datetime
    updated_at: datetime
    roadmap: list[PublicLeadTrackingStep]
