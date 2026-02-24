from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tenant import Tenant, TenantStatus
from app.models.tenant_details import TenantDetails
from app.models.department import Department
from app.models.tenant_department import TenantDepartment
from app.models.service import Service
from app.models.doctor import Doctor
from app.models.user import User
from app.models.lead import Lead, LeadStatus
from app.schemas.tenant import TenantCreate, TenantRead
from app.schemas.lead import PublicLeadCreate
from app.schemas.landing import (
    TenantLandingPageResponse,
    TenantLandingRead,
    TenantDetailsLandingRead,
    DepartmentLandingItem,
    ServiceLandingItem,
    DoctorLandingItem,
    TenantPublicCard,
)


router = APIRouter(prefix="/tenants", tags=["Public Tenant Requests"])


@router.get("", response_model=list[TenantPublicCard])
def list_active_tenants(db: Session = Depends(get_db)):
    """Returns only approved (active) tenants for public display: id, slug, name, moto, logo, image."""
    tenants = (
        db.query(Tenant)
        .filter(Tenant.status == TenantStatus.approved)
        .order_by(Tenant.name)
        .all()
    )
    result = []
    for t in tenants:
        details = db.query(TenantDetails).filter(TenantDetails.tenant_id == t.id).first()
        result.append(
            TenantPublicCard(
                id=t.id,
                slug=t.slug,
                name=t.name,
                moto=details.moto if details else None,
                logo=details.logo if details else None,
                image=details.image if details else None,
            )
        )
    return result


@router.post("", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant_application(payload: TenantCreate, db: Session = Depends(get_db)):
    """Apply for a tenant account."""
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


@router.post(
    "/consultation",
    status_code=status.HTTP_201_CREATED,
)
def create_public_lead(
    payload: PublicLeadCreate,
    db: Session = Depends(get_db),
):
    """Submit a consultation / contact request from the public site."""
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



@router.get("/{slug}/landing", response_model=TenantLandingPageResponse)
def get_tenant_landing_page(slug: str, db: Session = Depends(get_db)):
    """Returns tenant, details, departments (with services), and doctors for landing page rendering by slug."""
    tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.status != TenantStatus.approved:
        raise HTTPException(
            status_code=403,
            detail="Landing page is only available for approved tenants",
        )

    tenant_id = tenant.id
    details = db.query(TenantDetails).filter(TenantDetails.tenant_id == tenant_id).first()
    details_read = None
    if details:
        details_read = TenantDetailsLandingRead(
            tenant_id=details.tenant_id,
            logo=details.logo,
            moto=details.moto,
            brand_color_primary=details.brand_color_primary,
            brand_color_secondary=details.brand_color_secondary,
            title=details.title,
            slogan=details.slogan,
            about_text=details.about_text,
            font_key=details.font_key.value if details.font_key else None,
        )

    tenant_deps = (
        db.query(TenantDepartment)
        .filter(TenantDepartment.tenant_id == tenant_id)
        .all()
    )
    departments: list[DepartmentLandingItem] = []
    for td in tenant_deps:
        dept = db.query(Department).filter(Department.id == td.department_id).first()
        services = (
            db.query(Service)
            .filter(
                Service.tenant_departments_id == td.id,
                Service.is_active == True,
            )
            .all()
        )
        departments.append(
            DepartmentLandingItem(
                id=td.id,
                name=dept.name if dept else "",
                phone_number=td.phone_number,
                email=td.email,
                location=td.location,
                services=[ServiceLandingItem.model_validate(s) for s in services],
            )
        )

    doctors_q = db.query(Doctor, User).join(User, Doctor.user_id == User.id).filter(
        Doctor.tenant_id == tenant_id,
        Doctor.is_active == True,
    ).all()
    doctors = [
        DoctorLandingItem(
            user_id=d.user_id,
            first_name=u.first_name or "",
            last_name=u.last_name or "",
            specialization=d.specialization,
            education=d.education,
            licence_number=d.licence_number,
            is_active=d.is_active,
            working_hours=d.working_hours,
        )
        for d, u in doctors_q
    ]

    return TenantLandingPageResponse(
        tenant=TenantLandingRead.model_validate(tenant),
        details=details_read,
        departments=departments,
        doctors=doctors,
    )
