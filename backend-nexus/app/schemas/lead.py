from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.lead import LeadStatus


class LeadCreate(BaseModel):
    """Request schema for creating a new lead from public consultation form."""
    
    licence_number: str = Field(..., description="Medical license number")
    organization_name: str = Field(..., description="Name of the organization")
    contact_name: str = Field(..., description="Full name of contact person")
    contact_email: str = Field(..., description="Email of contact person")
    contact_phone: Optional[str] = Field(None, description="Phone number (optional)")
    initial_message: Optional[str] = Field(None, description="Initial inquiry/message (optional)")
    source: Optional[str] = Field(None, description="How the lead was acquired (optional)")


class PublicLeadCreate(BaseModel):
    """Schema for public consultation/contact form (legacy endpoint compatibility)."""
    tenant_name: str
    contact_email: str
    description: str | None = None


class LeadRead(BaseModel):
    """Response schema for a lead."""
    
    id: int
    licence_number: str
    organization_name: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    initial_message: Optional[str] = None
    source: Optional[str] = None
    
    status: LeadStatus
    assigned_sales_user_id: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LeadCreateResponse(BaseModel):
    """Minimal response schema for POST /leads (public endpoint)."""
    
    id: int
    licence_number: str
    organization_name: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    initial_message: Optional[str] = None
    status: LeadStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LeadListItem(BaseModel):
    """Minimal lead item for list responses (GET /leads)."""
    
    id: int
    licence_number: str
    organization_name: str
    contact_name: str
    contact_email: str
    status: LeadStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LeadListResponse(BaseModel):
    """Paginated response for listing unclaimed leads."""
    
    items: List[LeadListItem]
    total: int
    page: int
    page_size: int
