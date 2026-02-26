# Tenant entity routes. Public + management (details, doctors, departments) under /api/tenants.

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth_utils import require_role
from app.db import get_db
from app.models.tenant import Tenant, TenantStatus
from app.models.tenant_details import TenantDetails
from app.models.department import Department
from app.models.tenant_department import TenantDepartment
from app.models.service import Service
from app.models.product import Product
from app.models.font import Font
from app.models.doctor import Doctor
from app.models.user import User
from app.models.lead import Lead, LeadStatus

from app.schemas.tenant import TenantCreate, TenantRead
from app.schemas.tenant_details import TenantDetailsRead, TenantDetailsUpdate
from app.schemas.doctor import DoctorRead
from app.schemas.tenant_department import (
    TenantDepartmentRead,
    TenantDepartmentWithServicesRead,
    BulkDepartmentsRequest,
)
from app.schemas.lead import PublicLeadCreate
from app.schemas.product import ProductRead, ProductCreateForTenant
from app.schemas.landing import (
    TenantLandingPageResponse,
    TenantLandingRead,
    TenantDetailsLandingRead,
    DepartmentLandingItem,
    ServiceLandingItem,
    DoctorLandingItem,
    ProductLandingItem,
    TenantPublicCard,
)

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("", response_model=list[TenantPublicCard])
def list_active_tenants(db: Session = Depends(get_db)):
    """Returns approved tenants only for public display: id, slug, name, moto, logo, image."""
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


