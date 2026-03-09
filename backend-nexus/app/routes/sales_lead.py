"""
Routes for lead management (public lead creation + sales agent operations).
"""

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.db import get_db
from app.models import LeadStatus
from app.schemas.lead import LeadCreate, LeadCreateResponse, LeadListResponse
from app.services.lead_service import create_lead
from app.repositories import list_unclaimed_leads
from app.auth.auth_utils import require_permission

router = APIRouter(prefix="/leads", tags=["Leads"])


# ===== Public Endpoints =====

@router.post("", response_model=LeadCreateResponse, status_code=status.HTTP_201_CREATED)
def post_create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
):
    """
    This endpoint is publicly accessible (no authentication required).
    Creates a lead with status=NEW and no assigned sales user (sits in the pool).

    """
    lead = create_lead(payload, db)
    return lead


@router.get("", response_model=LeadListResponse)
def get_leads(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    status: Optional[LeadStatus] = Query(default=None, description="Filter by status"),
    source: Optional[str] = Query(default=None, description="Filter by source"),
    sort: str = Query(default="created_at", description="Sort by field (use -field for DESC)"),
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(require_permission("sales:leads")),
):
    """
    List unclaimed leads with pagination and optional filters.
    
    **Requires:** SALES role (sales agent)
    
    Unclaimed leads are those with assigned_sales_user_id = NULL.
    This includes both new leads and dropped leads (any status).
    
    Query Parameters:
        page: Page number (default 1)
        page_size: Results per page (default 20, max 100)
        status: Optional - filter by single LeadStatus (NEW, QUALIFIED, CONTACTED, etc.)
        source: Optional - filter by source (e.g., WEBSITE, REFERRAL)
        sort: Sort field with optional direction (created_at or -created_at for DESC)
    
    Returns:
        Paginated response with list of leads, total count, page info
    """
    # Calculate offset for pagination
    offset = (page - 1) * page_size
    
    # Get leads from repository
    leads, total = list_unclaimed_leads(
        db=db,
        status=status,
        source=source,
        sort=sort,
        limit=page_size,
        offset=offset,
    )
    
    return LeadListResponse(
        items=leads,
        total=total,
        page=page,
        page_size=page_size,
    )
