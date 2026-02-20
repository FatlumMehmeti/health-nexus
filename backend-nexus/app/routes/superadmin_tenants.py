from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.tenant import Tenant, TenantStatus
from app.schemas.tenant import TenantRead, TenantStatusUpdate

router = APIRouter(prefix="/tenants", tags=["Super Admin - Tenant Management"])


# Temporary DB dependency (we can later move this to app/db.py cleanly)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Lists tenants for the Super Admin dashboard.
# Supports optional filtering by status and search (moto).
# Defaults to returning all tenants ordered by newest first.
@router.get("", response_model=list[TenantRead])
def list_tenants(
    status_filter: TenantStatus | None = Query(default=None, alias="status"),
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Tenant)

    if status_filter:
        query = query.filter(Tenant.status == status_filter)

    if search:
        query = query.filter(Tenant.moto.ilike(f"%{search}%"))

    query = query.order_by(Tenant.id.desc())

    return query.all()


@router.get("/{tenant_id}", response_model=TenantRead)
def get_tenant(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    return tenant


@router.patch("/{tenant_id}/status", response_model=TenantRead)
def update_tenant_status(
    tenant_id: int,
    status_update: TenantStatusUpdate,
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    current_status = tenant.status
    new_status = status_update.status

    allowed_transitions = {
        TenantStatus.pending: [TenantStatus.approved, TenantStatus.rejected],
        TenantStatus.approved: [TenantStatus.suspended, TenantStatus.archived],
        TenantStatus.suspended: [TenantStatus.approved, TenantStatus.archived],
        TenantStatus.rejected: [TenantStatus.archived],
        TenantStatus.archived: [],
    }

    if current_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant is already in '{new_status.value}' status",
        )

    if new_status not in allowed_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition: '{current_status.value}' → '{new_status.value}'",
        )

    # TODO: Insert tenant_audit_logs entry here later

    tenant.status = new_status
    db.commit()
    db.refresh(tenant)

    return tenant