# Endpoint for potential tenants to apply for a tenant account (Tenant Application).
@router.post("", response_model=TenantRead, status_code=201)
def create_tenant_application(payload: TenantCreate, db: Session = Depends(get_db)):
    """Apply for a tenant account."""
    # If the email/licence_number already exists in the database, tenant creation is not allowed.
    existing = db.query(Tenant).filter(
        (Tenant.email == payload.email) | (Tenant.licence_number == payload.licence_number)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Tenant with this email or licence number already exists")
    tenant = Tenant(
        name=payload.name,
        email=payload.email,
        licence_number=payload.licence_number,
        status=TenantStatus.pending,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


# Endpoint for potential tenants to submit a consultation request
# (e.g: to get more info about the product, ask for a demo etc) without applying for a tenant account.
@router.post("/consultation", status_code=201)
def create_consultation_lead(
    payload: PublicLeadCreate,  # you can rename schema later
    db: Session = Depends(get_db),
):
    """Submit a consultation / contact request."""
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
# Add an endpoint that gets plans. (IGNORE because it is a scrapped for now)


@router.get("/by-slug/{slug}/landing", response_model=TenantLandingPageResponse)
def get_tenant_landing_by_slug(slug: str, db: Session = Depends(get_db)):
    """Returns tenant, details, departments (with services), and doctors for landing page by slug."""
    tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.status != TenantStatus.approved:
        raise HTTPException(status_code=403, detail="Landing page is only available for approved tenants")

    tenant_id = tenant.id
    details = db.query(TenantDetails).filter(TenantDetails.tenant_id == tenant_id).first()
    details_read = None
    if details:
        font = db.query(Font).filter(Font.id == details.font_id).first() if details.font_id else None
        brand = details.brand if details.brand_id else None
        details_read = TenantDetailsLandingRead(
            tenant_id=details.tenant_id,
            logo=details.logo,
            image=details.image,
            moto=details.moto,
            brand_color_primary=brand.brand_color_primary if brand else None,
            brand_color_secondary=brand.brand_color_secondary if brand else None,
            brand_color_background=brand.brand_color_background if brand else None,
            brand_color_foreground=brand.brand_color_foreground if brand else None,
            brand_color_muted=brand.brand_color_muted if brand else None,
            title=details.title,
            about_text=details.about_text,
            font_id=details.font_id,
            font_name=font.name if font else None,
            font_header_family=font.header_font_family if font else None,
            font_body_family=font.body_font_family if font else None,
        )

    tenant_deps = db.query(TenantDepartment).filter(TenantDepartment.tenant_id == tenant_id).all()
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

    doctors_q = (
        db.query(Doctor, User)
        .join(User, Doctor.user_id == User.id)
        .filter(Doctor.tenant_id == tenant_id, Doctor.is_active == True)
        .all()
    )
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

    products = (
        db.query(Product)
        .filter(Product.tenant_id == tenant_id, Product.is_available == True)
        .order_by(Product.name)
        .all()
    )

    return TenantLandingPageResponse(
        tenant=TenantLandingRead.model_validate(tenant),
        details=details_read,
        departments=departments,
        doctors=doctors,
        products=[ProductLandingItem.model_validate(p) for p in products],
    )


def _assert_tenant_exists(db: Session, tenant_id: int) -> None:
    if not db.query(Tenant).filter(Tenant.id == tenant_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")


# ─── Details, doctors, departments (SUPER_ADMIN) ─────────────────────────────────────

@router.get("/{tenant_id}/details", response_model=TenantDetailsRead)
def get_tenant_details(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    _assert_tenant_exists(db, tenant_id)
    details = db.query(TenantDetails).filter(TenantDetails.tenant_id == tenant_id).first()
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant details not found")
    return details


@router.put("/{tenant_id}/details", response_model=TenantDetailsRead)
def upsert_tenant_details(
    tenant_id: int,
    payload: TenantDetailsUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    _assert_tenant_exists(db, tenant_id)
    details = db.query(TenantDetails).filter(TenantDetails.tenant_id == tenant_id).first()
    data = payload.model_dump(exclude_unset=True)
    if details is None:
        details = TenantDetails(tenant_id=tenant_id, **data)
        db.add(details)
    else:
        for k, v in data.items():
            setattr(details, k, v)
    db.commit()
    db.refresh(details)
    return details


@router.get("/{tenant_id}/doctors", response_model=list[DoctorRead])
def list_tenant_doctors(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    _assert_tenant_exists(db, tenant_id)
    return db.query(Doctor).filter(Doctor.tenant_id == tenant_id).all()


@router.post("/{tenant_id}/departments", response_model=list[TenantDepartmentWithServicesRead])
def bulk_set_tenant_departments(
    tenant_id: int,
    payload: BulkDepartmentsRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    """Bulk set departments for a tenant. Replaces existing with the provided list. Services are managed separately via /api/services."""
    _assert_tenant_exists(db, tenant_id)
    seen_dept_ids = set()
    for item in payload.items:
        if item.department_id in seen_dept_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate department_id {item.department_id} in payload",
            )
        seen_dept_ids.add(item.department_id)
        dept = db.query(Department).filter(Department.id == item.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department {item.department_id} not found",
            )

    # Existing tenant departments
    existing_tds = {
        td.department_id: td
        for td in db.query(TenantDepartment).filter(TenantDepartment.tenant_id == tenant_id).all()
    }
    target_dept_ids = {item.department_id for item in payload.items}

    # Remove departments not in payload
    for dept_id, td in list(existing_tds.items()):
        if dept_id not in target_dept_ids:
            db.delete(td)
    db.flush()

    result = []
    for item in payload.items:
        td = existing_tds.get(item.department_id)
        if td:
            td.phone_number = item.phone_number
            td.email = item.email
            td.location = item.location
        else:
            td = TenantDepartment(
                tenant_id=tenant_id,
                department_id=item.department_id,
                phone_number=item.phone_number,
                email=item.email,
                location=item.location,
            )
            db.add(td)
            db.flush()

        dept = db.query(Department).filter(Department.id == td.department_id).first()
        services = db.query(Service).filter(Service.tenant_departments_id == td.id, Service.is_active == True).all()
        result.append(
            TenantDepartmentWithServicesRead(
                **TenantDepartmentRead.model_validate(td).model_dump(),
                department_name=dept.name if dept else "",
                services=[ServiceLandingItem.model_validate(s) for s in services],
            )
        )

    db.commit()
    return result


@router.get("/{tenant_id}/products", response_model=list[ProductRead])
def list_tenant_products(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    """List products available for this tenant."""
    _assert_tenant_exists(db, tenant_id)
    return db.query(Product).filter(
        Product.tenant_id == tenant_id,
        Product.is_available == True,
    ).all()


@router.post("/{tenant_id}/products", response_model=ProductRead)
def create_tenant_product(
    tenant_id: int,
    payload: ProductCreateForTenant,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    """Create a product for a tenant."""
    _assert_tenant_exists(db, tenant_id)
    product = Product(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        stock_quantity=payload.stock_quantity,
        is_available=payload.is_available,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.get("/{tenant_id}/departments", response_model=list[TenantDepartmentWithServicesRead])
def list_tenant_departments(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("SUPER_ADMIN")),
):
    """List tenant departments with department name and services."""
    _assert_tenant_exists(db, tenant_id)
    tenant_deps = db.query(TenantDepartment).filter(TenantDepartment.tenant_id == tenant_id).all()
    result = []
    for td in tenant_deps:
        dept = db.query(Department).filter(Department.id == td.department_id).first()
        services = (
            db.query(Service)
            .filter(Service.tenant_departments_id == td.id, Service.is_active == True)
            .all()
        )
        result.append(
            TenantDepartmentWithServicesRead(
                **TenantDepartmentRead.model_validate(td).model_dump(),
                department_name=dept.name if dept else "",
                services=[ServiceLandingItem.model_validate(s) for s in services],
            )
        )
    return result


