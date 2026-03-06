"""
Payment service: checkout initiation with idempotency and order validation.
"""
from __future__ import annotations

import enum
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

import stripe
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import (
    get_stripe_currency,
    get_stripe_secret_key,
    get_stripe_webhook_secret,
)
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.subscription_plan import SubscriptionPlan
from app.models.tenant_subscription import SubscriptionStatus, TenantSubscription
from app.models.user_tenant_plan import UserTenantPlan


class PaymentErrorCode(str, enum.Enum):
    NOT_FOUND = "NOT_FOUND"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    PAYMENT_PROVIDER_ERROR = "PAYMENT_PROVIDER_ERROR"


class PaymentServiceError(Exception):
    def __init__(
        self,
        code: PaymentErrorCode,
        message: str,
        http_status: int,
        details: Optional[dict] = None,
    ) -> None:
        super().__init__(message)
        self.code = code.value
        self.message = message
        self.http_status = http_status
        self.details = details or {}


def _amount_to_minor_units(amount: float) -> int:
    """Convert decimal major-unit amount to Stripe minor units (e.g. dollars -> cents)."""
    major = Decimal(str(amount))
    return int((major * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _create_stripe_payment_intent(payment: Payment) -> str:
    """
    Create a real Stripe PaymentIntent and return its id.

    Idempotency is handled by passing a deterministic key to Stripe.
    """
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise PaymentServiceError(
            PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
            "Stripe is not configured: STRIPE_SECRET_KEY is missing",
            http_status=500,
        )

    stripe.api_key = secret_key
    amount_minor = _amount_to_minor_units(float(payment.price))
    if amount_minor <= 0:
        raise PaymentServiceError(
            PaymentErrorCode.VALIDATION_ERROR,
            "Payment amount must be greater than zero",
            http_status=400,
            details={"payment_id": payment.payment_id, "amount_minor": amount_minor},
        )

    stripe_idempotency_key = (
        f"checkout:{payment.tenant_id}:{payment.payment_type.value}:"
        f"{payment.reference_id}:{payment.idempotency_key}"
    )

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_minor,
            currency=get_stripe_currency(),
            automatic_payment_methods={"enabled": True},
            metadata={
                "payment_id": str(payment.payment_id),
                "tenant_id": str(payment.tenant_id),
                "payment_type": payment.payment_type.value,
                "reference_id": str(payment.reference_id or ""),
            },
            idempotency_key=stripe_idempotency_key,
        )
    except stripe.error.StripeError as exc:
        raise PaymentServiceError(
            PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
            "Failed to create Stripe PaymentIntent",
            http_status=502,
            details={"stripe_error": str(exc)},
        ) from exc

    intent_id = intent.get("id")
    if not intent_id:
        raise PaymentServiceError(
            PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
            "Stripe PaymentIntent response did not include an id",
            http_status=502,
        )
    return str(intent_id)


def _activate_order_if_applicable(db: Session, order_id: int) -> None:
    order = db.get(Order, order_id)
    if order is None:
        return
    if order.status == OrderStatus.PENDING:
        order.status = OrderStatus.PAID


def _activate_enrollment_if_applicable(db: Session, enrollment_id: int) -> None:
    enrollment = db.get(Enrollment, enrollment_id)
    if enrollment is None:
        return

    now = datetime.now(timezone.utc)
    enrollment.status = EnrollmentStatus.ACTIVE
    enrollment.cancelled_at = None
    if enrollment.activated_at is None:
        enrollment.activated_at = now
    if enrollment.expires_at is None:
        plan = db.get(UserTenantPlan, enrollment.user_tenant_plan_id)
        if plan is not None and plan.duration:
            enrollment.expires_at = now + timedelta(days=int(plan.duration))


def _activate_tenant_subscription_if_applicable(db: Session, tenant_subscription_id: int) -> None:
    subscription = db.get(TenantSubscription, tenant_subscription_id)
    if subscription is None:
        return

    now = datetime.now(timezone.utc)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.cancelled_at = None
    subscription.cancellation_reason = None
    if subscription.activated_at is None:
        subscription.activated_at = now
    if subscription.expires_at is None:
        plan = db.get(SubscriptionPlan, subscription.subscription_plan_id)
        if plan is not None and plan.duration:
            subscription.expires_at = now + timedelta(days=int(plan.duration))


def _apply_post_payment_activation(db: Session, payment: Payment) -> None:
    if payment.reference_id is None:
        return

    if payment.payment_type == PaymentType.ORDER:
        _activate_order_if_applicable(db, payment.reference_id)
    elif payment.payment_type == PaymentType.ENROLLMENT:
        _activate_enrollment_if_applicable(db, payment.reference_id)
    elif payment.payment_type == PaymentType.TENANT_SUBSCRIPTION:
        _activate_tenant_subscription_if_applicable(db, payment.reference_id)


def _mark_payment_as_captured(db: Session, payment: Payment) -> Payment:
    if payment.status == PaymentStatus.CAPTURED:
        return payment

    payment.status = PaymentStatus.CAPTURED
    _apply_post_payment_activation(db, payment)
    db.commit()
    db.refresh(payment)
    return payment


def _verify_stripe_webhook_event(payload: bytes, signature: str | None) -> dict:
    webhook_secret = get_stripe_webhook_secret()
    if not webhook_secret:
        raise PaymentServiceError(
            PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
            "Stripe webhook is not configured: STRIPE_WEBHOOK_SECRET is missing",
            http_status=500,
        )
    if not signature:
        raise PaymentServiceError(
            PaymentErrorCode.VALIDATION_ERROR,
            "Missing Stripe-Signature header",
            http_status=400,
        )

    try:
        stripe.api_key = get_stripe_secret_key()
        event = stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except ValueError as exc:
        raise PaymentServiceError(
            PaymentErrorCode.VALIDATION_ERROR,
            "Invalid Stripe webhook payload",
            http_status=400,
        ) from exc
    except stripe.error.SignatureVerificationError as exc:
        raise PaymentServiceError(
            PaymentErrorCode.FORBIDDEN,
            "Invalid Stripe webhook signature",
            http_status=400,
        ) from exc

    return dict(event)


def process_stripe_webhook(db: Session, payload: bytes, signature: str | None) -> dict:
    """
    Process Stripe webhook event payload and perform post-payment activation.
    """
    event = _verify_stripe_webhook_event(payload, signature)
    event_type = str(event.get("type") or "")
    data = event.get("data") or {}
    obj = data.get("object") or {}

    if event_type == "payment_intent.succeeded":
        intent_id = obj.get("id")
        if not intent_id:
            raise PaymentServiceError(
                PaymentErrorCode.VALIDATION_ERROR,
                "payment_intent.succeeded missing PaymentIntent id",
                http_status=400,
            )

        payment = (
            db.query(Payment)
            .filter(Payment.stripe_payment_intent_id == str(intent_id))
            .order_by(Payment.payment_id.desc())
            .first()
        )
        if payment is None:
            return {"processed": False, "reason": "payment_not_found", "event_type": event_type}

        try:
            payment = _mark_payment_as_captured(db, payment)
        except Exception:
            db.rollback()
            raise

        return {
            "processed": True,
            "event_type": event_type,
            "payment_id": payment.payment_id,
            "payment_status": payment.status.value,
        }

    return {"processed": False, "reason": "event_ignored", "event_type": event_type}


def create_or_get_order_payment(
    db: Session,
    order_id: int,
    user_id: int,
    idempotency_key: str,
) -> Payment:
    """
    Create or return existing Payment for an Order, with idempotency.

    Validates:
    - Order exists and belongs to authenticated patient (patient_user_id).
    - Order.status is PENDING.
    - Order.total_amount > 0 (amount derived from DB).

    Tenant is derived from the order (order.tenant_id). If a Payment already exists
    for (tenant_id, ORDER, order_id, idempotency_key), returns it without creating
    a new row. Otherwise creates a new Payment with status INITIATED and a stub
    stripe_payment_intent_id.

    Raises:
        PaymentServiceError: NOT_FOUND (404), FORBIDDEN (403), CONFLICT (409), VALIDATION_ERROR (400).
    """
    order = db.get(Order, order_id)
    if order is None:
        raise PaymentServiceError(
            PaymentErrorCode.NOT_FOUND,
            "Order not found",
            http_status=404,
            details={"order_id": order_id},
        )

    if order.patient_user_id != user_id:
        raise PaymentServiceError(
            PaymentErrorCode.FORBIDDEN,
            "Order does not belong to the authenticated user",
            http_status=403,
            details={"order_id": order_id},
        )

    if order.status != OrderStatus.PENDING:
        raise PaymentServiceError(
            PaymentErrorCode.CONFLICT,
            f"Order is not PENDING (current status: {order.status.value}); cannot initiate checkout",
            http_status=409,
            details={"order_id": order_id, "order_status": order.status.value},
        )

    amount = float(order.total_amount)
    if amount <= 0:
        raise PaymentServiceError(
            PaymentErrorCode.VALIDATION_ERROR,
            "Order total amount must be greater than zero",
            http_status=400,
            details={"order_id": order_id, "total_amount": amount},
        )

    tenant_id = order.tenant_id

    # Idempotency: return existing payment if one exists for this key
    existing = (
        db.query(Payment)
        .filter(
            Payment.tenant_id == tenant_id,
            Payment.payment_type == PaymentType.ORDER,
            Payment.reference_id == order_id,
            Payment.idempotency_key == idempotency_key,
        )
        .first()
    )
    if existing is not None:
        if not existing.stripe_payment_intent_id:
            existing.stripe_payment_intent_id = _create_stripe_payment_intent(existing)
            db.commit()
            db.refresh(existing)
        return existing

    # Create new payment (concurrency-safe: on unique violation, fetch and return existing)
    try:
        payment = Payment(
            payment_type=PaymentType.ORDER,
            price=amount,
            tenant_id=tenant_id,
            reference_id=order_id,
            reference_type="order",
            idempotency_key=idempotency_key,
            status=PaymentStatus.INITIATED,
        )
        db.add(payment)
        db.flush()
        payment.stripe_payment_intent_id = _create_stripe_payment_intent(payment)
        db.commit()
        db.refresh(payment)
        return payment
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(Payment)
            .filter(
                Payment.tenant_id == tenant_id,
                Payment.payment_type == PaymentType.ORDER,
                Payment.reference_id == order_id,
                Payment.idempotency_key == idempotency_key,
            )
            .first()
        )
        if existing is not None:
            return existing
        raise
