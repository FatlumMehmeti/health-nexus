from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from app.auth.auth_utils import hash_password
from app.db import SessionLocal
from app.models import (
    SubscriptionPlan,
    Role,
    Tenant,
    TenantStatus,
    User,
    Department,
    TenantDepartment,
    Doctor,
    Service,
)


ROLE_NAMES = [
    "SUPER_ADMIN",
    "TENANT_MANAGER",
    "DOCTOR",
    "SALES",
    "CLIENT",
]


@dataclass(frozen=True)
class SeedUser:
    first_name: str
    last_name: str
    email: str
    password: str
    role_name: str


SEED_USERS = [
    SeedUser("Super", "Admin", "super.admin@seed.com", "Team2026@", "SUPER_ADMIN"),
    SeedUser("Tenant", "Manager", "tenant.manager@seed.com", "Team2026@", "TENANT_MANAGER"),
    SeedUser("Doctor", "One", "doctor.one@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Two", "doctor.two@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Three", "doctor.three@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Four", "doctor.four@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Sales", "Agent", "sales.agent@seed.com", "Team2026@", "SALES"),
    SeedUser("Client", "User", "client.user@seed.com", "Team2026@", "CLIENT"),
]


SEED_TENANTS = [
    # Approved
    {"name": "Bluestone Clinic", "slug": "bluestone-clinic", "email": "contact@bluestone.com", "licence_number": "BLU-001", "status": TenantStatus.approved},
    {"name": "Riverside Health Partners", "slug": "riverside-health-partners", "email": "contact@riverside.com", "licence_number": "RIV-002", "status": TenantStatus.approved},
    {"name": "Apex Medical Group", "slug": "apex-medical-group", "email": "contact@apex.com", "licence_number": "APX-003", "status": TenantStatus.approved},
    {"name": "Northgate Wellness", "slug": "northgate-wellness", "email": "contact@northgate.com", "licence_number": "NGT-004", "status": TenantStatus.approved},
    {"name": "Sunrise Family Practice", "slug": "sunrise-family-practice", "email": "contact@sunrisefp.com", "licence_number": "SRF-005", "status": TenantStatus.approved},
    {"name": "MetroCare Associates", "slug": "metrocare-associates", "email": "contact@metrocare.com", "licence_number": "MCA-006", "status": TenantStatus.approved},
    # Pending
    {"name": "Valley View Medical", "slug": "valley-view-medical", "email": "contact@valleyview.com", "licence_number": "VVM-007", "status": TenantStatus.pending},
    {"name": "Greenfield Clinic", "slug": "greenfield-clinic", "email": "contact@greenfield.com", "licence_number": "GFC-008", "status": TenantStatus.pending},
    {"name": "Coastal Health Group", "slug": "coastal-health-group", "email": "contact@coastalhealth.com", "licence_number": "CHG-009", "status": TenantStatus.pending},
    # Rejected
    {"name": "Downtown Wellness Hub", "slug": "downtown-wellness-hub", "email": "contact@downtownwellness.com", "licence_number": "DWH-010", "status": TenantStatus.rejected},
    {"name": "Peak Performance Health", "slug": "peak-performance-health", "email": "contact@peakperformance.com", "licence_number": "PPH-011", "status": TenantStatus.rejected},
    {"name": "Urban Care Clinic", "slug": "urban-care-clinic", "email": "contact@urbancare.com", "licence_number": "UCC-012", "status": TenantStatus.rejected},
    # Suspended
    {"name": "Harbor Medical Center", "slug": "harbor-medical-center", "email": "contact@harbormed.com", "licence_number": "HMC-013", "status": TenantStatus.suspended},
    {"name": "Summit Health Partners", "slug": "summit-health-partners", "email": "contact@summithealth.com", "licence_number": "SHP-014", "status": TenantStatus.suspended},
    # Archived
    {"name": "Legacy Care Network", "slug": "legacy-care-network", "email": "contact@legacycare.com", "licence_number": "LCN-015", "status": TenantStatus.archived},
    {"name": "Pioneer Medical Group", "slug": "pioneer-medical-group", "email": "contact@pioneermed.com", "licence_number": "PMG-016", "status": TenantStatus.archived},
]

