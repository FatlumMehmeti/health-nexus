# Tenant Client Registration API (FUL-27)

Endpoint:
- `POST /api/public/tenants/{tenant_id}/clients/register`

Request body:
- `email` (required, valid email)
- `birthdate`, `gender`, `blood_type` (optional patient profile fields)
- `first_name`, `last_name`, `password` (optional; used only when creating a new global user)
- Any `tenant_id` in request body is ignored. Path `tenant_id` is the source of truth.

Success (`201 Created`):
- `{ "user_id": int, "patient_id": int, "tenant_id": int }`
- `patient_id` equals `user_id` by design.

Duplicate in same tenant (`409 Conflict`):
- `detail.code = "EMAIL_ALREADY_REGISTERED"`
- `detail.message = "Email already registered in this tenant"`

Tenant not found (`404 Not Found`):
- `detail = "Tenant not found"`

Validation error (`422 Unprocessable Entity`):
- Invalid or missing required fields (for example malformed `email`).
