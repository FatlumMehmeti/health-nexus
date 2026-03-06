# PRD-10 Integration Tests — Checkout Initiation, Idempotency, Payment Intent

## Purpose

Integration test suite for PRD-10 (Checkout Initiation, Idempotency, and Payment Intent Flow).

This suite validates:

- Checkout initiation creates a Payment (INITIATED) for a valid PENDING order
- Idempotency: same `Idempotency-Key` returns the same Payment (no duplicate rows)
- Different idempotency keys create distinct Payments for the same order
- Invalid `order_id` returns 404
- Cross-tenant / not-owner access returns 403 or 404
- Order not PENDING (e.g. PAID, CANCELLED) returns 409 with a clear message

## How to Run

1. Start services (including DB):

   ```bash
   docker compose up -d
   ```

2. Run the PRD-10 integration suite (inside the API container so DB host is available):

   ```bash
   docker exec health_api pytest -q tests/integration_prd10 -v
   ```

## Covered Scenarios

- **Happy path**: Valid order → Payment created with `stripe_payment_intent_id`, status INITIATED
- **Idempotency replay**: Same key → same `payment_id` and `stripe_payment_intent_id`
- **Different key**: New key → new Payment
- **Invalid order_id**: 404
- **Cross-tenant / not owner**: 403 or 404
- **Order not PENDING**: 409 with message referring to status

## Fixtures

- `prd10_client`: TestClient with overridden `get_db` (uses test session)
- `tenant_a`, `tenant_b`: Tenants for single- and cross-tenant tests
- `role_patient`: PATIENT role for registration
- Helpers: `register_client_via_api`, `login_client`, `create_order_in_db`, `checkout_initiate_via_api`
