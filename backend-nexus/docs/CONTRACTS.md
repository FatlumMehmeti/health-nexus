# Doctor Contracts

## Overview

Contracts bind a **Doctor** to a **Tenant** (hospital/clinic). When a doctor is created as a user, the tenant manager creates a contract. The contract includes salary, terms and conditions (HTML content), start/end dates, and status. Both the doctor and the hospital sign it digitally.

## Data Model

### Contract

| Field                  | Type                 | Description                                                          |
| ---------------------- | -------------------- | -------------------------------------------------------------------- |
| id                     | PK                   | Auto-increment                                                       |
| tenant_id              | FK → tenants.id      | Hospital/clinic                                                      |
| doctor_user_id         | FK → doctors.user_id | Doctor (Doctor PK is user_id)                                        |
| status                 | enum                 | DRAFT, ACTIVE, EXPIRED, TERMINATED                                   |
| salary                 | Decimal              | Annual/monthly salary (stored as decimal)                            |
| terms_content          | Text (HTML)          | Contract body from HTML editor                                       |
| start_date             | DateTime             | Contract start                                                       |
| end_date               | DateTime             | Contract end                                                         |
| activated_at           | DateTime             | When status became ACTIVE (for eligibility)                          |
| expires_at             | DateTime             | When status became EXPIRED (nullable)                                |
| terms_metadata         | JSON                 | Optional extra metadata                                              |
| terminated_reason      | Text                 | Required when status = TERMINATED                                    |
| doctor_signed_at       | DateTime             | When doctor signed                                                   |
| doctor_signature       | Text                 | Storage path (signatures/contract_X_doctor_xxx.png); API returns URL |
| hospital_signed_at     | DateTime             | When hospital/tenant manager signed                                  |
| hospital_signature     | Text                 | Storage path; API returns URL                                        |
| created_at, updated_at | DateTime             | Timestamps                                                           |

### Status Transitions

- **DRAFT** → ACTIVE, TERMINATED
- **ACTIVE** → EXPIRED, TERMINATED
- **EXPIRED** → (none)
- **TERMINATED** → (none)

### Business Rules

- Contract is created when a doctor is onboarded; one contract per doctor per tenant per period.
- Digital signatures: doctor signs first (optional for DRAFT), then hospital. Both signatures required for ACTIVE.
- Tenant manager can change status via transition endpoint.
- Download: backend provides contract as HTML/PDF with both signatures applied (future enhancement).

## API Endpoints

### Tenant-scoped (by doctor)

- `GET /api/tenants/{tenantId}/contracts` — List contracts (filter by doctor optional)
- `POST /api/tenants/{tenantId}/contracts` — Create contract (link to doctor)
- `GET /api/contracts/{contractId}` — Contract details
- `PATCH /api/contracts/{contractId}` — Update dates, salary, terms_content (no status)
- `POST /api/contracts/{contractId}/transition` — Status change (tenant manager)
- `POST /api/contracts/{contractId}/sign/doctor` — Doctor signs (multipart: image file PNG/JPEG/WebP, max 2MB)
- `POST /api/contracts/{contractId}/sign/hospital` — Hospital signs (multipart: image file)
- `GET /api/contracts/{contractId}/signature/doctor` — Serve doctor signature image (auth required)
- `GET /api/contracts/{contractId}/signature/hospital` — Serve hospital signature image (auth required)

### Storage

Signatures are saved to local disk (`uploads/signatures/` by default; override with `STORAGE_ROOT`). The API returns full URLs like `http://localhost:8000/uploads/signatures/contract_3_hospital_xxx.png` (set `API_BASE_URL` for production). Files are served at `/uploads/` via StaticFiles. Ready to swap for Azure Blob Storage later.

### Booking Eligibility

- `has_active_contract_for_doctor(db, doctor_user_id)` — True if contract exists with ACTIVE status, valid dates, and both signatures.

## Audit

On every status transition: log contract_id, tenant_id, old_status → new_status, user_id, reason.
