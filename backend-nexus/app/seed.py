from __future__ import annotations

from dataclasses import dataclass

from app.auth.auth_utils import hash_password
from app.db import SessionLocal
from app.models import SubscriptionPlan, Role, Tenant, TenantStatus, User, Department, TenantDepartment, Doctor, Patient, Enrollment, EnrollmentStatus, Appointment, AppointmentStatus, UserTenantPlan
from datetime import datetime, timezone


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
    SeedUser("Client", "NoEnroll", "client.noenroll@seed.com", "Team2026@", "CLIENT"),
    SeedUser("Client", "OtherTenant", "client.othertenant@seed.com", "Team2026@", "CLIENT"),
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

def seed_tenant_details(session):
    from app.models import TenantDetails
    existing = {detail.tenant_id: detail for detail in session.query(TenantDetails).all()}

    for payload in SEED_TENANT_DETAILS:
        if payload["tenant_id"] not in existing:
            session.add(TenantDetails(**payload))

def seed_subscription_plans(session):
    existing = {subscription_plan.name: subscription_plan for subscription_plan in session.query(SubscriptionPlan).all()}

    for payload in SEED_SUBSCRIPTION_PLANS:
        plan = existing.get(payload["name"])
        if plan is None:
            session.add(SubscriptionPlan(**payload))

def seed_user_tenant_plans(session):
    tenant_names = ["Bluestone Clinic", "Riverside Health Partners"]
    for tenant_name in tenant_names:
        tenant = session.query(Tenant).filter_by(name=tenant_name).first()
        if tenant is None:
            continue

        existing = session.query(UserTenantPlan).filter_by(
            tenant_id=tenant.id,
            name="Starter Plan"
        ).first()
        if existing:
            continue

        session.add(
            UserTenantPlan(
                tenant_id=tenant.id,
                name="Starter Plan",
                description="Baseline plan for seeded enrollment data",
                price=0,
                duration=30,
                max_appointments=10,
                max_consultations=5,
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )


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


def seed_departments(session):
    cardiology = session.query(Department).filter_by(name="Cardiology").first()
    if cardiology is None:
        cardiology = Department(name="Cardiology")
        session.add(cardiology)
        session.flush()

    tenant_department = session.query(TenantDepartment).filter_by(
        tenant_id=1,
        department_id=cardiology.id
    ).first()

    if tenant_department is None:
        tenant_department = TenantDepartment(
            tenant_id=1,
            department_id=cardiology.id,
            phone_number="123456"
        )
        session.add(tenant_department)
    session.commit()


def seed_doctors(session):
    doctor_user = session.query(User).filter_by(
        email="doctor.one@seed.com"
    ).first()

    td = session.query(TenantDepartment).first()

    if not doctor_user or not td:
        return

    existing = session.query(Doctor).filter_by(user_id=doctor_user.id).first()
    if existing:
        return

    doctor = Doctor(
        user_id=doctor_user.id,
        tenant_id=td.tenant_id,
        tenant_department_id=td.id,
        working_hours={
            "monday": ["09:00", "17:00"],
            "tuesday": ["09:00", "17:00"],
            "wednesday": ["09:00", "17:00"]
        }
    )

    session.add(doctor)
    session.commit()


def seed_patients(session):
    from app.models import Patient

    patient_targets = [
        {"email": "client.user@seed.com", "tenant_id": 1},
        {"email": "client.noenroll@seed.com", "tenant_id": 1},
        {"email": "client.othertenant@seed.com", "tenant_id": 2},
    ]

    for target in patient_targets:
        user = session.query(User).filter_by(email=target["email"]).first()
        if not user:
            continue

        existing = session.query(Patient).filter_by(
            user_id=user.id,
            tenant_id=target["tenant_id"],
        ).first()
        if existing:
            continue

        session.add(
            Patient(
                user_id=user.id,
                tenant_id=target["tenant_id"]
            )
        )
    session.commit()


def seed_enrollment(session):
    enrollment_targets = [
        {"email": "client.user@seed.com", "tenant_name": "Bluestone Clinic"},
        {"email": "client.othertenant@seed.com", "tenant_name": "Riverside Health Partners"},
    ]

    for target in enrollment_targets:
        patient_user = session.query(User).filter_by(email=target["email"]).first()
        if not patient_user:
            continue

        tenant = session.query(Tenant).filter_by(name=target["tenant_name"]).first()
        if tenant is None:
            continue

        plan = session.query(UserTenantPlan).filter_by(
            tenant_id=tenant.id,
            name="Starter Plan"
        ).first()
        if plan is None:
            continue

        existing = session.query(Enrollment).filter_by(
            tenant_id=tenant.id,
            patient_user_id=patient_user.id
        ).first()
        if existing:
            continue

        enrollment = Enrollment(
            tenant_id=tenant.id,
            patient_user_id=patient_user.id,
            user_tenant_plan_id=plan.id,
            created_by=patient_user.id,
            status=EnrollmentStatus.ACTIVE
        )
        session.add(enrollment)

    session.commit()


def seed_appointments(session):
    from app.models import Appointment

    doctor = session.query(Doctor).first()
    patient = session.query(Patient).first()

    if not doctor or not patient:
        return

    appointment_dt = datetime(2026, 3, 10, 10, 0, tzinfo=timezone.utc)

    existing = session.query(Appointment).filter_by(
        doctor_user_id=doctor.user_id,
        patient_user_id=patient.user_id,
        appointment_datetime=appointment_dt
    ).first()

    if existing:
        return

    appointment = Appointment(
        tenant_id=doctor.tenant_id,
        doctor_user_id=doctor.user_id,
        patient_user_id=patient.user_id,
        appointment_datetime=appointment_dt,
        description="Initial consultation",
        status=AppointmentStatus.CONFIRMED
    )

    session.add(appointment)
    session.commit()


def run_seed() -> None:
    session = SessionLocal()
    try:
        roles_by_name = seed_roles(session)
        seed_tenants(session)
        session.commit()  # Ensure tenants are saved and IDs exist
        seed_tenant_details(session)
        seed_subscription_plans(session)
        seed_user_tenant_plans(session)
        seed_users(session, roles_by_name)
        session.commit()

        seed_departments(session)
        seed_doctors(session)
        seed_patients(session)
        seed_enrollment(session)
        seed_appointments(session)
        print("Seed completed.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()
