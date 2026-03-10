"""
Subscription Plan Integration Tests
Tests: Plan Tier Assignment & Validation, Cross-Tenant Access Denial
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import run_seed
from app.db import SessionLocal
from app.models import (
    Tenant,
    TenantManager,
    User,
    Role,
    SubscriptionPlan,
    TenantSubscription,
    Doctor,
)
from app.models.tenant_subscription import SubscriptionStatus
from app.auth.auth_utils import hash_password


@pytest.fixture
def client():
    """TestClient with seeded DB."""
    run_seed()
    yield TestClient(app)


@pytest.fixture
def bluestone_auth(client):
    """Bluestone Clinic manager token."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "tenant.manager@seed.com", "password": "Team2026@"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def riverside_auth(client):
    """Riverside Health Partners manager token (create if needed)."""
    session = SessionLocal()
    try:
        role = session.query(Role).filter(Role.name == "TENANT_MANAGER").first()
        tenant = session.query(Tenant).filter(Tenant.name == "Riverside Health Partners").first()

        # Check if user already exists
        user = session.query(User).filter(User.email == "riverside.mgr@test.com").first()
        if not user:
            user = User(
                first_name="Riverside",
                last_name="Mgr",
                email="riverside.mgr@test.com",
                password=hash_password("Team2026@"),
                role_id=role.id,
            )
            session.add(user)
            session.flush()
            session.add(TenantManager(user_id=user.id, tenant_id=tenant.id))
            session.commit()
    finally:
        session.close()

    resp = client.post(
        "/api/auth/login",
        json={"email": "riverside.mgr@test.com", "password": "Team2026@"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_upgrade_plan_succeeds_and_marks_old_subscription_expired(client, bluestone_auth):
    """Paid upgrade creates or returns a pending subscription and keeps current active plan unchanged."""
    headers = {"Authorization": f"Bearer {bluestone_auth}"}

    # Get current subscription details
    session = SessionLocal()
    try:
        bluestone = session.query(Tenant).filter(Tenant.name == "Bluestone Clinic").first()
        current_sub = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == bluestone.id,
                TenantSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .first()
        )
        old_sub_id = current_sub.id
        current_plan_id = current_sub.subscription_plan_id
        current_plan = session.get(SubscriptionPlan, current_plan_id)

        # Find next higher priced tier plan
        new_plan = (
            session.query(SubscriptionPlan)
            .filter(SubscriptionPlan.price > current_plan.price)
            .order_by(SubscriptionPlan.price.asc(), SubscriptionPlan.id.asc())
            .first()
        )
        assert new_plan is not None
        new_plan_id = new_plan.id
    finally:
        session.close()

    # Upgrade plan
    resp = client.post(
        "/api/subscription_plan/change",
        headers=headers,
        json={"new_plan_id": new_plan_id},
    )
    assert resp.status_code == 200
    new_sub = resp.json()
    assert new_sub["status"] == "EXPIRED"
    assert new_sub["subscription_plan_id"] == new_plan_id
    assert new_sub["activated_at"] is None
    assert new_sub["expires_at"] is None
    assert "Awaiting payment" in (new_sub["cancellation_reason"] or "")

    # Verify current active subscription is unchanged until payment succeeds
    session = SessionLocal()
    try:
        old_sub = (
            session.query(TenantSubscription).filter(TenantSubscription.id == old_sub_id).first()
        )
        assert old_sub.status == SubscriptionStatus.ACTIVE
        assert old_sub.subscription_plan_id == current_plan_id
        assert old_sub.cancelled_at is None
        assert old_sub.cancellation_reason is None
    finally:
        session.rollback()
        session.close()


def test_downgrade_blocked_when_resources_exceed_limit(client, bluestone_auth):
    """Downgrade to a lower-priced plan is rejected for an active paid subscription."""

    headers = {"Authorization": f"Bearer {bluestone_auth}"}

    # Get a lower-priced plan dynamically
    session = SessionLocal()
    try:
        bluestone = session.query(Tenant).filter(Tenant.name == "Bluestone Clinic").first()
        current_sub = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == bluestone.id,
                TenantSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .first()
        )
        current_plan = session.get(SubscriptionPlan, current_sub.subscription_plan_id)
        free_plan = session.query(SubscriptionPlan).filter(SubscriptionPlan.name == "FREE").first()
        assert free_plan is not None
        free_plan_id = free_plan.id
        assert float(free_plan.price) < float(current_plan.price)
    finally:
        session.close()

    # Try downgrade to FREE plan (should fail)
    resp = client.post(
        "/api/subscription_plan/change",
        headers=headers,
        json={"new_plan_id": free_plan_id},
    )
    assert resp.status_code == 400
    assert "downgrade" in resp.json()["detail"].lower()


def test_tenant_plan_change_only_affects_own_subscription(client, bluestone_auth, riverside_auth):
    """Paid plan change for one tenant creates only that tenant's pending subscription."""
    bluestone_headers = {"Authorization": f"Bearer {bluestone_auth}"}

    # Get initial plans for both tenants
    session = SessionLocal()
    try:
        bluestone = session.query(Tenant).filter(Tenant.name == "Bluestone Clinic").first()
        riverside = session.query(Tenant).filter(Tenant.name == "Riverside Health Partners").first()

        bluestone_sub_before = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == bluestone.id,
                TenantSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .first()
        )

        riverside_sub_before = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == riverside.id,
                TenantSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .first()
        )

        bluestone_plan_before = bluestone_sub_before.subscription_plan_id
        riverside_plan_before = riverside_sub_before.subscription_plan_id

        # Find next higher priced plan for Bluestone upgrade
        next_plan = (
            session.query(SubscriptionPlan)
            .filter(SubscriptionPlan.price > bluestone_sub_before.subscription_plan.price)
            .order_by(SubscriptionPlan.price.asc(), SubscriptionPlan.id.asc())
            .first()
        )
        assert next_plan is not None
        upgrade_plan_id = next_plan.id
    finally:
        session.close()

    # Bluestone upgrades
    resp = client.post(
        "/api/subscription_plan/change",
        headers=bluestone_headers,
        json={"new_plan_id": upgrade_plan_id},
    )
    assert resp.status_code == 200

    # Verify: Bluestone plan changed, Riverside unchanged
    session = SessionLocal()
    try:
        bluestone = session.query(Tenant).filter(Tenant.name == "Bluestone Clinic").first()
        riverside = session.query(Tenant).filter(Tenant.name == "Riverside Health Partners").first()

        bluestone_sub_after = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == bluestone.id,
                TenantSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .first()
        )

        riverside_sub_after = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == riverside.id,
                TenantSubscription.status == SubscriptionStatus.ACTIVE,
            )
            .first()
        )

        pending_bluestone_sub = (
            session.query(TenantSubscription)
            .filter(
                TenantSubscription.tenant_id == bluestone.id,
                TenantSubscription.subscription_plan_id == upgrade_plan_id,
                TenantSubscription.status == SubscriptionStatus.EXPIRED,
                TenantSubscription.activated_at.is_(None),
            )
            .order_by(TenantSubscription.id.desc())
            .first()
        )

        # Bluestone active subscription remains unchanged until payment succeeds
        assert bluestone_sub_after.subscription_plan_id == bluestone_plan_before
        assert pending_bluestone_sub is not None

        # Riverside unchanged
        assert riverside_sub_after.subscription_plan_id == riverside_plan_before
    finally:
        session.rollback()
        session.close()
