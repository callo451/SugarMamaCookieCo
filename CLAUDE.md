# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sugar Mama Cookie Co. — a custom cookie ordering web app for a bakery in Albury-Wodonga, Australia. Public storefront, authenticated customer portal, and staff workspace for quotes, orders, production, collections and customer communication. Production frontend is hosted on Netlify and deployed from `master`.

## Commands

```bash
npm run dev       # Vite dev server (normally http://127.0.0.1:5173)
npm run build     # Production build (vite build)
npm run typecheck # TypeScript check for the app
npm test          # Node test runner: tests/*.test.mjs
npm run lint      # ESLint (flat config with typescript-eslint, react-hooks, react-refresh)
npm run preview   # Preview production build
```

Tests use Node's test runner, PGlite for database/RLS checks, and mocked transports for Edge Function handlers. They cover staff/customer access, quote pricing and validation, customer aggregation, private attachments, production dates, team management and Zoho mail. Full-repository lint has legacy issues; run targeted lint for changed files as well as typecheck/build. Browser checks do not verify real email or iOS push delivery.

## Tech Stack

React 18 + TypeScript + Vite 8 + Tailwind CSS 3 + Supabase (Postgres, Auth, Storage, Edge Functions). Zustand manages the cart. Framer Motion handles animations, react-hot-toast feedback, lucide-react icons, and jsPDF branded quote/order exports. Styling combines Tailwind utilities with scoped brand stylesheets.

## Architecture

### Routing (src/App.tsx)

- Public routes: `/` (Home), `/gallery`, `/quote-builder`, `/cart`, `/privacy` (`/checkout` redirects to `/quote-builder`; card-entry checkout was removed).
- Staff authentication: `/login`, `/admin/login`, `/admin/set-password`, `/auth/set-password`.
- Admin routes share `<ProtectedRoute>` and `<AdminLayout>`: `/admin` (overview), `/admin/orders`, `/admin/orders/:id`, `/admin/users`, `/admin/activity`, `/admin/messages`, `/admin/production`, `/admin/calendar`, `/admin/customers`, `/admin/settings`.
- Customer authentication: `/account/login`, `/account/callback`, `/account/set-password`.
- Customer routes share `<CustomerLayout>`: `/account`, `/account/quote`, `/account/orders/:id`. These show only the signed-in customer's accessible records.
- Public pages share Navbar/Footer through `PublicLayout`; staff and customer layouts are separate.

### Supabase Clients (src/lib/supabase.ts)

One browser client, `supabase`, uses the public anon key and the current user's session. All browser database/storage operations respect RLS. There is no browser `supabaseAdmin` client.

**Never expose a service-role key or other secret through `VITE_*`.** Privileged Auth operations run in Edge Functions. Admin authorization comes from active `portal_members` membership, never editable user metadata. Customer access comes from verified Auth identity and order ownership.

### Data Flow

- **Shared quote flow:** `QuoteBuilder.tsx` implements Event → Design → Details → Contact on both `/quote-builder` and `/account/quote`; `RequestQuote.tsx` embeds it. Validation and request mapping live in `src/lib/quoteWizard.ts`. Keep both entry points consistent.
- **Guest submission:** Calls `request_guest_quote`, which validates input and server pricing, fixes identity/status, preserves a stable request ID/upload capability, and enforces 3 requests per email/day plus 20 guest requests/hour and 100/day globally. After saving, the builder offers optional account creation/sign-in. A compatibility INSERT trigger protects older deployed clients until direct anonymous writes are revoked in the final security migration.
- **Customer submission:** Calls `request_customer_quote` with a stable request ID. The RPC verifies email, stamps identity, validates input, enforces a daily limit, and returns the same order on retry. It never trusts supplied ownership, price or status.
- **Order linking:** `claim_customer_orders` links unowned historical orders by verified Auth email. Existing ownership takes precedence. Directory email grouping does not grant access. Apple relay addresses may need manual identity verification before linking older orders; there is no automatic reassignment UI.
- **Pricing:** `pricing_settings` provides base price and 12+, 24+, 50+ discount tiers. Unit price rounds to two decimals before multiplication. The `price_submitted_quote` insert trigger calculates customer quote totals server-side using `private.quote_total`, including signed-in and guest submissions, and publishes immediately. Quotes appear with their total and downloadable PDF; there is no manual publish/withdraw workflow. Staff can edit the total directly. `quote_priced` remains in the schema for compatibility. Builder/OrderModal have fallback pricing; keep their formulas aligned with the server.
- **Inspiration photos:** Design step accepts up to three JPG/PNG/WebP files, each up to 10 MB before resizing. `quotePhotos.ts` converts to JPEG, limits the longest edge to 1600 pixels and output to 2 MB. Uploads follow confirmed order creation; failed uploads retry the same order and slots without creating another quote. Pending local photos are lost on page reload.
- **Photo access:** Private paths are `order-id/upload-token/1.jpg` through `3.jpg`. Guest writes require a random capability valid for 24 hours; guests cannot read/list photos. Verified owning customers and staff can view them. `InspirationPhotos` is shared by customer/admin order details.
- **PDFs:** `src/utils/generateOrderPdf.ts` builds branded quote/order documents. Downloads load private photos via `src/lib/pdfInspirationPhotos.ts` and append one uncropped reference per branded Design inspiration page. Failures stop export rather than silently omit photos. Invoice uploads are separate issued PDFs, not generated tax invoices or payment receipts.
- **Customer communication:** `OrderConversation` shares private order messages between customer and bakery. Messages poll every 15 seconds. Customer messages/replies create activity, device push and a separate retryable email job to the bakery inbox; bakery replies do not notify the bakery or email the customer. Admin `/admin/messages` provides an inbox. Conversations show the latest 200 messages; inbox loads the latest 500.
- **Customer directory:** `/admin/customers` combines paginated orders with the bakery-only `customer_directory_accounts` RPC. Includes accounts without orders, verified/unverified status, guest customers, quote/order counts and completed-order value. `src/lib/customerDirectory.ts` groups by persisted ownership first, otherwise verified normalized email. Unverified accounts are not merged with guest history. Team membership records exclude logins from portal customer counts; team accounts with orders remain labelled in the directory. Pending quotes and cancelled orders are excluded from completed-order value, which is not proof of payment.
- **Production:** `/admin/production` and `/admin/calendar` use collection dates in Melbourne time. Completed/cancelled orders leave the active schedule. The branded print kitchen sheet uses the same typography and colours as the site and PDFs.
- **Notifications:** Order inserts and meaningful updates create transactional events and durable push jobs. A one-minute cron invokes `push-dispatch`, with leases, retries and delivery receipts. The same worker independently processes `private.portal_message_email_jobs` through Zoho; device message preferences use `customer_messages`. Email delivery is at-least-once, so an ambiguous provider response may cause a duplicate. Delivery is at-least-once, not guaranteed instant. On supported iOS, install the HTTPS admin portal to the Home Screen and enable notifications in Settings. Real-device delivery requires separate testing.
- **Privacy:** `src/pages/Privacy.tsx` provides the public policy, linked from the public footer. Update it when providers or data practices change.
- **Data fetching:** Direct hooks with loading/error state; no React Query or SWR. Customer directory explicitly pages past the API row limit. Customer home has a 200-order limit and displays that limitation.