# tenant_name used to resolve tenant_id at seed time
SEED_TENANT_DETAILS = [
    {"tenant_name": "Bluestone Clinic", "logo": "sunrise.webp", "image": "clinic-bluestone.webp", "moto": "Your health, our priority", "title": "Bluestone Clinic",
     "slogan": "Quality care, every visit", "about_text": "Bluestone Clinic has served the community for over 20 years.",
     "brand_color_primary": "#2563eb", "brand_color_secondary": "#0ea5e9", "font_key": "f1"},
    {"tenant_name": "Riverside Health Partners", "logo": "valley.webp", "image": "clinic-riverside.webp", "moto": "Care close to home", "title": "Riverside Health Partners",
     "slogan": "Partner in your wellness", "about_text": "Riverside Health Partners offers comprehensive care.",
     "brand_color_primary": "#059669", "brand_color_secondary": "#10b981", "font_key": "f2"},
    {"tenant_name": "Apex Medical Group", "logo": "metro.webp", "image": "clinic-apex.webp", "moto": "Excellence in urban healthcare", "title": "Apex Medical Group",
     "slogan": "Urban healthcare at its best", "about_text": "Apex Medical Group serves downtown with modern facilities.",
     "brand_color_primary": "#7c3aed", "brand_color_secondary": "#a78bfa", "font_key": "f3"},
    {"tenant_name": "Northgate Wellness", "logo": "pacific.webp", "image": "clinic-northgate.webp", "moto": "Holistic care for better living", "title": "Northgate Wellness",
     "slogan": "Mind, body, spirit", "about_text": "Northgate Wellness focuses on holistic approaches.",
     "brand_color_primary": "#dc2626", "brand_color_secondary": "#f87171", "font_key": "f4"},
    {"tenant_name": "Sunrise Family Practice", "logo": "sunrise.webp", "image": "clinic-sunrise.webp", "moto": "Family care you can trust", "title": "Sunrise Family Practice",
     "slogan": "Your family's health partner", "about_text": "Sunrise Family Practice provides family-focused care.",
     "brand_color_primary": "#ea580c", "brand_color_secondary": "#fb923c", "font_key": "f5"},
    {"tenant_name": "MetroCare Associates", "logo": "metro.webp", "image": "clinic-metrocare.webp", "moto": "Urban healthcare excellence", "title": "MetroCare Associates",
     "slogan": "Care in the heart of the city", "about_text": "MetroCare Associates offers metro-area healthcare.",
     "brand_color_primary": "#0891b2", "brand_color_secondary": "#22d3ee", "font_key": "f1"},
    {"tenant_name": "Valley View Medical", "logo": "valley.webp", "image": "clinic-valley.webp", "moto": "Your valley healthcare partner", "title": "Valley View Medical"},
    {"tenant_name": "Greenfield Clinic", "logo": "sunrise.webp", "image": "clinic-greenfield.webp", "moto": "Growing with your community", "title": "Greenfield Clinic"},
    {"tenant_name": "Coastal Health Group", "logo": "pacific.webp", "image": "clinic-coastal.webp", "moto": "Coastal care at its best", "title": "Coastal Health Group"},
    {"tenant_name": "Downtown Wellness Hub", "logo": "metro.webp", "image": "clinic-downtown.webp", "moto": "Downtown wellness solutions", "title": "Downtown Wellness Hub"},
    {"tenant_name": "Peak Performance Health", "logo": "valley.webp", "image": "clinic-peak.webp", "moto": "Reach your health peak", "title": "Peak Performance Health"},
    {"tenant_name": "Urban Care Clinic", "logo": "metro.webp", "image": "clinic-urban.webp", "moto": "Urban healthcare access", "title": "Urban Care Clinic"},
    {"tenant_name": "Harbor Medical Center", "logo": "pacific.webp", "image": "clinic-harbor.webp", "moto": "Your harbor for health", "title": "Harbor Medical Center"},
    {"tenant_name": "Summit Health Partners", "logo": "valley.webp", "image": "clinic-summit.webp", "moto": "Partners in summit health", "title": "Summit Health Partners"},
    {"tenant_name": "Legacy Care Network", "logo": "sunrise.webp", "image": "clinic-legacy.webp", "moto": "Legacy of care", "title": "Legacy Care Network"},
    {"tenant_name": "Pioneer Medical Group", "logo": "pacific.webp", "image": "clinic-pioneer.webp", "moto": "Pioneering better health", "title": "Pioneer Medical Group"},
]

SEED_SUBSCRIPTION_PLANS = [
    {"name": "FREE", "price": 0.00, "duration": 30},  # default starter plan
    {"name": "Small Clinic", "price": 1500.00, "duration": 30},
    {"name": "Medium Clinic", "price": 5000.00, "duration": 30},
    {"name": "Hospital", "price": 10000.00, "duration": 30},
]

SEED_DEPARTMENTS = [
    "General Practice",
    "Cardiology",
    "Pediatrics",
    "Dermatology",
    "Orthopedics",
    "Neurology",
]

