from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from app.auth.auth_utils import hash_password
from app.db import SessionLocal
from app.models import (
    Enrollment,
    EnrollmentStatusHistory,
    Patient,
    Role,
    SubscriptionPlan,
    Tenant,
    TenantManager,
    TenantStatus,
    User,
    UserTenantPlan,
)
from app.models.enrollment import EnrollmentStatus


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
    # For enrollment API testing: EXPIRED enrollment in Northgate
    {
        "user_email": "client.user@seed.com",
        "tenant_name": "Northgate Wellness",
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

# tenant_managers model payloads
SEED_TENANT_MANAGERS = [
    {
        "user_email": "tenant.manager@seed.com",
        "tenant_name": "Bluestone Clinic",
    },
    {
        "user_email": "tenant.manager@seed.com",
        "tenant_name": "Riverside Health Partners",
    },
]

# user_tenant_plans model payloads
SEED_USER_TENANT_PLANS = [
    {
        "tenant_name": "Bluestone Clinic",
        "name": "FREE",
        "description": "Starter plan",
        "price": 0,
        "duration": 30,
        "max_appointments": 2,
        "max_consultations": 2,
        "is_active": True,
    },
    {
        "tenant_name": "Bluestone Clinic",
        "name": "PREMIUM",
        "description": "Premium monthly plan",
        "price": 99,
        "duration": 30,
        "max_appointments": 20,
        "max_consultations": 20,
        "is_active": True,
    },
    {
        "tenant_name": "Riverside Health Partners",
        "name": "FREE",
        "description": "Starter plan",
        "price": 0,
        "duration": 30,
        "max_appointments": 2,
        "max_consultations": 2,
        "is_active": True,
    },
    {
        "tenant_name": "Northgate Wellness",
        "name": "FREE",
        "description": "Starter plan",
        "price": 0,
        "duration": 30,
        "max_appointments": 2,
        "max_consultations": 2,
        "is_active": True,
    },
]

# enrollments model payloads
# Used for enrollment API testing: PENDING, ACTIVE, CANCELLED, EXPIRED
SEED_ENROLLMENTS = [
    # PENDING - can transition to ACTIVE or CANCELLED
    {
        "tenant_name": "Bluestone Clinic",
        "patient_user_email": "client.user@seed.com",
        "plan_name": "FREE",
        "created_by_email": "tenant.manager@seed.com",
        "status": EnrollmentStatus.PENDING,
        "activated_at": None,
        "cancelled_at": None,
        "expires_at": None,
    },
    # ACTIVE - can transition to CANCELLED or EXPIRED (when past expires_at)
    {
        "tenant_name": "Riverside Health Partners",
        "patient_user_email": "client.user@seed.com",
        "plan_name": "FREE",
        "created_by_email": "tenant.manager@seed.com",
        "status": EnrollmentStatus.ACTIVE,
        "activated_at": datetime.now(timezone.utc) - timedelta(days=5),
        "cancelled_at": None,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=25),
    },
    # CANCELLED - no further transitions
    {
        "tenant_name": "Bluestone Clinic",
        "patient_user_email": "registered.client@seed.com",
        "plan_name": "PREMIUM",
        "created_by_email": "tenant.manager@seed.com",
        "status": EnrollmentStatus.CANCELLED,
        "activated_at": datetime.now(timezone.utc) - timedelta(days=10),
        "cancelled_at": datetime.now(timezone.utc) - timedelta(days=2),
        "expires_at": None,
    },
    # EXPIRED - no further transitions (was ACTIVE, past expires_at)
    {
        "tenant_name": "Northgate Wellness",
        "patient_user_email": "client.user@seed.com",
        "plan_name": "FREE",
        "created_by_email": "super.admin@seed.com",
        "status": EnrollmentStatus.EXPIRED,
        "activated_at": datetime.now(timezone.utc) - timedelta(days=35),
        "cancelled_at": None,
        "expires_at": datetime.now(timezone.utc) - timedelta(days=5),
    },
]