### Key Database Tables

- `orders` — primary business table; pending/confirmed/in_progress/completed/cancelled, display reference such as QU001, collection date, customer ownership, idempotency request ID, price and inspiration upload token.
- `order_items` — line items per order.
- `products` — product catalogue used by the legacy cart.
- `pricing_settings` — base_price, discount_12, discount_24, discount_50.
- `auth.users` — login identities. Not directly exposed to browser queries; the staff-only directory RPC returns limited account fields.
- `portal_members` — owner/staff role and active flag; controls bakery access independently of public registration.
- `order_messages` — order conversation; sender identity, bakery flag and creation time are stamped server-side.
- `order_documents` — issued invoice metadata linked to private Storage objects.
- Portal event/read/subscription tables and `private.portal_push_jobs` / `public.portal_push_deliveries` support activity and Web Push. Worker tables intentionally have no customer-facing policies.

Migration history is in `supabase/migrations/`. Do not replay historical scripts blindly: some contain manual user setup. Current deployment/setup instructions are in `supabase/PORTAL_SETUP.md` and `supabase/CUSTOMER_PORTAL_SETUP.md`. Customer portal, inspiration photos, automatic pricing and directory migrations have been applied to the existing project; apply them in order for another environment.

### Auth

Supabase email/password login with recovery and email confirmation. Public signup is enabled for customers; signup never grants staff access. Faith is the Owner and Dean has Staff access, maintained through `portal_members`. Owners invite/revoke team members through Settings; active membership is checked server-side so revoked users lose admin access even with an existing session. Owner protection prevents self-revocation or revocation of another owner through team management.

Customer Apple/Google/Facebook buttons appear only when their provider is enabled. Provider developer credentials still require setup; see `CUSTOMER_PORTAL_SETUP.md`. Staff login remains email/password. Do not restore legacy metadata-based admin checks, `toggle_user_admin`, or browser-side Auth admin operations.

### Edge Functions (supabase/functions/)

Deno runtime. Transactional mail uses the server-only Zoho Mail API transport in `_shared/zoho-mail.ts`, including OAuth refresh and region-specific endpoints; Resend is no longer the transport.

- `auth-email` — signed Supabase Send Email Hook for signup, invitation and password recovery; preserves Supabase verification tokens/callbacks.
- `manage-team` — validates the caller's session and active owner membership before inviting/revoking staff.
- `push-dispatch` — authenticated worker for queued Web Push deliveries.
- `send-order-notification` — customer order confirmation from the saved database order, requiring active staff access and an atomic resend quota. All customer substitutions are HTML-escaped; confirmed orders preserve the staff-managed confirmation template.
- `send-admin-new-order-alert` / `send-admin-reminder` — bakery alerts/reminders.
- `send-contact-message` — validated and throttled public contact email (3/email/day, 30 globally/hour); `send-contact-email` and `handle-contact-form` are retired and return 410.

