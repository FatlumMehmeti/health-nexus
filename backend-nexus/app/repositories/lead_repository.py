"""
Repository functions for lead data access.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import Lead, LeadStatus


def get_lead_by_id(db: Session, lead_id: int) -> Optional[Lead]:
    """
    Retrieve a lead by its primary key.
    
    Args:
        db: Active SQLAlchemy session
        lead_id: Primary key of the lead
    
    Returns:
        The Lead instance if found, otherwise None
    """
    return db.query(Lead).filter(Lead.id == lead_id).first()


def list_unclaimed_leads(
    db: Session,
    status: Optional[LeadStatus] = None,
    source: Optional[str] = None,
    sort: str = "created_at",
    limit: int = 20,
    offset: int = 0,
) -> tuple[List[Lead], int]:
    """
    List unclaimed leads (assigned_sales_user_id IS NULL) with optional filtering.
    
    Args:
        db: Active SQLAlchemy session
        status: Optional - filter by single LeadStatus
        source: Optional - filter by source string
        sort: Sort field with direction (created_at for ASC, -created_at for DESC)
        limit: Number of results per page
        offset: Pagination offset
    
    Returns:
        Tuple of (lead_list, total_count) where lead_list is paginated
    """
    # Base query: only unclaimed leads
    query = db.query(Lead).filter(Lead.assigned_sales_user_id.is_(None))
    
    # Add optional filters
    if status is not None:
        query = query.filter(Lead.status == status)
    
    if source is not None:
        query = query.filter(Lead.source == source)
    
    # Get total count before pagination
    total = query.count()
    
    # Handle sort (default created_at ASC, with - prefix for DESC)
    if sort.startswith("-"):
        sort_field = sort[1:]
        is_desc = True
    else:
        sort_field = sort
        is_desc = False
    
    # Apply sort
    if sort_field == "created_at":
        if is_desc:
            query = query.order_by(Lead.created_at.desc())
        else:
            query = query.order_by(Lead.created_at.asc())
    # Add other sort fields as needed (e.g., status, organization_name)
    
    # Apply pagination
    leads = query.offset(offset).limit(limit).all()
    
    return leads, total