# enrollment_status_history model payloads
# Schema requires old_status NOT NULL; use PENDING for "creation" records
SEED_ENROLLMENT_STATUS_HISTORY = [
    # Bluestone client.user FREE - creation
    {
        "tenant_name": "Bluestone Clinic",
        "patient_user_email": "client.user@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.PENDING,
        "changed_by_email": "tenant.manager@seed.com",
        "changed_by_role": "TENANT_MANAGER",
        "reason": "Initial enrollment created",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=1),
    },
    # Riverside client.user FREE - creation then activation
    {
        "tenant_name": "Riverside Health Partners",
        "patient_user_email": "client.user@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.PENDING,
        "changed_by_email": "tenant.manager@seed.com",
        "changed_by_role": "TENANT_MANAGER",
        "reason": "Initial enrollment created",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=6),
    },
    {
        "tenant_name": "Riverside Health Partners",
        "patient_user_email": "client.user@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.ACTIVE,
        "changed_by_email": "tenant.manager@seed.com",
        "changed_by_role": "TENANT_MANAGER",
        "reason": "Enrollment activated",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=5),
    },
    # Bluestone registered.client PREMIUM - creation, activation, cancellation
    {
        "tenant_name": "Bluestone Clinic",
        "patient_user_email": "registered.client@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.PENDING,
        "changed_by_email": "tenant.manager@seed.com",
        "changed_by_role": "TENANT_MANAGER",
        "reason": "Initial enrollment created",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=12),
    },
    {
        "tenant_name": "Bluestone Clinic",
        "patient_user_email": "registered.client@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.ACTIVE,
        "changed_by_email": "tenant.manager@seed.com",
        "changed_by_role": "TENANT_MANAGER",
        "reason": "Enrollment activated",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=10),
    },
    {
        "tenant_name": "Bluestone Clinic",
        "patient_user_email": "registered.client@seed.com",
        "old_status": EnrollmentStatus.ACTIVE,
        "new_status": EnrollmentStatus.CANCELLED,
        "changed_by_email": "tenant.manager@seed.com",
        "changed_by_role": "TENANT_MANAGER",
        "reason": "Patient requested cancellation",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=2),
    },
    # Northgate client.user FREE - creation, activation, expiration
    {
        "tenant_name": "Northgate Wellness",
        "patient_user_email": "client.user@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.PENDING,
        "changed_by_email": "super.admin@seed.com",
        "changed_by_role": "SUPER_ADMIN",
        "reason": "Initial enrollment created",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=36),
    },
    {
        "tenant_name": "Northgate Wellness",
        "patient_user_email": "client.user@seed.com",
        "old_status": EnrollmentStatus.PENDING,
        "new_status": EnrollmentStatus.ACTIVE,
        "changed_by_email": "super.admin@seed.com",
        "changed_by_role": "SUPER_ADMIN",
        "reason": "Enrollment activated",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=35),
    },
    {
        "tenant_name": "Northgate Wellness",
        "patient_user_email": "client.user@seed.com",
        "old_status": EnrollmentStatus.ACTIVE,
        "new_status": EnrollmentStatus.EXPIRED,
        "changed_by_email": "super.admin@seed.com",
        "changed_by_role": "SUPER_ADMIN",
        "reason": "Plan expired",
        "changed_at": datetime.now(timezone.utc) - timedelta(days=5),
    },
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
    session.flush()
    return {user.email: user for user in session.query(User).all()}


def seed_patients(session, users_by_email):
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


def seed_user_tenant_plans(session):
    tenants_by_name = {tenant.name: tenant for tenant in session.query(Tenant).all()}
    existing = {
        (plan.tenant_id, plan.name): plan
        for plan in session.query(UserTenantPlan).all()
    }

    for payload in SEED_USER_TENANT_PLANS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        if tenant is None:
            continue

        key = (tenant.id, payload["name"])
        plan = existing.get(key)
        if plan is None:
            session.add(
                UserTenantPlan(
                    tenant_id=tenant.id,
                    name=payload["name"],
                    description=payload["description"],
                    price=payload["price"],
                    duration=payload["duration"],
                    max_appointments=payload["max_appointments"],
                    max_consultations=payload["max_consultations"],
                    is_active=payload["is_active"],
                )
            )
            continue

        plan.description = payload["description"]
        plan.price = payload["price"]
        plan.duration = payload["duration"]
        plan.max_appointments = payload["max_appointments"]
        plan.max_consultations = payload["max_consultations"]
        plan.is_active = payload["is_active"]


