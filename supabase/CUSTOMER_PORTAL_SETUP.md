# Customer portal setup

The customer portal lives at `/account`. It shares Supabase Auth with the staff workspace, but only explicitly invited `portal_members` can access staff records or tools. Customer registration never inserts a team membership.

## What is ready

- Email/password login, verified signup and password reset.
- Verified-email matching of previously unclaimed orders. Once claimed, ownership remains attached to that Auth UUID, even when email or user metadata changes.
- Quotes and orders, the shared four-step quote wizard, branded quote/order PDFs, private issued-invoice downloads and conversations attached to each order.
- Public guest submissions finish with optional account creation/sign-in, prefilled with the quote email. Email verification links the already-submitted quote; customers do not have to re-enter it.
- Staff `Messages` inbox and invoice uploads / pricing inside each order.
- Account buttons for Apple, Google and Facebook are automatically shown when the corresponding Supabase provider is enabled. No provider secrets belong in Netlify or Vite variables.

Invoices are existing PDFs uploaded by the bakery (maximum 10 MB). The portal does not calculate tax, issue invoice numbers, take payment or treat quotes as invoices. Messages stay in the portal and refresh every 15 seconds while visible; they do not send email. New quote requests use the existing order activity/push outbox.

## Supabase configuration already applied

Customer schema migration: `20260912055640_customer_portal.sql`.
The `customer-invoices` Storage bucket is private. RLS protects both document metadata and the underlying objects. Customers cannot upload invoices, set prices, change statuses, read other customers' orders or impersonate the bakery in messages.

New-user signup is enabled, email confirmation remains enabled, and anonymous sign-in remains disabled. The Site URL is `https://sugarmamacookieco.com.au`.

Customer redirects have been added for production, www and both local preview hosts, alongside the existing staff redirects:

```
https://sugarmamacookieco.com.au/account/callback
https://sugarmamacookieco.com.au/account/set-password
https://www.sugarmamacookieco.com.au/account/callback
https://www.sugarmamacookieco.com.au/account/set-password
http://127.0.0.1:5173/account/callback
http://127.0.0.1:5173/account/set-password
http://localhost:5173/account/callback
http://localhost:5173/account/set-password
```

The existing signed Zoho Auth email hook handles signup confirmation and recovery messages. Its allowed origins already cover these sites; no new mail credentials are required.

## Social sign-in: common callback

For **all three provider developer consoles**, the OAuth callback/redirect URI is:

```
https://gshfksgxrvbeokyxfryk.supabase.co/auth/v1/callback
```

This is different from `/account/callback`: the provider sends the user to Supabase first, then Supabase returns them to the customer portal.

Open [Supabase Authentication → Sign In / Providers](https://supabase.com/dashboard/project/gshfksgxrvbeokyxfryk/auth/providers) to save credentials and enable each provider after setup.

### Google

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview), choose/create a Sugar Mama project and configure branding, support email, audience and requested site/privacy links.
2. Create an OAuth client with type **Web application**. Add `https://sugarmamacookieco.com.au` as an authorized JavaScript origin (and the www origin if used).
3. Add the common Supabase callback above as an **Authorized redirect URI**.
4. Put the Client ID and Client Secret in Supabase's Google provider and enable it.
5. If Google is still in testing mode, add test users. Complete Google's publishing requirements before offering it to all customers.

