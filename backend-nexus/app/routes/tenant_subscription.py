from fastapi import APIRouter, HTTPException, Depends, status
from app.models import TenantSubscription, TenantManager
from app.schemas.tenant_subscription import TenantSubscriptionRead
from app.db import get_db
from sqlalchemy.orm import Session
from app.auth.auth_utils import get_current_user
from datetime import datetime, timezone


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
        TenantSubscription.status == "ACTIVE"
    ).first()
    
    if not current_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found for this tenant"
        )
    
    return current_subscription