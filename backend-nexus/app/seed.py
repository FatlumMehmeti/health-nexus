from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.auth.auth_utils import hash_password
from app.db import SessionLocal
from app.models import Patient, SubscriptionPlan, Role, Tenant, TenantStatus, User


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
    SeedUser("Sales", "Agent", "sales.agent@seed.com", "Team2026@", "SALES"),
    SeedUser("Client", "User", "client.user@seed.com", "Team2026@", "CLIENT"),
    SeedUser("Registered", "Client", "registered.client@seed.com", "Team2026@", "CLIENT"),
    SeedUser("Global", "Only", "global.only@seed.com", "Team2026@", "CLIENT"),
]

SEED_PATIENTS = [
    # Existing registration in tenant 1 -> POST /tenants/1/clients/register with this email returns 409.
    {
        "user_email": "registered.client@seed.com",
        "tenant_name": "Bluestone Clinic",
        "birthdate": date(1992, 1, 10),
        "gender": "female",
        "blood_type": "O+",
    },
    # Same global user in two tenants -> proves cross-tenant presence is valid.
    {
        "user_email": "client.user@seed.com",
        "tenant_name": "Bluestone Clinic",
        "birthdate": date(1991, 6, 15),
        "gender": "male",
        "blood_type": "A+",
    },
    {
        "user_email": "client.user@seed.com",
        "tenant_name": "Riverside Health Partners",
        "birthdate": date(1991, 6, 15),
        "gender": "male",
        "blood_type": "A+",
    },
]


SEED_TENANTS = [
    # Approved
    {"name": "Bluestone Clinic", "email": "contact@bluestone.com", "licence_number": "BLU-001", "status": TenantStatus.approved},
    {"name": "Riverside Health Partners", "email": "contact@riverside.com", "licence_number": "RIV-002", "status": TenantStatus.approved},
    {"name": "Apex Medical Group", "email": "contact@apex.com", "licence_number": "APX-003", "status": TenantStatus.approved},
    {"name": "Northgate Wellness", "email": "contact@northgate.com", "licence_number": "NGT-004", "status": TenantStatus.approved},
    {"name": "Sunrise Family Practice", "email": "contact@sunrisefp.com", "licence_number": "SRF-005", "status": TenantStatus.approved},
    {"name": "MetroCare Associates", "email": "contact@metrocare.com", "licence_number": "MCA-006", "status": TenantStatus.approved},
    # Pending
    {"name": "Valley View Medical", "email": "contact@valleyview.com", "licence_number": "VVM-007", "status": TenantStatus.pending},
    {"name": "Greenfield Clinic", "email": "contact@greenfield.com", "licence_number": "GFC-008", "status": TenantStatus.pending},
    {"name": "Coastal Health Group", "email": "contact@coastalhealth.com", "licence_number": "CHG-009", "status": TenantStatus.pending},
    # Rejected
    {"name": "Downtown Wellness Hub", "email": "contact@downtownwellness.com", "licence_number": "DWH-010", "status": TenantStatus.rejected},
    {"name": "Peak Performance Health", "email": "contact@peakperformance.com", "licence_number": "PPH-011", "status": TenantStatus.rejected},
    {"name": "Urban Care Clinic", "email": "contact@urbancare.com", "licence_number": "UCC-012", "status": TenantStatus.rejected},
    # Suspended
    {"name": "Harbor Medical Center", "email": "contact@harbormed.com", "licence_number": "HMC-013", "status": TenantStatus.suspended},
    {"name": "Summit Health Partners", "email": "contact@summithealth.com", "licence_number": "SHP-014", "status": TenantStatus.suspended},
    # Archived
    {"name": "Legacy Care Network", "email": "contact@legacycare.com", "licence_number": "LCN-015", "status": TenantStatus.archived},
    {"name": "Pioneer Medical Group", "email": "contact@pioneermed.com", "licence_number": "PMG-016", "status": TenantStatus.archived},
]

