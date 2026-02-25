from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth_utils import require_role
from app.db import SessionLocal
from app.models import UserTenantPlan
from app.schemas.user_tenant_plan import UserTenantPlanCreate, UserTenantPlanRead


router = APIRouter(
    prefix="/api/tenant/plans",
    tags=["Tenant Manager - Plans"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[UserTenantPlanRead])
def list_tenant_plans(
    db: Session = Depends(get_db),
    user=Depends(require_role("TENANT_MANAGER")),
):
    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant not found for manager")

    plans = (
        db.query(UserTenantPlan)
        .filter(UserTenantPlan.tenant_id == tenant_id)
        .order_by(UserTenantPlan.id.asc())
        .all()
    )
    return plans


@router.post("", response_model=UserTenantPlanRead, status_code=status.HTTP_201_CREATED)
def create_tenant_plan(
    payload: UserTenantPlanCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role("TENANT_MANAGER")),
):
    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant not found for manager")

    db_plan = UserTenantPlan(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        duration=payload.duration,
        max_appointments=payload.max_appointments,
        max_consultations=payload.max_consultations,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


@router.put("/{plan_id}", response_model=UserTenantPlanRead)
def update_tenant_plan(
    plan_id: int,
    payload: UserTenantPlanCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role("TENANT_MANAGER")),
):
    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant not found for manager")

    plan = (
        db.query(UserTenantPlan)
        .filter(UserTenantPlan.id == plan_id, UserTenantPlan.tenant_id == tenant_id)
        .first()
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    plan.name = payload.name
    plan.description = payload.description
    plan.price = payload.price
    plan.duration = payload.duration
    plan.max_appointments = payload.max_appointments
    plan.max_consultations = payload.max_consultations
    if payload.is_active is not None:
        plan.is_active = payload.is_active

    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/{plan_id}/toggle-active", response_model=UserTenantPlanRead)
def toggle_tenant_plan_active(
    plan_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    user=Depends(require_role("TENANT_MANAGER")),
):
    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant not found for manager")

    plan = (
        db.query(UserTenantPlan)
        .filter(UserTenantPlan.id == plan_id, UserTenantPlan.tenant_id == tenant_id)
        .first()
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    plan.is_active = is_active
    db.commit()
    db.refresh(plan)
    return plan

