# This file will hold endpoints a non-registered tenant will use

#Examples:
# POST /public/tenants/requests (create pending tenant request)
# optional: GET /public/memberships (plan dropdown for the form)

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.tenant import Tenant, TenantStatus
from app.schemas.tenant import TenantCreate, TenantRead

router = APIRouter(prefix="/tenants", tags=["Public Tenant Requests"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant_application(payload: TenantCreate, db: Session = Depends(get_db)):
    # Force pending regardless of what client sends (public cannot set status)
    tenant = Tenant(
        logo=payload.logo,
        moto=payload.moto,
        status=TenantStatus.pending
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


# Add an endpoint where the potential tenant can request for an appointment/demo with the sales team (sales agent)
# Add an endpoint that gets plans.