# Manual Test: Signup & Patient Registration

> **Requires**: backend running at `http://localhost:8000`, frontend at `http://localhost:5173`.

---

## 1 - Signup via UI

1. Open `http://localhost:5173/login`
2. Click **"Register"** link → should navigate to `/signup`
3. Fill in email, password (≥ 8 chars), confirm password → **Create account**
4. Expected: toast "Account created!" → redirect to `/login`
5. Log in with those credentials → should succeed

## 2 - Duplicate email (409)

1. On `/signup`, submit with the **same email** again
2. Expected: inline error "An account with this email already exists."

## 3 - Password mismatch (client-side validation)

1. On `/signup`, enter mismatching passwords → **Create account**
2. Expected: "Passwords do not match" field error, no network request

## 4 - Navigate to a tenant landing page

1. Log in as the signup user
2. Go to `/tenants` → click any tenant card → lands on `/landing/<slug>`
3. On the **HOME** tab → expect **"Register as patient"** button (active)

## 5 - Patient registration (201 success)

1. Click **"Register as patient"** → dialog opens
2. Fill `First name`, `Last name` (required); optionally `Birthdate`, `Gender`, `Blood type`
3. Click **Register**
4. Expected: toast "Registered in this tenant" → dialog closes → button shows **"✓ Registered"** (disabled)

## 6 - Duplicate patient registration (409)

1. Refresh the page (local state resets) → button is active again
2. Click **"Register as patient"** → fill form → **Register**
3. Expected: toast "Already registered in this tenant" → dialog closes → button disabled "✓ Registered"

## 7 - Non-approved tenant (403)

1. Obtain or construct a URL with a known non-approved tenant slug
2. Navigate to `/landing/<non-approved-slug>`
3. Log in → click **"Register as patient"** → submit
4. Expected: toast "Access denied" → dialog stays open

## 8 - Unauthenticated user on landing page

1. Log out → navigate to `/landing/<slug>`
2. Expected: **"Register as patient"** button is present but **disabled** (tooltip: "Sign in to register as a patient")

---

## Swagger / API verification

You can also test the endpoints directly via Swagger at `http://localhost:8000/docs`:

| Step | Endpoint | Body |
|------|----------|------|
| Create account | `POST /api/auth/signup` | `{ "email": "...", "password": "...", "role": "client" }` |
| Register patient | `POST /api/public/tenants/{tenant_id}/clients/register` | `{ "email": "...", "first_name": "...", "last_name": "..." }` |
