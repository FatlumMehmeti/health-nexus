import secrets

from fastapi import APIRouter, Depends, status, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.tenant import Tenant, TenantStatus
from app.models.user import User
from app.models.patient import Patient
from app.models.lead import Lead, LeadStatus
from app.schemas.tenant import TenantCreate, TenantRead
from app.schemas.lead import LeadCreate
from app.schemas.patient import ClientRegistrationRequest, ClientRegistrationResponse
from app.auth.auth_utils import hash_password, verify_token, TokenError


router = APIRouter(prefix="/tenants", tags=["Public Tenant Requests"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_authenticated_user_if_present(request: Request) -> dict | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        return verify_token(token)
    except TokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

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
    status_code=status.HTTP_201_CREATED,
)
def create_public_lead(
    payload: LeadCreate,  # you can rename schema later
    db: Session = Depends(get_db),
):

    lead = Lead(
        organization_name=payload.tenant_name,
        contact_email=payload.contact_email,
        source="WEBSITE",
        status=LeadStatus.NEW,
        notes=payload.description,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


@router.post(
    "/{tenant_id}/clients/register",
    response_model=ClientRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_client_in_tenant(
    tenant_id: int,
    payload: ClientRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    authenticated_user = get_authenticated_user_if_present(request)
    if authenticated_user is not None:
        user_tenant_id = authenticated_user.get("tenant_id")
        if user_tenant_id is not None:
            try:
                if int(user_tenant_id) != tenant_id:
                    raise HTTPException(status_code=403, detail="Tenant access denied")
            except (ValueError, TypeError):
                raise HTTPException(status_code=403, detail="Tenant access denied")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        generated_password = payload.password or secrets.token_urlsafe(24)
        user = User(
            email=payload.email,
            password=hash_password(generated_password),
            first_name=payload.first_name,
            last_name=payload.last_name,
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(User.email == payload.email).first()
            if not user:
                raise

    existing_patient = db.query(Patient).filter(
        Patient.user_id == user.id,
        Patient.tenant_id == tenant.id,
    ).first()
    if existing_patient:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "EMAIL_ALREADY_REGISTERED",
                "message": "Email already registered in this tenant",
            },
        )

    patient = Patient(
        user_id=user.id,
        tenant_id=tenant.id,
        birthdate=payload.birthdate,
        gender=payload.gender,
        blood_type=payload.blood_type,
    )
    db.add(patient)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        duplicate = db.query(Patient).filter(
            Patient.user_id == user.id,
            Patient.tenant_id == tenant.id,
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "EMAIL_ALREADY_REGISTERED",
                    "message": "Email already registered in this tenant",
                },
            )
        raise

    return ClientRegistrationResponse(
        user_id=user.id,
        patient_id=user.id,
        tenant_id=tenant.id,
    )
# Add an endpoint that gets plans. (IGNORE because it is a scrapped for now)
