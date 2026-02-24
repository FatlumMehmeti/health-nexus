from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.user_tenant_plan import UserTenantPlan
from app.schemas.user_tenant_plan import (
    UserTenantPlanCreate,
    UserTenantPlanRead
)

router = APIRouter(
    prefix="/user-tenant-plans",
    tags=["User Tenant Plans"]
)


# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Plan
@router.post("/", response_model=UserTenantPlanRead)
def create_plan(
    plan: UserTenantPlanCreate,
    db: Session = Depends(get_db)
):

    plan_data = plan.model_dump()
    # Convert duration from timedelta to integer days if present
    if plan_data.get("duration") is not None:
        plan_data["duration"] = plan_data["duration"].days
    db_plan = UserTenantPlan(**plan_data)

    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)

    return db_plan


# Get All Plans
@router.get("/", response_model=List[UserTenantPlanRead])
def get_plans(db: Session = Depends(get_db)):
    return db.query(UserTenantPlan).all()


# Get Plan By ID
@router.get("/{plan_id}", response_model=UserTenantPlanRead)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):

    plan = db.query(UserTenantPlan).filter(
        UserTenantPlan.id == plan_id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Plan not found"
        )

    return plan