from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tenant_manager import TenantManager
from app.schemas.tenant_manager import (
    TenantManagerCreate,
    TenantManagerRead
)

router = APIRouter(prefix="/tenant-managers", tags=["Tenant Managers"])


@router.get("/", response_model=list[TenantManagerRead])
def get_all(db: Session = Depends(get_db)):
    return db.query(TenantManager).all()


@router.post("/", response_model=TenantManagerRead)
def assign_manager(
    payload: TenantManagerCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(TenantManager).filter(
        TenantManager.user_id == payload.user_id,
        TenantManager.tenant_id == payload.tenant_id
    ).first()

    if existing:
        raise HTTPException(400, "Manager already assigned to tenant")

    manager = TenantManager(**payload.model_dump())

    db.add(manager)
    db.commit()
    db.refresh(manager)

    return manager


@router.delete("/")
def remove_manager(
    user_id: int,
    tenant_id: int,
    db: Session = Depends(get_db)
):
    manager = db.query(TenantManager).filter(
        TenantManager.user_id == user_id,
        TenantManager.tenant_id == tenant_id
    ).first()

    if not manager:
        raise HTTPException(404, "Assignment not found")

    db.delete(manager)
    db.commit()

    return {"message": "Manager removed from tenant"}