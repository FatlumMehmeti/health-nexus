"""
PRD-10 integration tests: Checkout initiation, idempotency, and payment intent flow.
"""

import pytest

from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.order import OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.subscription_plan import SubscriptionPlan
from app.models.tenant_subscription import SubscriptionStatus, TenantSubscription
from app.models.user_tenant_plan import UserTenantPlan

from tests.integration_prd10.fixtures import (
    register_client_via_api,
    login_client,
    create_order_in_db,
    checkout_initiate_via_api,
    create_tenant_manager_user,
)


@pytest.mark.prd10
def test_checkout_initiate_happy_path_creates_payment(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Happy path: valid order creates Payment with status INITIATED and stripe_payment_intent_id."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-a@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-a@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=50.0,
        status=OrderStatus.PENDING,
    )

    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=order.id,
        idempotency_key="key-happy-001",
        auth_headers=auth,
    )
    assert resp.status_code == 200, (resp.status_code, resp.text)
    data = resp.json()
    assert data["payment_id"] > 0
    assert data["status"] == "INITIATED"
    assert data["stripe_payment_intent_id"] is not None
    assert data["stripe_payment_intent_id"].startswith("pi_")
    assert data["stripe_client_secret"] is not None
    assert data["amount"] == 50.0
    assert data["tenant_id"] == tenant_a.id


@pytest.mark.prd10
def test_checkout_initiate_idempotency_replay_returns_same_payment(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Replay same request with same Idempotency-Key returns same Payment (no duplicate row)."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-replay@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-replay@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=25.0,
        status=OrderStatus.PENDING,
    )
    key = "idem-replay-001"

    resp1 = checkout_initiate_via_api(prd10_client, order.id, key, auth)
    assert resp1.status_code == 200, (resp1.status_code, resp1.text)
    data1 = resp1.json()
    payment_id1 = data1["payment_id"]
    intent_id1 = data1["stripe_payment_intent_id"]
    client_secret1 = data1["stripe_client_secret"]

    resp2 = checkout_initiate_via_api(prd10_client, order.id, key, auth)
    assert resp2.status_code == 200, (resp2.status_code, resp2.text)
    data2 = resp2.json()
    assert data2["payment_id"] == payment_id1
    assert data2["stripe_payment_intent_id"] == intent_id1
    assert data2["stripe_client_secret"] is not None
    assert data2["stripe_client_secret"] == client_secret1
    assert data2["status"] == "INITIATED"
    assert data2["amount"] == 25.0

    # Only one Payment row for this order_id + idempotency_key
    count = (
        db_session.query(Payment)
        .filter(
            Payment.reference_id == order.id,
            Payment.payment_type == PaymentType.ORDER,
            Payment.idempotency_key == key,
        )
        .count()
    )
    assert count == 1, f"Expected exactly one Payment for order_id={order.id} and idempotency_key={key!r}, got {count}"


@pytest.mark.prd10
def test_checkout_initiate_enrollment_creates_payment(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-enroll-init@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-enroll-init@prd10.example.com", "PassPRD10!")

    user_plan = UserTenantPlan(
        tenant_id=tenant_a.id,
        name="PRD10 Enrollment Checkout Plan",
        description="Plan for enrollment checkout initiation test",
        price=39.99,
        duration=30,
        max_appointments=10,
        max_consultations=10,
        is_active=True,
    )
    db_session.add(user_plan)
    db_session.flush()

    enrollment = Enrollment(
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        user_tenant_plan_id=user_plan.id,
        created_by=reg["user_id"],
        status=EnrollmentStatus.PENDING,
    )
    db_session.add(enrollment)
    db_session.commit()
    db_session.refresh(enrollment)

    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=None,
        enrollment_id=enrollment.id,
        idempotency_key="key-enrollment-init-001",
        auth_headers=auth,
    )
    assert resp.status_code == 200, (resp.status_code, resp.text)
    data = resp.json()
    assert data["status"] == "INITIATED"
    assert data["stripe_payment_intent_id"] is not None
    assert data["stripe_client_secret"] is not None
    assert data["tenant_id"] == tenant_a.id
    assert data["amount"] == 39.99

    payment = db_session.query(Payment).filter(Payment.payment_id == data["payment_id"]).first()
    assert payment is not None
    assert payment.payment_type == PaymentType.ENROLLMENT
    assert payment.reference_id == enrollment.id


