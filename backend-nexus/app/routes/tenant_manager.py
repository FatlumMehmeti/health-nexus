from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tenant_manager import TenantManager
from app.schemas.tenant_manager import (
    TenantManagerRead
)

router = APIRouter(prefix="/tenant-managers", tags=["Tenant Managers"])


@router.get("/", response_model=list[TenantManagerRead])
def get_all(db: Session = Depends(get_db)):
    return db.query(TenantManager).all()