SEED_TENANT_DETAILS = [
    {"tenant_id": 1, "logo": "sunrise.webp", "moto": "Your health, our priority", "title": "Bluestone Clinic"},
    {"tenant_id": 2, "logo": "valley.webp", "moto": "Care close to home", "title": "Riverside Health Partners"},
    {"tenant_id": 3, "logo": "metro.webp", "moto": "Excellence in urban healthcare", "title": "Apex Medical Group"},
    {"tenant_id": 4, "logo": "pacific.webp", "moto": "Holistic care for better living", "title": "Northgate Wellness"},
    {"tenant_id": 5, "logo": "sunrise.webp", "moto": "Family care you can trust", "title": "Sunrise Family Practice"},
    {"tenant_id": 6, "logo": "metro.webp", "moto": "Urban healthcare excellence", "title": "MetroCare Associates"},
    {"tenant_id": 7, "logo": "valley.webp", "moto": "Your valley healthcare partner", "title": "Valley View Medical"},
    {"tenant_id": 8, "logo": "sunrise.webp", "moto": "Growing with your community", "title": "Greenfield Clinic"},
    {"tenant_id": 9, "logo": "pacific.webp", "moto": "Coastal care at its best", "title": "Coastal Health Group"},
    {"tenant_id": 10, "logo": "metro.webp", "moto": "Downtown wellness solutions", "title": "Downtown Wellness Hub"},
    {"tenant_id": 11, "logo": "valley.webp", "moto": "Reach your health peak", "title": "Peak Performance Health"},
    {"tenant_id": 12, "logo": "metro.webp", "moto": "Urban healthcare access", "title": "Urban Care Clinic"},
    {"tenant_id": 13, "logo": "pacific.webp", "moto": "Your harbor for health", "title": "Harbor Medical Center"},
    {"tenant_id": 14, "logo": "valley.webp", "moto": "Partners in summit health", "title": "Summit Health Partners"},
    {"tenant_id": 15, "logo": "sunrise.webp", "moto": "Legacy of care", "title": "Legacy Care Network"},
    {"tenant_id": 16, "logo": "pacific.webp", "moto": "Pioneering better health", "title": "Pioneer Medical Group"},
]

SEED_SUBSCRIPTION_PLANS = [
    {"name": "FREE", "price": 0.00, "duration": 30},  # default starter plan
    {"name": "Small Clinic", "price": 1500.00, "duration": 30},
    {"name": "Medium Clinic", "price": 5000.00, "duration": 30},
    {"name": "Hospital", "price": 10000.00, "duration": 30},
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
            continue

        # Keep seeded tenants deterministic on reseed.
        tenant.email = payload["email"]
        tenant.licence_number = payload["licence_number"]
        tenant.status = payload["status"]

def seed_tenant_details(session):
    from app.models import TenantDetails
    existing = {detail.tenant_id: detail for detail in session.query(TenantDetails).all()}
    tenants_by_name = {tenant.name: tenant for tenant in session.query(Tenant).all()}

    for payload in SEED_TENANT_DETAILS:
        tenant = tenants_by_name.get(payload["title"])
        if tenant is None:
            continue

        detail = existing.get(tenant.id)
        if detail is None:
            session.add(
                TenantDetails(
                    tenant_id=tenant.id,
                    logo=payload["logo"],
                    moto=payload["moto"],
                    title=payload["title"],
                )
            )
            continue

        detail.logo = payload["logo"]
        detail.moto = payload["moto"]
        detail.title = payload["title"]

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


def seed_patients(session):
    users_by_email = {user.email: user for user in session.query(User).all()}
    tenants_by_name = {tenant.name: tenant for tenant in session.query(Tenant).all()}
    existing = {
        (patient.tenant_id, patient.user_id): patient
        for patient in session.query(Patient).all()
    }

    for payload in SEED_PATIENTS:
        user = users_by_email.get(payload["user_email"])
        tenant = tenants_by_name.get(payload["tenant_name"])
        if user is None or tenant is None:
            continue

        key = (tenant.id, user.id)
        patient = existing.get(key)
        if patient is None:
            session.add(
                Patient(
                    tenant_id=tenant.id,
                    user_id=user.id,
                    birthdate=payload["birthdate"],
                    gender=payload["gender"],
                    blood_type=payload["blood_type"],
                )
            )
            continue

        patient.birthdate = payload["birthdate"]
        patient.gender = payload["gender"]
        patient.blood_type = payload["blood_type"]


def run_seed() -> None:
    session = SessionLocal()
    try:
        roles_by_name = seed_roles(session)
        seed_tenants(session)
        session.commit()  # Ensure tenants are saved and IDs exist
        seed_tenant_details(session)
        seed_subscription_plans(session)
        seed_users(session, roles_by_name)
        seed_patients(session)
        session.commit()
        print("Seed completed.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()
