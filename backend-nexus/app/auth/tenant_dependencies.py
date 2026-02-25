from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tenant_manager import TenantManager
from app.auth.auth_utils import get_current_user


def require_tenant_manager(tenant_id: int):
    """
    Ensures logged-in user is a manager of given tenant.
    """

    def dependency(
        current_user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        user_id = current_user.get("user_id")

        manager = db.query(TenantManager).filter(
            TenantManager.user_id == user_id,
            TenantManager.tenant_id == tenant_id
        ).first()

        if not manager:
            raise HTTPException(
                status_code=403,
                detail="Not authorized as tenant manager"
            )

        return current_user

    return dependency