Review function-specific authentication before deployment. Disabling the gateway JWT check does not make an endpoint unrestricted: Auth hooks use signatures, team management validates sessions, and the push worker requires its secret. Never log tokens or commit mail credentials.

### Storage Buckets

- `Gallery` — public gallery images; HEIC filtered out client-side.
- `Images` — legacy product images.
- `quote-inspiration` — private JPEG references, maximum 2 MB each, capability-based guest upload and participant reads.
- `customer-invoices` — private issued PDFs, maximum 10 MB, staff upload and linked-customer/staff reads.

## Conventions

- Pages/components generally use `export default function`; shared helpers use named exports.
- Brand styling: `bakery.css` (storefront), `admin.css` (`.studio` workspace), `customer.css` (account portal), `quote-wizard.css` (shared builder). Use scoped selectors so one surface does not restyle another.
- Warm paper backgrounds, deep green/ink, thin borders and restrained buttons; serif headings paired with DM Sans body text. Playfair Display/Georgia provide the serif treatment. Use real cookie photography from existing assets/gallery.
- Reuse `AdminLayout`, `.page-heading`, `.studio-panel`, `.studio-button`, and shared customer order components. Avoid restoring legacy coloured icon cards or duplicate sidebars.
- Quote/order PDFs, production print sheets, browser favicons, iOS icons and notification badges follow the same Sugar Mama branding. Browser assets live in `public/`; admin install metadata is `public/admin.webmanifest`.
- Respect reduced-motion preferences for new animations. Labels and keyboard controls must remain accessible; verify desktop and narrow mobile layouts.
- The service worker handles notifications without caching authenticated pages/customer data; admin manifest scope is `/admin`.
- Use integer cookie quantities and AUD formatting. Calendar/business-day logic must use Melbourne time rather than UTC date slicing.
- Do not submit real test quotes, send customer messages/emails, or invite users just to test UI without authorization.

## Environment Variables

Public build-time variables in `.env.local` locally, or Netlify environment settings for production:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
```

Restart Vite after local environment changes; rebuild/redeploy Netlify after production changes. Never add `VITE_SUPABASE_SERVICE_ROLE_KEY`. `.env`, `.env.local`, `.env.*.local`, build output and Supabase CLI temporary files are ignored.

Server-only Edge Function secrets in Supabase:

```text
ZOHO_CLIENT_ID
ZOHO_CLIENT_SECRET
ZOHO_REFRESH_TOKEN
ZOHO_ACCOUNT_ID
ZOHO_FROM_EMAIL
ZOHO_REGION                 # com.au for the Australian Zoho account
SEND_EMAIL_HOOK_SECRET
PORTAL_APP_URL
PORTAL_ALLOWED_ORIGINS
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
PUSH_DISPATCH_SECRET
```

Hosted functions also use Supabase-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY` and, where privileged operations require it, `SUPABASE_SERVICE_ROLE_KEY`. OAuth provider credentials belong in Supabase Auth/provider configuration, not Vite or Git. Keep cron credentials in Vault. Local `supabase/config.toml` is partial: do not blanket-push it over live Auth settings or overwrite the configured Zoho email hook.


### Security hardening (12 September 2026)

- `20260912122135_security_hardening.sql` and `20260912122428_private_email_quota.sql` are deployed. Email handlers now reject anonymous/customer direct sends, load the stored recipient/content, escape substitutions, bound input bytes, and avoid logging customer payloads.
- Saved orders create independent customer/admin jobs in `private.order_email_jobs`; the existing one-minute `push-dispatch` worker processes these alongside message emails/push. Browser-side automatic mail calls were removed. Explicit staff resends allow one per order/channel per five minutes, with a global hourly budget. Queue delivery is at-least-once, not exactly-once.
- `20260912122430_activate_staff_mfa.sql` is **pending**: deploy the frontend with `StaffMfa` first, confirm TOTP enrollment/verification is enabled, then apply this migration. It requires `aal2` in `is_admin()` and revokes direct guest INSERT. The UI provides enrollment/verification before entering the workspace. Do not activate this before the enrollment UI is available.
- The security migration puts sensitive counters/queues in `private`, enables RLS, revokes public access and exposes only guarded RPCs. An RLS-with-no-policy INFO on these internal tables is intentional deny-by-default.
- `public/_headers` supplies CSP, anti-framing, nosniff, referrer and permissions policies when Netlify publishes the build. Keep the sandboxed email-template preview working when adjusting CSP. Never enable unsafe script execution just to fix a blocked resource.
- npm audit is clean after upgrading jsPDF, React Router and Vite. Node 22 (minimum 22.12) is required; `.nvmrc` selects 22. Lockfiles must be committed. Test transforms use Vite's Oxc API.
- Supabase leaked-password protection still needs enabling in the dashboard; the connector cannot change Auth settings and the browser was not signed in. Do not blanket-push the partial local Auth config.
- MFA factor resets require identity verification by the Supabase project administrator. Keep a separate secured project-admin recovery route; do not add a public MFA bypass or weaken RLS for recovery.
- See `supabase/SECURITY_ROLLOUT.md` for deployment order, checks and remaining verification.
