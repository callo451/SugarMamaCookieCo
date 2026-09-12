# Security fixes — release and verification

## Deployed backend

Applied migrations:
- `20260912122135_security_hardening.sql`
- `20260912122428_private_email_quota.sql`

Deployed functions: `send-order-notification` v12, `send-admin-new-order-alert` v8, `send-admin-reminder` v7, `send-contact-message` v6, `manage-team` v5, `push-dispatch` v5. Retired adapters `send-contact-email` and `handle-contact-form` return 410.

Safe live probes confirm anonymous order-email calls return 401. No valid email payload was sent for testing. Database checks confirm worker RPCs are inaccessible to anonymous/customer roles; quotas and the compatible guest guard are present. The private authenticated email-quota implementation verifies active staff membership and is exposed through an invoker wrapper.

## Remaining release sequence

1. Commit/push the frontend and dependency changes to master, including the existing customer-message notification UI. Netlify should use Node 22 from `.nvmrc` and run the normal build. Do not release an old lockfile with the new Vite version.
2. Verify `/checkout` redirects to `/quote-builder`; public/account quote routes load; `/admin` presents two-step setup after a staff login. Verify Auth TOTP enrollment/verification is enabled. Faith and Dean enroll using their own authenticator apps; never store their setup keys or OTPs in repository files or logs.
3. Apply **only the pending** `20260912122430_activate_staff_mfa.sql` migration. Do not blindly push every historical migration in this repository. The two earlier security migrations are already live. After activation, password-only staff sessions cannot access admin data or team-management actions; customers retain their normal account access. Direct guest table inserts are revoked, leaving the validated RPC.
4. Check actual Netlify headers for `/`, `/account/login` and `/admin`, including CSP/frame-ancestors, nosniff and referrer policy. Verify gallery/inspiration images, PDF download and sandboxed email-template previews under CSP. The Vite development server does not apply Netlify `_headers`.
5. Enable **Leaked password protection** under Supabase Authentication → Sign In / Providers → Email (dashboard labels can change). This may depend on project plan. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. The available connector cannot modify Auth configuration; the inspected browser required dashboard sign-in. Preserve the existing Zoho hook, OAuth providers and redirect settings.
6. Run one coordinated real customer quote/message and staff response test with Faith when authorized, including iPhone Home Screen push, emails, images and PDFs. Current tests use mocks/local database fixtures; no real customer messages, quotes, emails or MFA credentials were submitted as tests.

## Limits and operations

Guest requests: 3/email/day, 20 guest requests/hour, 100/day globally. Signed-in customers retain their existing 10 quotes/day/account limit. Contact: 3/email/day and 30 total/hour. Staff email resend: one/order/channel per 5 minutes and 100 total/hour. These are server-enforced ceilings; global limits can temporarily reject legitimate requests during abuse. They are not a substitute for a CAPTCHA or edge bot filter if targeted abuse persists.

Order and message email jobs retry with bounded exponential backoff. Delivery remains at-least-once because Zoho may accept a send before a network failure. Examine aggregate queue failures/attempts without logging customer content. No full customer request payloads should appear in operational logs. Existing historic log retention/access remains a dashboard review item.

Recovery: a verified project administrator must verify identity and reset a lost MFA factor in Supabase. The app intentionally has no customer-facing/admin bypass. Ensure the project administrator's own access is secured before mandatory MFA activation.

Security limitations still requiring separate testing: adversarial two-customer browser sessions; real MFA enrollment/recovery; CSP on the actual Netlify deployment; malicious-upload decoding/re-encoding; restore testing. Dependencies are patched, but no claim is made that uploaded images are server-decoded/re-encoded. Existing private MIME/size/path checks remain.
