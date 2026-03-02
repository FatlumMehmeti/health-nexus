"""
Tests for tenant audit log API: GET /audit-logs.
Uses conftest's reset_database and db_session.
Audit logs are created when tenant status is updated.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Tenant, TenantStatus, SubscriptionPlan


@pytest.fixture
def client(db_session):
    """TestClient with FREE subscription plan and a pending tenant."""
    free_plan = SubscriptionPlan(name="FREE", price=0, duration=30)
    db_session.add(free_plan)
    tenant = Tenant(
        name="Audit Test",
        email="audit@test.com",
        licence_number="AUD-001",
        status=TenantStatus.pending,
    )
    db_session.add(tenant)
    db_session.commit()
    yield TestClient(app)


def test_audit_logs_empty_before_status_change(client):
    """GET /audit-logs returns empty list when no status changes yet."""
    response = client.get("/audit-logs")
    assert response.status_code == 200
    assert response.json() == []


def test_audit_logs_after_status_change(client):
    """GET /audit-logs returns entries after tenant status is updated."""
    # Create tenant via public API, then update via superadmin
    create_resp = client.post(
        "/api/public/tenants",
        json={
            "name": "Log Test",
            "email": "log@test.com",
            "licence_number": "LOG-001",
        },
    )
    assert create_resp.status_code == 201
    tenant_id = create_resp.json()["id"]

    patch_resp = client.patch(
        f"/api/superadmin/tenants/{tenant_id}/status",
        json={"status": "approved", "reason": "Approved for testing"},
    )
    assert patch_resp.status_code == 200

    response = client.get("/audit-logs")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    status_change = next((l for l in logs if l["event_type"] == "STATUS_CHANGE"), None)
    assert status_change is not None
    assert status_change["entity_name"] == "tenant"
    assert status_change["entity_id"] == tenant_id
    assert status_change["old_value"] == {"status": "pending"}
    assert status_change["new_value"] == {"status": "approved"}
    assert status_change["reason"] == "Approved for testing"
