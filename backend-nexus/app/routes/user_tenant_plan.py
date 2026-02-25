from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.db import get_db
from app.models.user_tenant_plan import UserTenantPlan
from app.models.enrollment import Enrollment
from app.models.tenant_manager import TenantManager
from app.schemas.user_tenant_plan import (
    UserTenantPlanCreate,
    UserTenantPlanRead,
    UserTenantPlanUpdate
)
from app.schemas.enrollment import EnrollmentRead
from app.auth.auth_utils import get_current_user


router = APIRouter(
    prefix="/user-tenant-plans",
    tags=["User Tenant Plans"]
)


def verify_tenant_manager(db: Session, user_id: int, tenant_id: int):
    manager = db.query(TenantManager).filter(
        TenantManager.user_id == user_id,
        TenantManager.tenant_id == tenant_id
    ).first()

    if not manager:
        raise HTTPException(
            status_code=403,
            detail="Not authorized as tenant manager for this tenant"
        )


@router.post("/", response_model=UserTenantPlanRead)
def create_plan(
    plan: UserTenantPlanCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    verify_tenant_manager(db, user_id, plan.tenant_id)

    plan_data = plan.model_dump()

    if plan_data.get("duration") is not None:
        plan_data["duration"] = int(plan_data["duration"])

    db_plan = UserTenantPlan(
        **plan_data,
        updated_at=datetime.now(timezone.utc)
    )

    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)

    return db_plan


@router.put("/{plan_id}", response_model=UserTenantPlanRead)
def update_plan(
    plan_id: int,
    plan_update: UserTenantPlanUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    db_plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id
    ).first()

    if not db_plan:
        raise HTTPException(404, "Plan not found")

    verify_tenant_manager(db, user_id, db_plan.tenant_id)

    update_data = plan_update.model_dump(exclude_unset=True)

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
        UserTenantPlan.id == plan_id
    ).first()

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

    return db.query(UserTenantPlan).filter(
        UserTenantPlan.tenant_id == tenant_id
    ).all()


@router.get("/tenant/{tenant_id}/enrollments", response_model=List[EnrollmentRead])
def get_tenant_enrollments(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    verify_tenant_manager(db, user_id, tenant_id)

    enrollments = db.query(Enrollment).filter(
        Enrollment.tenant_id == tenant_id
    ).all()

    return enrollments


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")

    db_plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id
    ).first()

    if not db_plan:
        raise HTTPException(
            status_code=404,
            detail="Plan not found"
        )

    verify_tenant_manager(db, user_id, db_plan.tenant_id)

    db.delete(db_plan)
    db.commit()

    return {
        "message": "Plan deleted successfully"
    }