[Official Supabase Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

### Facebook

1. Open [Meta for Developers](https://developers.facebook.com/apps/) and create an app for customer Facebook Login.
2. Configure Facebook Login for the website and enter the common Supabase callback under **Valid OAuth Redirect URIs**.
3. Configure the app's site domain, contact details, privacy policy and data deletion information requested by Meta. Keep the requested permissions to the sign-in profile/email fields.
4. Copy the App ID and App Secret into the Supabase Facebook provider and enable it.
5. Test with an app-role/test account, then complete Meta's requirements and switch the app to **Live** for customers outside the development roles.

[Official Supabase Facebook guide](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

### Apple

1. Sign in to the [Apple Developer account](https://developer.apple.com/account/). Apple's web sign-in configuration requires an Apple Developer account and the identifiers described in its setup flow.
2. Create/configure a primary App ID with **Sign in with Apple** enabled, then create a **Services ID** for the website and associate it with that App ID.
3. In the Services ID web configuration, use domain `gshfksgxrvbeokyxfryk.supabase.co` and the common Supabase callback above as the return URL.
4. Create a Sign in with Apple signing key. Save the `.p8` key privately, along with the Key ID and Team ID.
5. Generate the Apple OAuth client secret using the official guide's tool. Put the Services ID first in Supabase's Apple Client IDs field and save the secret. Enable Apple.
6. Rotate the Apple OAuth secret before it expires (at most six months). Keep the `.p8` key out of the repository and browser build.
7. Configure Apple's private email relay sender/domain requirements for bakery mail to Hide My Email addresses, and test confirmation/reset delivery to a relay account.

[Official Supabase Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple).

An Apple relay address is different from a customer's normal email. The system deliberately does not guess that these accounts belong to the same person. For existing orders, ask the customer to sign in using the original order email, or verify their identity before any staff-assisted reassignment. Do not reassign records merely on an unverified message claim.

## Verification before public launch

1. Create a customer account with an inbox you control; confirm the Zoho email; sign out/in; request a password reset and follow it.
2. Test each enabled provider in a private browser window, including a cancellation and Apple's Hide My Email.
3. Submit a test quote; check the automatically published price in the admin order; reply from the bakery; upload an issued/sample invoice PDF and download it as the customer.
4. Check a second customer cannot open the first customer's order URL, messages or invoice. Automated database tests already exercise this isolation.
5. Check customer entry to `/admin` is refused, while Faith and Dean retain their invited roles.
6. Remove the test order and any test invoice after testing. Order deletions cascade document metadata; deleting a whole order may leave an inaccessible private Storage object that staff can clean up in Storage.

The security advisor also reports the existing **leaked password protection disabled** warning. Enable it if the Supabase plan supports it: [password protection documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The other existing notices concern intentionally service-only push outbox/delivery tables with no client RLS policies.

The frontend changes are local until committed and pushed. Database changes and Auth configuration are already applied. Do not run a blanket config push using this partial config file; preserve the remote Zoho hook and existing settings.

## Inspiration photos

The shared wizard accepts up to three JPG/PNG/WebP files in Design (10 MB input each). The browser converts them to JPEG, strips original metadata and resizes to a maximum 1600 pixels. The private `quote-inspiration` bucket accepts only JPEG uploads up to 2 MB. Photos appear on the customer and staff order detail screens. Guest upload capability paths expire after 24 hours and permit only three fixed, non-overwritable slots. Only the linked verified customer and bakery staff may read stored photos. If an upload fails after the quote is created, the same page can retry it without creating another quote. Reloading during a failed guest submission may lose the remaining local files; contact the bakery instead of submitting a duplicate. Migration: `20260912083257_quote_inspiration_photos.sql`.

Quotes now calculate and publish their price automatically using pricing_settings and quantity discounts. Admin price edits are immediately visible. Migration: 20260912085404_automatic_quote_pricing.sql.

Customer directory: bakery-only customer_directory_accounts RPC lists account ID, email, verification, creation date and team flag in pages of 500. The admin joins this to paginated order history using persisted ownership first, otherwise verified email. This grouping grants no access. Team-only accounts are excluded from directory/account counts; team accounts with orders remain labelled. Pending quotes, active/completed orders and cancelled records are counted separately. Completed value is not a payment ledger. Migration: 20260912085925_customer_directory.sql.

## Customer message notifications

Migration `20260912095717_customer_message_notifications.sql` creates transactional activity and separate email/push jobs for every new customer message, including replies. Existing staff devices default to customer_messages=true; per-device preferences are in Settings. Bakery replies create no notification back to the bakery and do not email the customer. The existing one-minute push-dispatch cron now also sends Zoho alerts to hello@sugarmamacookieco.com.au. Alerts omit private message text and link to the authenticated order conversation. Email and push retry independently up to eight attempts with five-minute leases. Email is at-least-once: provider acceptance followed by a lost response can cause duplicates. Monitor unfinished jobs with attempts >= 8 in private.portal_message_email_jobs; do not reset them without checking prior delivery. Existing historical messages are not backfilled. Live delivery requires a customer message and an enabled installed iOS device.
