"""
Tests for user-tenant-plan APIs.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.auth_utils import get_current_user
from app.models import Tenant, TenantManager, User, UserTenantPlan


@pytest.fixture
def client(db_session):
    """TestClient with dependency override and seed helpers."""

    manager_user = User(
        first_name="Manager",
        last_name="User",
        email="manager@test.com",
        password="hashed",
    )
    outsider_user = User(
        first_name="Outsider",
        last_name="User",
        email="outsider@test.com",
        password="hashed",
    )

    tenant = Tenant(
        name="Tenant One",
        email="tenant1@test.com",
        licence_number="TEN-001",
    )
    other_tenant = Tenant(
        name="Tenant Two",
        email="tenant2@test.com",
        licence_number="TEN-002",
    )

    db_session.add_all([manager_user, outsider_user, tenant, other_tenant])
    db_session.flush()

    manager_membership = TenantManager(
        user_id=manager_user.id,
        tenant_id=tenant.id,
    )
    db_session.add(manager_membership)
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: {"user_id": manager_user.id}
    try:
        with TestClient(app) as test_client:
            test_client.manager_user_id = manager_user.id
            test_client.outsider_user_id = outsider_user.id
            test_client.tenant_id = tenant.id
            test_client.other_tenant_id = other_tenant.id
            yield test_client
    finally:
        app.dependency_overrides.clear()


def test_create_plan_success(client):
    response = client.post(
        "/user-tenant-plans/",
        json={
            "tenant_id": client.tenant_id,
            "name": "Basic",
            "description": "Starter plan",
            "price": "29.99",
            "duration": 30,
            "max_appointments": 10,
            "max_consultations": 5,
            "is_active": True,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == client.tenant_id
    assert data["name"] == "Basic"
    assert float(data["price"]) == pytest.approx(29.99)


def test_create_plan_for_unmanaged_tenant_returns_403(client):
    response = client.post(
        "/user-tenant-plans/",
        json={
            "tenant_id": client.other_tenant_id,
            "name": "Unauthorized",
            "price": "49.99",
        },
    )

    assert response.status_code == 403
    assert "not authorized" in response.json().get("detail", "").lower()


def test_update_plan_success(client, db_session):
    plan = UserTenantPlan(
        tenant_id=client.tenant_id,
        name="Original",
        description="Original description",
        price=19.99,
        duration=15,
        max_appointments=3,
        max_consultations=2,
        is_active=True,
    )
    db_session.add(plan)
    db_session.commit()

    response = client.put(
        f"/user-tenant-plans/{plan.id}",
        json={"name": "Updated", "duration": 60},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated"
    assert data["duration"] == 60


def test_get_plans_by_tenant_success(client, db_session):
    p1 = UserTenantPlan(
        tenant_id=client.tenant_id,
        name="A",
        price=10,
        is_active=True,
    )
    p2 = UserTenantPlan(
        tenant_id=client.tenant_id,
        name="B",
        price=20,
        is_active=True,
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    response = client.get(f"/user-tenant-plans/tenant/{client.tenant_id}")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {item["name"] for item in data}
    assert names == {"A", "B"}


def test_delete_plan_success(client, db_session):
    plan = UserTenantPlan(
        tenant_id=client.tenant_id,
        name="Delete me",
        price=9.99,
        is_active=True,
    )
    db_session.add(plan)
    db_session.commit()

    response = client.delete(f"/user-tenant-plans/{plan.id}")

    assert response.status_code == 200
    assert response.json()["message"] == "Plan deleted successfully"
