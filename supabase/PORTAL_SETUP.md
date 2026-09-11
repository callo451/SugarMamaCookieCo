# Portal activation

Activated in the existing SugarMamaCookie project on 12 September 2026 (Melbourne): membership migration, Faith as Owner, Dean as Staff, signup disabled, recovery redirects, manage-team and push-dispatch functions, VAPID secrets, and the one-minute push cron. The migration is recorded as applied. Cron HTTP responses and the authenticated worker returned 200. The upgraded frontend currently runs locally; the public website has not been published from this checkout.

Remaining rollout checks: publish the frontend with the public VAPID key, verify a real invitation/reset email, and verify push on an installed iPhone web app. No real test invitations were sent. The existing SMTP configuration was preserved. The instructions below document reproducible setup for another environment.

## 1. Identify the owner and review the existing project

Use project management access to inspect Auth users and verify the existing owner's UUID with the owner. Do not infer ownership from `raw_user_meta_data.is_admin`; that field is user-editable. Review deployed policies and legacy SECURITY DEFINER functions against the repository migration history, which may differ from production.

## 2. Apply the database update and seed ownership

Apply `migrations/20260911115638_portal_access_and_notifications.sql` and insert the verified owner membership in the same deployment transaction. The insert must happen after `portal_members` is created and before the migration's final COMMIT:

```sql
insert into public.portal_members (user_id, email, role, active)
select id, email, 'owner', true
from auth.users
where id = 'VERIFIED_OWNER_UUID'::uuid;
```

Verify exactly one row was inserted, or roll back. The UI and new server functions do not use legacy metadata for authorization. The migration replaces `is_admin()`, used by the existing operational RLS policies, and revokes legacy user-management RPC permissions. Existing authenticated policies must be inspected to confirm there is no parallel permissive policy.

Do not replay old migrations against the live database without reviewing their contents. Several historic scripts contain manual user setup operations.

## 3. Configure Supabase Auth

- Disable **Allow new users to sign up** in Auth settings. Owner invitations use the server-side Admin API and remain available.
- Keep email/password sign-in enabled. Do not enable Apple or other providers.
- Set Site URL to the final HTTPS frontend origin.
- Add the exact `/admin/set-password` callback for the production origin and `http://127.0.0.1:5173/admin/set-password` for local testing to the redirect allow list.
- Configure production SMTP and verify password reset/invitation delivery. Supabase's default mail service is limited and is not a production delivery plan.
- Test recovery with the owner performing the password entry; do not print tokens or passwords.

## 4. Deploy owner user management

Deploy `manage-team`. Its gateway JWT check is disabled because the function validates the supplied session using Supabase Auth and then checks the owner's current membership. It fails closed for missing, invalid, staff or revoked sessions.

Server secrets:

```
PORTAL_APP_URL=https://YOUR_FRONTEND_ORIGIN
PORTAL_ALLOWED_ORIGINS=https://YOUR_FRONTEND_ORIGIN,http://127.0.0.1:5173
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` within hosted functions. Never expose the service key through a `VITE_` variable.

Invite a test user only with the owner's selected email. Confirm they can set a password, sign in, and manage orders but cannot call the team-management endpoint. Revoke them and verify reads/writes are rejected using their still-valid session. Revocation preserves order history and removes stored push subscriptions; restore access is owner-only. The owner cannot revoke themselves or another owner.

## 5. Activate Web Push

Generate a VAPID key pair using web-push. Store the private key exclusively as an Edge Function secret. Required server secrets:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:YOUR_CONTACT_EMAIL
PUSH_DISPATCH_SECRET=...random-long-secret...
```

Set `VITE_VAPID_PUBLIC_KEY` to the matching **public** key in the frontend environment, then restart/rebuild. Deploy `push-dispatch`.

Use Supabase Cron to POST to `https://PROJECT_REF.supabase.co/functions/v1/push-dispatch` every minute. Send the `x-dispatch-secret` header from Vault (never put it in frontend code or committed SQL). Enable pg_cron/pg_net as needed through the project dashboard. The worker reads an order-event outbox, claims up to 20 jobs, and retries failures with exponential backoff up to 8 attempts. Monitor exhausted jobs in `private.portal_push_jobs` (`finished_at is null and attempts >= 8`). A 207 response means at least one delivery failed and was queued for retry.

Order events are generated transactionally for inserts and meaningful updates. No-op saves do not create events. Notification content includes only the order reference and status, not customer contact details. Delivery is at-least-once: receipts suppress completed sends and stable notification tags collapse visible duplicates, but a crash after sending and before saving a receipt may cause a repeat. Jobs are leased for five minutes; size worker batches/timeouts to stay within that lease and the hosted function duration limit.

On an iPhone/iPad running iOS/iPadOS 16.4+, open the HTTPS portal in Safari, add it to the Home Screen, launch the installed app, and enable notifications under Settings → Notifications. Test a real order and an update with the app closed. Desktop responsive testing does not verify iOS push delivery.

The service worker does not cache authenticated pages or customer data. The manifest is scoped to `/admin`.

## Validation performed locally

- Production build and TypeScript check.
- PGlite/Postgres tests for role access, metadata escalation rejection, revocation with an existing token subject, event generation/no-op suppression, receipt privacy, and service-only worker claims.
- Executed team-function handler tests with mocked transport for unauthenticated/staff/revoked-owner rejection, owner protection, invitation validation, and staff revocation.
- Browser checks against an isolated fixture API. No real invitations, customer orders, or passwords were submitted by these checks.

Live Auth settings, migrations, SMTP delivery, cron activation and real iPhone notification delivery require the connected project and are not covered by the local tests.

## Final security review

The live database confirms browser roles cannot insert or update memberships, all new public tables use RLS, and browser roles cannot call worker RPCs. Legacy public execution of the contact trigger was revoked. Supabase's remaining security advisory is its existing leaked-password-protection setting; this upgrade did not change that feature.