# tenant_name, department_name, contact info
SEED_TENANT_DEPARTMENTS = [
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "phone_number": "+1-555-1001", "email": "gp@bluestone.com", "location": "Building A, Floor 1"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "phone_number": "+1-555-1002", "email": "cardio@bluestone.com", "location": "Building A, Floor 2"},
    {"tenant_name": "Riverside Health Partners", "department_name": "General Practice", "phone_number": "+1-555-2001", "email": "info@riverside.com", "location": "Main Street 100"},
    {"tenant_name": "Riverside Health Partners", "department_name": "Pediatrics", "phone_number": "+1-555-2002", "email": "pediatrics@riverside.com", "location": "Main Street 100, Wing B"},
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "phone_number": "+1-555-3001", "email": "contact@apex.com", "location": "Downtown Plaza"},
    {"tenant_name": "Apex Medical Group", "department_name": "Dermatology", "phone_number": "+1-555-3002", "email": "derma@apex.com", "location": "Downtown Plaza, Suite 3"},
    {"tenant_name": "Northgate Wellness", "department_name": "General Practice", "phone_number": "+1-555-4001", "email": "wellness@northgate.com", "location": "Northgate Center"},
    {"tenant_name": "Sunrise Family Practice", "department_name": "General Practice", "phone_number": "+1-555-5001", "email": "family@sunrisefp.com", "location": "Sunrise Mall"},
    {"tenant_name": "MetroCare Associates", "department_name": "General Practice", "phone_number": "+1-555-6001", "email": "metro@metrocare.com", "location": "Metro Tower"},
    {"tenant_name": "MetroCare Associates", "department_name": "Orthopedics", "phone_number": "+1-555-6002", "email": "ortho@metrocare.com", "location": "Metro Tower, Level 2"},
]

# user_email, tenant_name, specialization, licence_number
SEED_DOCTORS = [
    {"user_email": "doctor.one@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "General Practice", "licence_number": "MD-BLU-001"},
    {"user_email": "doctor.two@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "Cardiology", "licence_number": "MD-BLU-002"},
    {"user_email": "doctor.three@seed.com", "tenant_name": "Riverside Health Partners", "specialization": "General Practice", "licence_number": "MD-RIV-001"},
    {"user_email": "doctor.four@seed.com", "tenant_name": "Riverside Health Partners", "specialization": "Pediatrics", "licence_number": "MD-RIV-002"},
]

# tenant_name, department_name, name, price, description
SEED_SERVICES = [
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "name": "Initial Consultation", "price": 120.00, "description": "First visit assessment"},
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "name": "Follow-up Visit", "price": 80.00, "description": "Routine follow-up"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "name": "ECG", "price": 150.00, "description": "Electrocardiogram"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "name": "Stress Test", "price": 250.00, "description": "Cardiac stress test"},
    {"tenant_name": "Riverside Health Partners", "department_name": "General Practice", "name": "General Check-up", "price": 100.00, "description": "Annual health check"},
    {"tenant_name": "Riverside Health Partners", "department_name": "Pediatrics", "name": "Child Wellness Visit", "price": 90.00, "description": "Pediatric wellness exam"},
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "name": "Consultation", "price": 110.00, "description": "General consultation"},
    {"tenant_name": "Apex Medical Group", "department_name": "Dermatology", "name": "Skin Screening", "price": 130.00, "description": "Full body skin screening"},
    {"tenant_name": "Northgate Wellness", "department_name": "General Practice", "name": "Wellness Visit", "price": 95.00, "description": "Holistic wellness assessment"},
    {"tenant_name": "Sunrise Family Practice", "department_name": "General Practice", "name": "Family Consultation", "price": 105.00, "description": "Family medicine consult"},
    {"tenant_name": "MetroCare Associates", "department_name": "General Practice", "name": "Office Visit", "price": 115.00, "description": "Standard office visit"},
    {"tenant_name": "MetroCare Associates", "department_name": "Orthopedics", "name": "Joint Assessment", "price": 180.00, "description": "Orthopedic joint evaluation"},
]


def seed_roles(session):
    roles_by_name = {role.name: role for role in session.query(Role).all()}

    for name in ROLE_NAMES:
        if name not in roles_by_name:
            role = Role(name=name)
            session.add(role)
            roles_by_name[name] = role

    session.flush()
    return roles_by_name


def seed_tenants(session):
    existing = {tenant.name: tenant for tenant in session.query(Tenant).all()}

    for payload in SEED_TENANTS:
        tenant = existing.get(payload["name"])
        if tenant is None:
            session.add(Tenant(**payload))
        elif not tenant.slug and payload.get("slug"):
            tenant.slug = payload["slug"]

def seed_tenant_details(session, tenants_by_name):
    from app.models import TenantDetails
    from app.models.tenant_details import FontKey
    existing = {detail.tenant_id: detail for detail in session.query(TenantDetails).all()}

    for payload in SEED_TENANT_DETAILS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        if not tenant:
            continue
        detail = existing.get(tenant.id)
        if detail is None:
            p = {k: v for k, v in payload.items() if k != "tenant_name"}
            p["tenant_id"] = tenant.id
            if p.get("font_key") and isinstance(p["font_key"], str):
                p["font_key"] = FontKey(p["font_key"])
            session.add(TenantDetails(**p))
        elif "image" in payload and payload["image"] and not detail.image:
            detail.image = payload["image"]

