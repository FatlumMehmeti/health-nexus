# Super Admin - Tenant subcategory. List, get, status only. Details/doctors/departments are in tenant router.

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.auth.auth_utils import require_role
from app.db import get_db
from app.models.tenant import Tenant, TenantStatus
from app.models.subscription_plan import SubscriptionPlan
from app.models.tenant_subscription import TenantSubscription, SubscriptionStatus

from app.schemas.tenant import TenantRead, TenantStatusUpdate
from app.services.audit_service import create_audit_log
from app.models.tenant_audit_log import TenantAuditEventType

router = APIRouter(prefix="/tenants", tags=["Super Admin - Tenants"])


@router.get("", response_model=list[TenantRead])
def list_tenants(
    status_filter: TenantStatus | None = Query(default=None, alias="status"),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    """List tenants with optional status and search filters."""
    query = db.query(Tenant)
    if status_filter:
        query = query.filter(Tenant.status == status_filter)
    if search:
        query = query.filter(Tenant.name.ilike(f"%{search}%"))
    query = query.order_by(Tenant.id.desc())
    return query.all()


@router.get("/{tenant_id}", response_model=TenantRead)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}/status", response_model=TenantRead)
def update_tenant_status(
    tenant_id: int,
    status_update: TenantStatusUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

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

    if current_status == TenantStatus.pending and new_status == TenantStatus.approved:
        free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "FREE").first()
        if not free_plan:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="FREE plan not found in database",
            )
        existing_subscription = db.query(TenantSubscription).filter(
            TenantSubscription.tenant_id == tenant_id,
            TenantSubscription.expires_at > datetime.now(timezone.utc),
            TenantSubscription.activated_at.isnot(None),
            TenantSubscription.status == SubscriptionStatus.ACTIVE,
        ).first()
        if not existing_subscription:
            activated_at = datetime.now(timezone.utc)
            expires_at = activated_at + timedelta(days=free_plan.duration)
            new_subscription = TenantSubscription(
                tenant_id=tenant_id,
                subscription_plan_id=free_plan.id,
                activated_at=activated_at,
                expires_at=expires_at,
                approved_by=None,
                approved_at=activated_at,
                status=SubscriptionStatus.ACTIVE,
            )
            db.add(new_subscription)

    tenant.status = new_status
    create_audit_log(
        db=db,
        tenant_id=tenant.id,
        event_type=TenantAuditEventType.STATUS_CHANGE,
        entity_name="tenant",
        entity_id=tenant.id,
        old_value={"status": current_status.value},
        new_value={"status": new_status.value},
        performed_by_user_id=None,
        performed_by_role="SUPER_ADMIN",
        reason=status_update.reason,
    )
    db.commit()
    db.refresh(tenant)
    return tenant
