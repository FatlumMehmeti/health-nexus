# Tenant Client Registration API (FUL-27)

Endpoint:

- `POST /api/public/tenants/{tenant_id}/clients/register`

Headers:

- `Authorization: Bearer <access_token>` (optional for public registration)
- If token contains `tenant_id`, it must match `{tenant_id}` in path.

Request body:

- `email` (required, valid email)
- `birthdate`, `gender`, `blood_type` (optional patient profile fields)
- `first_name`, `last_name`, `password` (optional; used only when creating a new global user)
- Any `tenant_id` in request body is ignored. Path `tenant_id` is the source of truth.

Success (`201 Created`):

- `{ "user_id": int, "patient_id": int, "tenant_id": int }`
- `patient_id` equals `user_id` by design.

Success example:

```json
{
  "user_id": 42,
  "patient_id": 42,
  "tenant_id": 7
}
```

Duplicate in same tenant (`409 Conflict`):

- `detail.code = "EMAIL_ALREADY_REGISTERED"`
- `detail.message = "Email already registered in this tenant"`

Duplicate example:

```json
{
  "detail": {
    "code": "EMAIL_ALREADY_REGISTERED",
    "message": "Email already registered in this tenant"
  }
}
```

Tenant not found (`404 Not Found`):

- `detail = "Tenant not found"`

Tenant not active (`403 Forbidden`):

- `detail.code = "TENANT_NOT_ACTIVE"`
- `detail.message = "Tenant must be active to register clients"`

Cross-tenant token mismatch (`403 Forbidden`):

- `detail = "Tenant access denied"`

Validation error (`422 Unprocessable Entity`):

- Invalid or missing required fields (for example malformed `email`).

Validation example:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error"
    }
  ]
}
```

Integration flow notes:

1. Client app resolves tenant and calls registration with tenant path.
2. Backend reuses existing global user by email or creates new user.
3. Backend checks duplicate only in the same tenant.
4. Backend creates tenant-scoped patient profile only.
5. Enrollment is created later by enrollment module and must reuse patient tenant context.
