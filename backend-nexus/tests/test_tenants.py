"""
Tests for tenant APIs: public registration, superadmin list/get/status update.
Uses conftest's reset_database and db_session.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Tenant, TenantStatus, Membership


@pytest.fixture
def client(db_session):
    """TestClient with FREE membership for approval flow."""
    free_plan = Membership(name="FREE", price=0, duration=30)
    db_session.add(free_plan)
    db_session.commit()
    yield TestClient(app)


def test_public_create_tenant_application_success(client):
    """POST /api/public/tenants creates tenant with status pending, returns 201."""
    response = client.post(
        "/api/public/tenants",
        json={
            "name": "Test Clinic",
            "email": "contact@testclinic.com",
            "licence_number": "TST-001",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Clinic"
    assert data["email"] == "contact@testclinic.com"
    assert data["licence_number"] == "TST-001"
    assert data["status"] == "pending"
    assert "id" in data
    assert "created_at" in data


def test_public_create_tenant_duplicate_email_returns_409(client):
    """POST /api/public/tenants with existing email returns 409."""
    payload = {
        "name": "Clinic A",
        "email": "dup@clinic.com",
        "licence_number": "DUP-001",
    }
    r1 = client.post("/api/public/tenants", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/public/tenants", json={**payload, "licence_number": "DUP-002"})
    assert r2.status_code == 409
    assert "already exists" in r2.json().get("detail", "").lower()


def test_public_create_tenant_duplicate_licence_returns_409(client):
    """POST /api/public/tenants with existing licence_number returns 409."""
    payload = {
        "name": "Clinic B",
        "email": "other@clinic.com",
        "licence_number": "LIC-001",
    }
    r1 = client.post("/api/public/tenants", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/public/tenants", json={**payload, "email": "different@clinic.com"})
    assert r2.status_code == 409


def test_superadmin_list_tenants_empty(client):
    """GET /api/superadmin/tenants returns empty list when no tenants."""
    response = client.get("/api/superadmin/tenants")
    assert response.status_code == 200
    assert response.json() == []


def test_superadmin_list_tenants_with_filter(client, db_session):
    """GET /api/superadmin/tenants?status=pending returns only pending tenants."""
    t1 = Tenant(name="A", email="a@test.com", licence_number="A-001", status=TenantStatus.pending)
    t2 = Tenant(name="B", email="b@test.com", licence_number="B-001", status=TenantStatus.approved)
    db_session.add_all([t1, t2])
    db_session.commit()

    response = client.get("/api/superadmin/tenants?status=pending")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["status"] == "pending"
    assert items[0]["name"] == "A"


def test_superadmin_get_tenant_success(client, db_session):
    """GET /api/superadmin/tenants/{id} returns tenant when found."""
    tenant = Tenant(
        name="Get Test",
        email="get@test.com",
        licence_number="GET-001",
        status=TenantStatus.pending,
    )
    db_session.add(tenant)
    db_session.commit()

    response = client.get(f"/api/superadmin/tenants/{tenant.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == tenant.id
    assert data["name"] == "Get Test"


def test_superadmin_get_tenant_not_found_returns_404(client):
    """GET /api/superadmin/tenants/99999 returns 404."""
    response = client.get("/api/superadmin/tenants/99999")
    assert response.status_code == 404
    assert "not found" in response.json().get("detail", "").lower()


def test_superadmin_patch_status_pending_to_approved(client, db_session):
    """PATCH /api/superadmin/tenants/{id}/status pending→approved returns 200."""
    tenant = Tenant(
        name="Approve Test",
        email="approve@test.com",
        licence_number="APR-001",
        status=TenantStatus.pending,
    )
    db_session.add(tenant)
    db_session.commit()

    response = client.patch(
        f"/api/superadmin/tenants/{tenant.id}/status",
        json={"status": "approved"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"


def test_superadmin_patch_status_same_status_returns_400(client, db_session):
    """PATCH status with same current status returns 400."""
    tenant = Tenant(
        name="Same Status",
        email="same@test.com",
        licence_number="SAM-001",
        status=TenantStatus.pending,
    )
    db_session.add(tenant)
    db_session.commit()

    response = client.patch(
        f"/api/superadmin/tenants/{tenant.id}/status",
        json={"status": "pending"},
    )
    assert response.status_code == 400
    assert "already" in response.json().get("detail", "").lower()


def test_superadmin_patch_status_invalid_transition_returns_400(client, db_session):
    """PATCH status pending→suspended (invalid) returns 400."""
    tenant = Tenant(
        name="Invalid Trans",
        email="invalid@test.com",
        licence_number="INV-001",
        status=TenantStatus.pending,
    )
    db_session.add(tenant)
    db_session.commit()

    response = client.patch(
        f"/api/superadmin/tenants/{tenant.id}/status",
        json={"status": "suspended"},
    )
    assert response.status_code == 400
    assert "invalid" in response.json().get("detail", "").lower() or "transition" in response.json().get("detail", "").lower()
