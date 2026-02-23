from datetime import datetime
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.tenant import Tenant, TenantStatus
from app.models.consultation_request import ConsultationRequest
from app.schemas.tenant import TenantCreate, TenantRead
from app.schemas.consultation_request import ConsultationRequestCreate, ConsultationRequestRead


router = APIRouter(prefix="/tenants", tags=["Public Tenant Requests"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Endpoint for potential tenants to apply for a tenant account (Tenant Application).
@router.post("", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant_application(payload: TenantCreate, db: Session = Depends(get_db)):

    # If the email/licence_numer already exists in the database, tenant creation is not allowed.
    existing = db.query(Tenant).filter(
        (Tenant.email == payload.email) | (Tenant.licence_number == payload.licence_number)
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Tenant with this email or licence number already exists")
        
    tenant = Tenant(
        name=payload.name,
        email=payload.email,
        licence_number=payload.licence_number,
        status=TenantStatus.pending
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


# Endpoint for potential tenants to submit a consultation request 
# (e.g: to get more info about the product, ask for a demo etc) without applying for a tenant account.
@router.post(
    "/consultation",
    response_model=ConsultationRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_consultation_request(
    payload: ConsultationRequestCreate,
    db: Session = Depends(get_db),
):
    consultation = ConsultationRequest(
        tenant_name=payload.tenant_name,
        contact_email=payload.contact_email,
        description=payload.description,
        preferred_date=payload.preferred_date
    )

    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return consultation

# Add an endpoint that gets plans. (IGNORE because it is a scrapped for now)