@pytest.mark.prd10
def test_checkout_initiate_tenant_subscription_creates_payment(
    prd10_client,
    db_session,
    tenant_a,
    role_tenant_manager,
):
    create_tenant_manager_user(
        db_session,
        tenant_id=tenant_a.id,
        role=role_tenant_manager,
        email="manager-sub-init@prd10.example.com",
        password="PassPRD10!",
    )
    auth = login_client(prd10_client, "manager-sub-init@prd10.example.com", "PassPRD10!")

    plan = SubscriptionPlan(
        name="PRD10 Tenant Checkout Plan",
        price=149.00,
        duration=30,
        max_doctors=5,
        max_patients=200,
        max_departments=10,
    )
    db_session.add(plan)
    db_session.flush()

    tenant_subscription = TenantSubscription(
        tenant_id=tenant_a.id,
        subscription_plan_id=plan.id,
        status=SubscriptionStatus.EXPIRED,
        activated_at=None,
        expires_at=None,
    )
    db_session.add(tenant_subscription)
    db_session.commit()
    db_session.refresh(tenant_subscription)

    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=None,
        tenant_subscription_id=tenant_subscription.id,
        idempotency_key="key-subscription-init-001",
        auth_headers=auth,
    )
    assert resp.status_code == 200, (resp.status_code, resp.text)
    data = resp.json()
    assert data["status"] == "INITIATED"
    assert data["stripe_payment_intent_id"] is not None
    assert data["stripe_client_secret"] is not None
    assert data["tenant_id"] == tenant_a.id
    assert data["amount"] == 149.0

    payment = db_session.query(Payment).filter(Payment.payment_id == data["payment_id"]).first()
    assert payment is not None
    assert payment.payment_type == PaymentType.TENANT_SUBSCRIPTION
    assert payment.reference_id == tenant_subscription.id


@pytest.mark.prd10
def test_checkout_initiate_different_key_creates_new_payment(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Different Idempotency-Key for same order creates a new Payment."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-diffkey@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-diffkey@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=30.0,
        status=OrderStatus.PENDING,
    )

    resp1 = checkout_initiate_via_api(
        prd10_client, order.id, "key-one", auth
    )
    assert resp1.status_code == 200, (resp1.status_code, resp1.text)
    data1 = resp1.json()

    resp2 = checkout_initiate_via_api(
        prd10_client, order.id, "key-two", auth
    )
    assert resp2.status_code == 200, (resp2.status_code, resp2.text)
    data2 = resp2.json()

    assert data1["payment_id"] != data2["payment_id"]
    assert data1["stripe_payment_intent_id"] != data2["stripe_payment_intent_id"]


