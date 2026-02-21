from __future__ import annotations

from dataclasses import dataclass

from app.db import SessionLocal
from app.models import Membership, Role, Tenant, TenantStatus, User


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
    SeedUser("Super", "Admin", "super.admin@seed.local", "seed-change-me", "SUPER_ADMIN"),
    SeedUser("Tenant", "Manager", "tenant.manager@seed.local", "seed-change-me", "TENANT_MANAGER"),
    SeedUser("Doctor", "One", "doctor.one@seed.local", "seed-change-me", "DOCTOR"),
    SeedUser("Sales", "Agent", "sales.agent@seed.local", "seed-change-me", "SALES"),
    SeedUser("Client", "User", "client.user@seed.local", "seed-change-me", "CLIENT"),
]


SEED_TENANTS = [
    {"name": "Bluestone Clinic", "email": "contact@bluestone.local", "licence_number": "BLU-001", "status": TenantStatus.approved},
    {"name": "Riverside Health Partners", "email": "contact@riverside.local", "licence_number": "RIV-002", "status": TenantStatus.approved},
    {"name": "Apex Medical Group", "email": "contact@apex.local", "licence_number": "APX-003", "status": TenantStatus.approved},
    {"name": "Northgate Wellness", "email": "contact@northgate.local", "licence_number": "NGT-004", "status": TenantStatus.approved},
]

SEED_TENANT_DETAILS = [
    {"tenant_id": 1, "logo": "sunrise.webp", "moto": "Your health, our priority", "title": "Bluestone Clinic"},
    {"tenant_id": 2, "logo": "valley.webp", "moto": "Care close to home", "title": "Riverside Health Partners"},
    {"tenant_id": 3, "logo": "metro.webp", "moto": "Excellence in urban healthcare", "title": "Apex Medical Group"},
    {"tenant_id": 4, "logo": "pacific.webp", "moto": "Holistic care for better living", "title": "Northgate Wellness"},
]

SEED_MEMBERSHIPS = [
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

def seed_memberships(session):
    existing = {membership.name: membership for membership in session.query(Membership).all()}

    for payload in SEED_MEMBERSHIPS:
        membership = existing.get(payload["name"])
        if membership is None:
            session.add(Membership(**payload))


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
                password=user.password,
                role_id=roles_by_name[user.role_name].id,
            )
        )


def run_seed() -> None:
    session = SessionLocal()
    try:
        roles_by_name = seed_roles(session)
        seed_tenants(session)
        session.flush()
        seed_tenant_details(session)
        seed_memberships(session)
        seed_users(session, roles_by_name)
        session.commit()
        print("Seed completed.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()
