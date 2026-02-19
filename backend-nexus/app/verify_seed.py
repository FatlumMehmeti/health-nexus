from app.db import SessionLocal
from app.models import Membership, Role, Tenant, User


EXPECTED_ROLES = 5
EXPECTED_TENANTS = 4
EXPECTED_MEMBERSHIPS = 3
EXPECTED_USERS = 5


def verify_seed_data() -> None:
    session = SessionLocal()
    try:
        role_count = session.query(Role).count()
        tenant_count = session.query(Tenant).count()
        membership_count = session.query(Membership).count()
        user_count = session.query(User).count()

        assert role_count >= EXPECTED_ROLES, f"Expected at least {EXPECTED_ROLES} roles, got {role_count}"
        assert tenant_count >= EXPECTED_TENANTS, f"Expected at least {EXPECTED_TENANTS} tenants, got {tenant_count}"
        assert membership_count >= EXPECTED_MEMBERSHIPS, (
            f"Expected at least {EXPECTED_MEMBERSHIPS} memberships, got {membership_count}"
        )
        assert user_count >= EXPECTED_USERS, f"Expected at least {EXPECTED_USERS} users, got {user_count}"

        print("Seed verification passed.")
    finally:
        session.close()


if __name__ == "__main__":
    verify_seed_data()