def seed_subscription_plans(session):
    existing = {subscription_plan.name: subscription_plan for subscription_plan in session.query(SubscriptionPlan).all()}

    for payload in SEED_SUBSCRIPTION_PLANS:
        plan = existing.get(payload["name"])
        if plan is None:
            session.add(SubscriptionPlan(**payload))


def seed_users(session, roles_by_name):
    existing = {user.email: user for user in session.query(User).all()}

    for user in SEED_USERS:
        if user.email in existing:
            continue

        session.add(
            User(
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                password=hash_password(user.password),
                role_id=roles_by_name[user.role_name].id,
            )
        )
    session.flush()
    return {u.email: u for u in session.query(User).all()}


def seed_departments(session):
    existing = {d.name: d for d in session.query(Department).all()}
    for name in SEED_DEPARTMENTS:
        if name not in existing:
            session.add(Department(name=name))
            existing[name] = None
    session.flush()
    return {d.name: d for d in session.query(Department).all()}


def seed_tenant_departments(session, tenants_by_name, departments_by_name):
    existing_keys = set()
    for td in session.query(TenantDepartment).join(Tenant).join(Department).all():
        # build key from the objects we'd get - we need tenant and dept from the query
        pass
    # Simpler: check existing by querying
    for payload in SEED_TENANT_DEPARTMENTS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        dept = departments_by_name.get(payload["department_name"])
        if not tenant or not dept:
            continue
        exists = session.query(TenantDepartment).filter(
            TenantDepartment.tenant_id == tenant.id,
            TenantDepartment.department_id == dept.id,
        ).first()
        if exists:
            continue
        session.add(
            TenantDepartment(
                tenant_id=tenant.id,
                department_id=dept.id,
                phone_number=payload.get("phone_number"),
                email=payload.get("email"),
                location=payload.get("location"),
            )
        )
    session.flush()


def _get_tenant_department(session, tenant_name, department_name, tenants_by_name, departments_by_name):
    tenant = tenants_by_name.get(tenant_name)
    dept = departments_by_name.get(department_name)
    if not tenant or not dept:
        return None
    return session.query(TenantDepartment).filter(
        TenantDepartment.tenant_id == tenant.id,
        TenantDepartment.department_id == dept.id,
    ).first()


def seed_doctors(session, users_by_email, tenants_by_name):
    existing_doctor_user_ids = {d.user_id for d in session.query(Doctor).all()}
    for payload in SEED_DOCTORS:
        user = users_by_email.get(payload["user_email"])
        tenant = tenants_by_name.get(payload["tenant_name"])
        if not user or not tenant:
            continue
        if user.id in existing_doctor_user_ids:
            continue
        session.add(
            Doctor(
                user_id=user.id,
                tenant_id=tenant.id,
                specialization=payload.get("specialization"),
                licence_number=payload.get("licence_number"),
                is_active=True,
            )
        )
        existing_doctor_user_ids.add(user.id)
    session.flush()


def seed_services(session, tenants_by_name, departments_by_name):
    existing = set()
    for s in session.query(Service).all():
        existing.add((s.tenant_departments_id, s.name))
    for payload in SEED_SERVICES:
        td = _get_tenant_department(
            session, payload["tenant_name"], payload["department_name"],
            tenants_by_name, departments_by_name
        )
        if not td or (td.id, payload["name"]) in existing:
            continue
        tenant = tenants_by_name.get(payload["tenant_name"])
        session.add(
            Service(
                name=payload["name"],
                price=Decimal(str(payload["price"])),
                description=payload.get("description"),
                tenant_departments_id=td.id,
                tenant_id=tenant.id,
                is_active=True,
            )
        )
        existing.add((td.id, payload["name"]))


def run_seed() -> None:
    session = SessionLocal()
    try:
        roles_by_name = seed_roles(session)
        seed_tenants(session)
        session.commit()  # Ensure tenants are saved and IDs exist
        tenants_by_name = {t.name: t for t in session.query(Tenant).all()}
        seed_tenant_details(session, tenants_by_name)
        seed_subscription_plans(session)
        users_by_email = seed_users(session, roles_by_name)
        session.commit()
        departments_by_name = seed_departments(session)
        seed_tenant_departments(session, tenants_by_name, departments_by_name)
        seed_doctors(session, users_by_email, tenants_by_name)
        seed_services(session, tenants_by_name, departments_by_name)
        session.commit()
        print("Seed completed.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()
