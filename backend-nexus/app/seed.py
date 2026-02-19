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
    {"moto": "Iliria Hospital", "logo": "iliria.webp", "status": TenantStatus.approved},
    {"moto": "Dardania Clinic", "logo": "dardania.webp", "status": TenantStatus.approved},
    {"moto": "American Hospital", "logo": "american.webp", "status": TenantStatus.approved},
    {"moto": "Polyclinic Diagnoze", "logo": "diagnoze.webp", "status": TenantStatus.approved},
]


SEED_MEMBERSHIPS = [
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
    existing = {tenant.moto: tenant for tenant in session.query(Tenant).all()}

    for payload in SEED_TENANTS:
        tenant = existing.get(payload["moto"])
        if tenant is None:
            session.add(Tenant(**payload))


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
