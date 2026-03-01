from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.models import TenantSubscription, TenantManager, SubscriptionPlan, Doctor, Enrollment, TenantDepartment
from app.models.tenant_subscription import SubscriptionStatus
from app.models.enrollment import EnrollmentStatus
from app.schemas.tenant_subscription import TenantSubscriptionRead
from app.db import get_db
from sqlalchemy.orm import Session
from app.auth.auth_utils import get_current_user
from datetime import datetime, timezone


class ChangePlanRequest(BaseModel):
    """Request schema for changing subscription plan"""
    new_plan_id: int


router = APIRouter(prefix="/subscription_plan", tags=["Nexus Health Subscription Plans"])

@router.get("/current", response_model=TenantSubscriptionRead)
def get_current_subscription(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Get the tenant_id from the current user (via TenantManager)
    user_id = current_user.get("user_id")
    
    # Find the tenant this user manages
    tenant_manager = db.query(TenantManager).filter(
        TenantManager.user_id == user_id
    ).first()
    
    if not tenant_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a tenant manager"
        )
    
    tenant_id = tenant_manager.tenant_id
    
    # Find the active subscription for this tenant
    current_subscription = db.query(TenantSubscription).filter(
        TenantSubscription.tenant_id == tenant_id,
        TenantSubscription.expires_at > datetime.now(timezone.utc),
        TenantSubscription.activated_at.isnot(None),
        TenantSubscription.status == SubscriptionStatus.ACTIVE
    ).first()
    
    if not current_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found for this tenant"
        )
    
    return current_subscription


@router.post("/change", response_model=TenantSubscriptionRead)
def change_subscription_plan(
    request: ChangePlanRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Change subscription plan for the tenant manager's organization.
    Validates that the new plan can accommodate existing resources.
    (blocks downgrades when resources exceed new plan limits)
    """
    user_id = current_user.get("user_id")
    
    # Verify user is a tenant manager
    tenant_manager = db.query(TenantManager).filter(
        TenantManager.user_id == user_id
    ).first()
    
    if not tenant_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a tenant manager"
        )
    
    tenant_id = tenant_manager.tenant_id
    
    # Get current active subscription
    current_subscription = db.query(TenantSubscription).filter(
        TenantSubscription.tenant_id == tenant_id,
        TenantSubscription.expires_at > datetime.now(timezone.utc),
        TenantSubscription.activated_at.isnot(None),
        TenantSubscription.status == SubscriptionStatus.ACTIVE
    ).first()
    
    if not current_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found for this tenant"
        )
    
    # Get the new plan
    new_plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == request.new_plan_id
    ).first()
    
    if not new_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan with ID {request.new_plan_id} not found"
        )
    
    # Get current tenant's resource counts
    doctor_count = db.query(Doctor).filter(
        Doctor.tenant_id == tenant_id,
        Doctor.is_active == True
    ).count()
    
    patient_count = db.query(Enrollment).filter(
        Enrollment.tenant_id == tenant_id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).count()
    
    department_count = db.query(TenantDepartment).filter(
        TenantDepartment.tenant_id == tenant_id
    ).count()
    
    # Validate: if new plan has lower limits, check if resources fit
    # If new_plan limit is None, it means unlimited
    if new_plan.max_doctors is not None and doctor_count > new_plan.max_doctors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot downgrade to {new_plan.name}. You have {doctor_count} doctors but the plan supports only {new_plan.max_doctors}. Please remove {doctor_count - new_plan.max_doctors} doctor(s) first."
        )
    
    if new_plan.max_patients is not None and patient_count > new_plan.max_patients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot downgrade to {new_plan.name}. You have {patient_count} patients but the plan supports only {new_plan.max_patients}. Please remove {patient_count - new_plan.max_patients} patient(s) first."
        )
    
    if new_plan.max_departments is not None and department_count > new_plan.max_departments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot downgrade to {new_plan.name}. You have {department_count} departments but the plan supports only {new_plan.max_departments}. Please remove {department_count - new_plan.max_departments} department(s) first."
        )
    
    # Create new subscription
    now = datetime.now(timezone.utc)
    new_subscription = TenantSubscription(
        tenant_id=tenant_id,
        subscription_plan_id=request.new_plan_id,
        status=SubscriptionStatus.ACTIVE,
        activated_at=now,
        expires_at=None,  # Will be set by business logic or left open-ended
    )
    
    db.add(new_subscription)
    
    # Optionally mark old subscription as EXPIRED or CANCELLED
    current_subscription.status = SubscriptionStatus.CANCELLED
    current_subscription.cancelled_at = now
    current_subscription.cancellation_reason = f"Upgraded to {new_plan.name}"
    
    db.commit()
    db.refresh(new_subscription)
    
    return new_subscription