@pytest.mark.prd10
def test_checkout_initiate_invalid_order_id_returns_404(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Invalid or non-existent order_id returns 404."""
    register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-404@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-404@prd10.example.com", "PassPRD10!")

    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=999999,
        idempotency_key="key-404",
        auth_headers=auth,
    )
    assert resp.status_code == 404, (resp.status_code, resp.text)
    body = resp.json()
    assert "error" in body or "detail" in body


@pytest.mark.prd10
def test_checkout_initiate_cross_tenant_returns_403(
    prd10_client,
    db_session,
    tenant_a,
    tenant_b,
    role_patient,
):
    """Order belonging to another tenant / another user returns 403."""
    reg_a = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-tenant-a@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    reg_b = register_client_via_api(
        prd10_client,
        tenant_b.id,
        email="patient-tenant-b@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth_b = login_client(prd10_client, "patient-tenant-b@prd10.example.com", "PassPRD10!")

    # Order belongs to tenant_a and patient A
    order_a = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg_a["user_id"],
        total_amount=10.0,
        status=OrderStatus.PENDING,
    )

    # Patient B (tenant_b) tries to initiate checkout for A's order
    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=order_a.id,
        idempotency_key="key-cross",
        auth_headers=auth_b,
    )
    assert resp.status_code == 403, (resp.status_code, resp.text)


@pytest.mark.prd10
def test_checkout_initiate_enrollment_by_another_user_returns_403(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    reg_owner = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-enroll-owner@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-enroll-other@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    other_auth = login_client(prd10_client, "patient-enroll-other@prd10.example.com", "PassPRD10!")

    user_plan = UserTenantPlan(
        tenant_id=tenant_a.id,
        name="PRD10 Enrollment Auth Plan",
        description="Plan for enrollment auth negative test",
        price=19.99,
        duration=30,
        max_appointments=10,
        max_consultations=10,
        is_active=True,
    )
    db_session.add(user_plan)
    db_session.flush()

    enrollment = Enrollment(
        tenant_id=tenant_a.id,
        patient_user_id=reg_owner["user_id"],
        user_tenant_plan_id=user_plan.id,
        created_by=reg_owner["user_id"],
        status=EnrollmentStatus.PENDING,
    )
    db_session.add(enrollment)
    db_session.commit()
    db_session.refresh(enrollment)

    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=None,
        enrollment_id=enrollment.id,
        idempotency_key="key-enrollment-other-user-001",
        auth_headers=other_auth,
    )
    assert resp.status_code == 403, (resp.status_code, resp.text)


@pytest.mark.prd10
def test_checkout_initiate_tenant_subscription_by_non_manager_returns_403(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-not-manager@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    non_manager_auth = login_client(prd10_client, "patient-not-manager@prd10.example.com", "PassPRD10!")

    plan = SubscriptionPlan(
        name="PRD10 Tenant Auth Plan",
        price=129.00,
        duration=30,
        max_doctors=5,
        max_patients=100,
        max_departments=5,
    )
    db_session.add(plan)
    db_session.flush()

    tenant_subscription = TenantSubscription(
        tenant_id=tenant_a.id,
        subscription_plan_id=plan.id,
        status=SubscriptionStatus.EXPIRED,
        activated_at=None,
        expires_at=None,
    )
    db_session.add(tenant_subscription)
    db_session.commit()
    db_session.refresh(tenant_subscription)

    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=None,
        tenant_subscription_id=tenant_subscription.id,
        idempotency_key="key-subscription-non-manager-001",
        auth_headers=non_manager_auth,
    )
    assert resp.status_code == 403, (resp.status_code, resp.text)


@pytest.mark.prd10
def test_checkout_initiate_order_not_pending_returns_409(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Order with status PAID or CANCELLED returns 409 with clear message."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-paid@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-paid@prd10.example.com", "PassPRD10!")

    order_paid = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=20.0,
        status=OrderStatus.PAID,
    )
    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=order_paid.id,
        idempotency_key="key-paid",
        auth_headers=auth,
    )
    assert resp.status_code == 409, (resp.status_code, resp.text)
    body = resp.json()
    assert "error" in body or "detail" in body
    text = (body.get("error") or {}).get("message") or body.get("detail") or ""
    assert "PENDING" in text or "status" in text.lower()

    order_cancelled = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=15.0,
        status=OrderStatus.CANCELLED,
    )
    resp2 = checkout_initiate_via_api(
        prd10_client,
        order_id=order_cancelled.id,
        idempotency_key="key-cancelled",
        auth_headers=auth,
    )
    assert resp2.status_code == 409, (resp2.status_code, resp2.text)


@pytest.mark.prd10
def test_checkout_initiate_missing_idempotency_key_returns_error(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Missing Idempotency-Key header returns 422."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-no-key@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-no-key@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=10.0,
        status=OrderStatus.PENDING,
    )
    resp = prd10_client.post(
        "/api/checkout/initiate",
        json={"order_id": order.id},
        headers=auth,
    )
    assert resp.status_code == 422, (resp.status_code, resp.text)


@pytest.mark.prd10
def test_checkout_initiate_empty_idempotency_key_returns_400(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Empty or blank Idempotency-Key header returns 400."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-blank-key@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-blank-key@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=10.0,
        status=OrderStatus.PENDING,
    )
    for key in ("", "   "):
        resp = prd10_client.post(
            "/api/checkout/initiate",
            json={"order_id": order.id},
            headers={**auth, "Idempotency-Key": key},
        )
        assert resp.status_code == 400, (resp.status_code, resp.text, key)
        body = resp.json()
        detail = (body.get("detail") or str(body)).lower()
        assert "idempotency" in detail or "required" in detail


@pytest.mark.prd10
def test_checkout_initiate_order_total_amount_zero_or_negative_returns_400(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    """Order with total_amount <= 0 returns 400."""
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-zero@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-zero@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=0.0,
        status=OrderStatus.PENDING,
    )
    resp = checkout_initiate_via_api(
        prd10_client,
        order_id=order.id,
        idempotency_key="key-zero",
        auth_headers=auth,
    )
    assert resp.status_code == 400, (resp.status_code, resp.text)
    body = resp.json()
    assert "amount" in str(body).lower() or "zero" in str(body).lower()


@pytest.mark.prd10
def test_stripe_webhook_marks_order_payment_captured_and_order_paid(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-webhook-order@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )
    auth = login_client(prd10_client, "patient-webhook-order@prd10.example.com", "PassPRD10!")
    order = create_order_in_db(
        db_session,
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        total_amount=42.0,
        status=OrderStatus.PENDING,
    )

    init_resp = checkout_initiate_via_api(
        prd10_client,
        order_id=order.id,
        idempotency_key="key-webhook-order-001",
        auth_headers=auth,
    )
    assert init_resp.status_code == 200, (init_resp.status_code, init_resp.text)
    init_data = init_resp.json()

    event = {
        "id": "evt_test_order_paid",
        "type": "payment_intent.succeeded",
        "data": {"object": {"id": init_data["stripe_payment_intent_id"]}},
    }
    webhook_resp = prd10_client.post(
        "/api/checkout/webhook/stripe",
        json=event,
        headers={"Stripe-Signature": "t=stripe,v1=fake"},
    )
    assert webhook_resp.status_code == 200, (webhook_resp.status_code, webhook_resp.text)

    payment = db_session.query(Payment).filter(Payment.payment_id == init_data["payment_id"]).first()
    db_session.refresh(payment)
    db_session.refresh(order)

    assert payment.status.value == "CAPTURED"
    assert order.status.value == "PAID"


@pytest.mark.prd10
def test_stripe_webhook_activates_enrollment_on_successful_payment(
    prd10_client,
    db_session,
    tenant_a,
    role_patient,
):
    reg = register_client_via_api(
        prd10_client,
        tenant_a.id,
        email="patient-webhook-enrollment@prd10.example.com",
        password="PassPRD10!",
        db_session=db_session,
        role=role_patient,
    )

    user_plan = UserTenantPlan(
        tenant_id=tenant_a.id,
        name="PRD10 Enrollment Plan",
        description="Plan for webhook enrollment activation test",
        price=29.99,
        duration=30,
        max_appointments=10,
        max_consultations=10,
        is_active=True,
    )
    db_session.add(user_plan)
    db_session.flush()

    enrollment = Enrollment(
        tenant_id=tenant_a.id,
        patient_user_id=reg["user_id"],
        user_tenant_plan_id=user_plan.id,
        created_by=reg["user_id"],
        status=EnrollmentStatus.PENDING,
    )
    db_session.add(enrollment)
    db_session.flush()

    payment = Payment(
        payment_type=PaymentType.ENROLLMENT,
        price=29.99,
        tenant_id=tenant_a.id,
        reference_id=enrollment.id,
        reference_type="enrollment",
        idempotency_key="key-webhook-enrollment-001",
        status=PaymentStatus.INITIATED,
        stripe_payment_intent_id="pi_test_prd10_enrollment_success",
    )
    db_session.add(payment)
    db_session.commit()

    event = {
        "id": "evt_test_enrollment_paid",
        "type": "payment_intent.succeeded",
        "data": {"object": {"id": payment.stripe_payment_intent_id}},
    }
    webhook_resp = prd10_client.post(
        "/api/checkout/webhook/stripe",
        json=event,
        headers={"Stripe-Signature": "t=stripe,v1=fake"},
    )
    assert webhook_resp.status_code == 200, (webhook_resp.status_code, webhook_resp.text)

    db_session.refresh(payment)
    db_session.refresh(enrollment)

    assert payment.status.value == "CAPTURED"
    assert enrollment.status.value == "ACTIVE"
    assert enrollment.activated_at is not None
    assert enrollment.expires_at is not None


@pytest.mark.prd10
def test_stripe_webhook_activates_tenant_subscription_on_successful_payment(
    prd10_client,
    db_session,
    tenant_a,
):
    subscription_plan = SubscriptionPlan(
        name="PRD10 Tenant Plan",
        price=199.00,
        duration=30,
        max_doctors=5,
        max_patients=100,
        max_departments=5,
    )
    db_session.add(subscription_plan)
    db_session.flush()

    tenant_subscription = TenantSubscription(
        tenant_id=tenant_a.id,
        subscription_plan_id=subscription_plan.id,
        status=SubscriptionStatus.EXPIRED,
        activated_at=None,
        expires_at=None,
    )
    db_session.add(tenant_subscription)
    db_session.flush()

    payment = Payment(
        payment_type=PaymentType.TENANT_SUBSCRIPTION,
        price=199.00,
        tenant_id=tenant_a.id,
        reference_id=tenant_subscription.id,
        reference_type="tenant_subscription",
        idempotency_key="key-webhook-subscription-001",
        status=PaymentStatus.INITIATED,
        stripe_payment_intent_id="pi_test_prd10_subscription_success",
    )
    db_session.add(payment)
    db_session.commit()

    event = {
        "id": "evt_test_subscription_paid",
        "type": "payment_intent.succeeded",
        "data": {"object": {"id": payment.stripe_payment_intent_id}},
    }
    webhook_resp = prd10_client.post(
        "/api/checkout/webhook/stripe",
        json=event,
        headers={"Stripe-Signature": "t=stripe,v1=fake"},
    )
    assert webhook_resp.status_code == 200, (webhook_resp.status_code, webhook_resp.text)

    db_session.refresh(payment)
    db_session.refresh(tenant_subscription)

    assert payment.status.value == "CAPTURED"
    assert tenant_subscription.status.value == "ACTIVE"
    assert tenant_subscription.activated_at is not None
    assert tenant_subscription.expires_at is not None
