from decimal import Decimal
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth.auth_utils import get_current_user
from app.db import get_db
from app.models.enrollment import Enrollment, EnrollmentStatus as EnrollmentStatusModel
from app.models.patient import Patient
from app.models.subscription_plan import SubscriptionPlan
from app.models.tenant_manager import TenantManager
from app.models.tenant_subscription import SubscriptionStatus, TenantSubscription
from app.models.user import User
from app.models.user_tenant_plan import UserTenantPlan
from app.schemas.enrollment import EnrollmentDetailRead, EnrollmentRead
from app.schemas.user_tenant_plan import (
    UserTenantPlanCreate,
    UserTenantPlanRead,
    UserTenantPlanUpdate,
)


router = APIRouter(
    prefix="/user-tenant-plans",
    tags=["User Tenant Plans"],
)


def verify_tenant_manager(db: Session, user_id: int, tenant_id: int):
    manager = db.query(TenantManager).filter(
        TenantManager.user_id == user_id,
        TenantManager.tenant_id == tenant_id,
    ).first()

    if not manager:
        raise HTTPException(
            status_code=403,
            detail="Not authorized as tenant manager for this tenant",
        )


def enforce_tenant_pricing_rules(db: Session, tenant_id: int, price: Decimal):
    """
    Enforce tenant-specific price band using the active tenant subscription base price.
    If no active paid subscription exists, only global schema bounds apply.
    """
    active_subscription = (
        db.query(TenantSubscription)
        .join(SubscriptionPlan, TenantSubscription.subscription_plan_id == SubscriptionPlan.id)
        .filter(
            TenantSubscription.tenant_id == tenant_id,
            TenantSubscription.status == SubscriptionStatus.ACTIVE,
        )
        .order_by(TenantSubscription.activated_at.desc(), TenantSubscription.id.desc())
        .first()
    )

    if not active_subscription or active_subscription.subscription_plan is None:
        return

    base_price = Decimal(str(active_subscription.subscription_plan.price or 0))
    if base_price <= 0:
        return

    min_allowed = (base_price * Decimal("0.50")).quantize(Decimal("0.01"))
    max_allowed = (base_price * Decimal("2.00")).quantize(Decimal("0.01"))

    if price < min_allowed or price > max_allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Price must be between {min_allowed} and {max_allowed} "
                "for this tenant's active subscription"
            ),
        )


@router.post("/", response_model=UserTenantPlanRead)
def create_plan(
    plan: UserTenantPlanCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    verify_tenant_manager(db, user_id, plan.tenant_id)
    enforce_tenant_pricing_rules(db, plan.tenant_id, Decimal(str(plan.price)))

    plan_data = plan.model_dump()

    if plan_data.get("duration") is not None:
        plan_data["duration"] = int(plan_data["duration"])

    db_plan = UserTenantPlan(
        **plan_data,
        updated_at=datetime.now(timezone.utc),
    )

    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)

    return db_plan


@router.post("/enroll", response_model=EnrollmentRead)
def enroll_in_plan(
    tenant_id: int,
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Allow any authenticated user (with a patient profile) to subscribe to a plan."""
    user_id = current_user.get("user_id")

    # Verify the plan exists and belongs to the tenant and is active
    plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id,
        UserTenantPlan.tenant_id == tenant_id,
        UserTenantPlan.is_active == True,
    ).first()
    if not plan:
        raise HTTPException(
            status_code=404, detail="Plan not found or not active")

    # Ensure the user has a patient profile (auto-create if missing)
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    if not patient:
        patient = Patient(user_id=user_id)
        db.add(patient)
        db.flush()

    # Check for existing enrollment for this tenant (unique per patient+tenant)
    existing = db.query(Enrollment).filter(
        Enrollment.tenant_id == tenant_id,
        Enrollment.patient_user_id == user_id,
    ).first()
    if existing:
        # Update existing enrollment to the new plan
        existing.user_tenant_plan_id = plan_id
        existing.status = EnrollmentStatusModel.ACTIVE
        existing.activated_at = datetime.now(timezone.utc)
        existing.cancelled_at = None
        db.commit()
        db.refresh(existing)
        return existing

    enrollment = Enrollment(
        tenant_id=tenant_id,
        patient_user_id=user_id,
        user_tenant_plan_id=plan_id,
        created_by=user_id,
        status=EnrollmentStatusModel.ACTIVE,
        activated_at=datetime.now(timezone.utc),
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.put("/{plan_id}", response_model=UserTenantPlanRead)
def update_plan(
    plan_id: int,
    plan_update: UserTenantPlanUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    db_plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id).first()

    if not db_plan:
        raise HTTPException(404, "Plan not found")

    verify_tenant_manager(db, user_id, db_plan.tenant_id)

    update_data = plan_update.model_dump(exclude_unset=True)

    if "price" in update_data and update_data["price"] is not None:
        enforce_tenant_pricing_rules(
            db,
            db_plan.tenant_id,
            Decimal(str(update_data["price"])),
        )

    if "duration" in update_data and update_data["duration"] is not None:
        update_data["duration"] = int(update_data["duration"])

    for k, v in update_data.items():
        setattr(db_plan, k, v)

    db_plan.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_plan)

    return db_plan


@router.get("/{plan_id}", response_model=UserTenantPlanRead)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    db_plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id).first()

    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    verify_tenant_manager(db, user_id, db_plan.tenant_id)

    return db_plan


@router.get("/tenant/{tenant_id}", response_model=List[UserTenantPlanRead])
def get_plans_by_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    verify_tenant_manager(db, user_id, tenant_id)

    return db.query(UserTenantPlan).filter(UserTenantPlan.tenant_id == tenant_id).all()


@router.get("/tenant/{tenant_id}/enrollments", response_model=List[EnrollmentDetailRead])
def get_tenant_enrollments(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    verify_tenant_manager(db, user_id, tenant_id)

    enrollments = (
        db.query(Enrollment)
        .options(
            joinedload(Enrollment.patient).joinedload(Patient.user),
            joinedload(Enrollment.user_tenant_plan),
        )
        .filter(Enrollment.tenant_id == tenant_id)
        .all()
    )

    result = []
    for e in enrollments:
        patient_user = e.patient.user if e.patient else None
        result.append(
            EnrollmentDetailRead(
                id=e.id,
                status=e.status.value if e.status else "PENDING",
                patient_user_id=e.patient_user_id,
                patient_email=patient_user.email if patient_user else None,
                patient_first_name=patient_user.first_name if patient_user else None,
                patient_last_name=patient_user.last_name if patient_user else None,
                plan_id=e.user_tenant_plan_id,
                plan_name=e.user_tenant_plan.name if e.user_tenant_plan else "Unknown",
                activated_at=str(e.activated_at) if e.activated_at else None,
                cancelled_at=str(e.cancelled_at) if e.cancelled_at else None,
                expires_at=str(e.expires_at) if e.expires_at else None,
                created_at=str(e.created_at) if e.created_at else None,
            )
        )

    return result


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    db_plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id).first()

    if not db_plan:
        raise HTTPException(
            status_code=404,
            detail="Plan not found",
        )

    verify_tenant_manager(db, user_id, db_plan.tenant_id)

    db.delete(db_plan)
    db.commit()

    return {
        "message": "Plan deleted successfully",
    }