def seed_enrollments(session, users_by_email):
    tenants_by_name = {tenant.name: tenant for tenant in session.query(Tenant).all()}
    plans_by_tenant_and_name = {
        (plan.tenant_id, plan.name): plan
        for plan in session.query(UserTenantPlan).all()
    }
    patients_by_tenant_user = {
        (p.tenant_id, p.user_id): p
        for p in session.query(Patient).all()
    }
    existing = {
        (enrollment.tenant_id, enrollment.patient_user_id): enrollment
        for enrollment in session.query(Enrollment).all()
    }
    created = 0

    for payload in SEED_ENROLLMENTS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        patient_user = users_by_email.get(payload["patient_user_email"])
        created_by = users_by_email.get(payload["created_by_email"])
        if tenant is None:
            print(f"  [seed_enrollments] Skip: tenant '{payload['tenant_name']}' not found")
            continue
        if patient_user is None:
            print(f"  [seed_enrollments] Skip: user '{payload['patient_user_email']}' not found")
            continue
        if created_by is None:
            print(f"  [seed_enrollments] Skip: created_by '{payload['created_by_email']}' not found")
            continue

        # Enrollment FK requires (tenant_id, patient_user_id) to exist in patients(tenant_id, user_id)
        patient = patients_by_tenant_user.get((tenant.id, patient_user.id))
        if patient is None:
            print(
                f"  [seed_enrollments] Skip: no Patient for tenant={tenant.name} user={payload['patient_user_email']} "
                "(run seed_patients first; add SEED_PATIENTS entry if needed)"
            )
            continue

        plan = plans_by_tenant_and_name.get((tenant.id, payload["plan_name"]))
        if plan is None:
            print(f"  [seed_enrollments] Skip: plan '{payload['plan_name']}' for tenant '{tenant.name}' not found")
            continue

        key = (tenant.id, patient_user.id)
        enrollment = existing.get(key)
        if enrollment is None:
            new_enrollment = Enrollment(
                tenant_id=tenant.id,
                patient_user_id=patient_user.id,
                user_tenant_plan_id=plan.id,
                created_by=created_by.id,
                status=payload["status"],
                activated_at=payload["activated_at"],
                cancelled_at=payload["cancelled_at"],
                expires_at=payload["expires_at"],
            )
            session.add(new_enrollment)
            session.flush()
            existing[key] = new_enrollment
            created += 1
            continue

        enrollment.user_tenant_plan_id = plan.id
        enrollment.created_by = created_by.id
        enrollment.status = payload["status"]
        enrollment.activated_at = payload["activated_at"]
        enrollment.cancelled_at = payload["cancelled_at"]
        enrollment.expires_at = payload["expires_at"]

    if created > 0:
        print(f"  [seed_enrollments] Created {created} enrollment(s)")


def seed_enrollment_status_history(session, users_by_email):
    tenants_by_name = {tenant.name: tenant for tenant in session.query(Tenant).all()}
    enrollments_by_tenant_and_patient = {
        (enrollment.tenant_id, enrollment.patient_user_id): enrollment
        for enrollment in session.query(Enrollment).all()
    }

    for payload in SEED_ENROLLMENT_STATUS_HISTORY:
        tenant = tenants_by_name.get(payload["tenant_name"])
        patient_user = users_by_email.get(payload["patient_user_email"])
        if tenant is None or patient_user is None:
            continue

        enrollment = enrollments_by_tenant_and_patient.get((tenant.id, patient_user.id))
        if enrollment is None:
            continue

        changed_by = users_by_email.get(payload["changed_by_email"])

        duplicate = (
            session.query(EnrollmentStatusHistory)
            .filter(
                EnrollmentStatusHistory.enrollment_id == enrollment.id,
                EnrollmentStatusHistory.old_status == payload["old_status"],
                EnrollmentStatusHistory.new_status == payload["new_status"],
                EnrollmentStatusHistory.changed_at == payload["changed_at"],
            )
            .first()
        )
        if duplicate is not None:
            continue

        session.add(
            EnrollmentStatusHistory(
                enrollment_id=enrollment.id,
                tenant_id=tenant.id,
                old_status=payload["old_status"],
                new_status=payload["new_status"],
                changed_by=changed_by.id if changed_by else None,
                changed_by_role=payload["changed_by_role"],
                reason=payload["reason"],
                changed_at=payload["changed_at"],
            )
        )


def seed_tenant_managers(session, users_by_email):
    tenants_by_name = {tenant.name: tenant for tenant in session.query(Tenant).all()}

    for payload in SEED_TENANT_MANAGERS:
        manager = users_by_email.get(payload["user_email"])
        tenant = tenants_by_name.get(payload["tenant_name"])
        if manager is None or tenant is None:
            continue

        existing = (
            session.query(TenantManager)
            .filter(
                TenantManager.user_id == manager.id,
                TenantManager.tenant_id == tenant.id,
            )
            .first()
        )
        if existing is not None:
            continue

        session.add(TenantManager(user_id=manager.id, tenant_id=tenant.id))


def run_seed() -> None:
    session = SessionLocal()
    try:
        roles_by_name = seed_roles(session)
        seed_tenants(session)
        session.commit()  # Ensure tenants are saved and IDs exist
        seed_tenant_details(session)
        seed_subscription_plans(session)
        users_by_email = seed_users(session, roles_by_name)
        seed_patients(session, users_by_email)
        seed_user_tenant_plans(session)
        seed_tenant_managers(session, users_by_email)
        seed_enrollments(session, users_by_email)
        seed_enrollment_status_history(session, users_by_email)
        session.commit()
        enrollment_count = session.query(Enrollment).count()
        history_count = session.query(EnrollmentStatusHistory).count()
        print("Seed completed.")
        print(f"  Enrollments: {enrollment_count} | Enrollment status history: {history_count}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()
