# Zoho email delivery

Status: Zoho OAuth and sender mailbox verified; secrets installed; Auth email hook
enabled and deployed. Four existing live order/contact functions migrated. The two
legacy batch contact functions remain local only. Unsigned hook requests return 401.
Actual reset email receipt and password-change completion still need user verification.

## Credentials

Fill the git-ignored `.env.zoho.local` in the repository root. These are server
secrets, never VITE variables. The Australian region is `com.au`; verify the
mailbox's data centre before activation.

Create a Zoho OAuth client and authorize `ZohoMail.messages.CREATE`, plus
`ZohoMail.accounts.READ` to discover the account ID. Use offline access to obtain
a refresh token. Store client ID, client secret, refresh token, account ID and the
bare authorized sender address. The shared transport uses the configured mailbox
for every email, rather than legacy no-reply/orders aliases.

Official references:
- https://www.zoho.com/mail/help/api/using-oauth-2.html
- https://www.zoho.com/mail/help/api/get-all-users-accounts.html
- https://www.zoho.com/mail/help/api/post-send-an-email.html
- https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

## Activation

1. Upload `.env.zoho.local` with `supabase secrets set --env-file .env.zoho.local`
   targeting project `gshfksgxrvbeokyxfryk`. Validate OAuth and account identity
   without sending mail first.
2. Deploy `auth-email` and the six existing email functions after reviewing live
   invocation/authentication settings. Preserve their gateway settings.
3. Generate a webhook signing secret, install it as `SEND_EMAIL_HOOK_SECRET`, and
   configure Supabase Auth's Send Email HTTP hook with the same secret and URL
   `https://gshfksgxrvbeokyxfryk.supabase.co/functions/v1/auth-email`.
   The handler verifies Standard Webhooks signatures; gateway JWT verification is
   disabled only for this signed hook. Keep public signups disabled.
4. Test an owner-requested reset and follow its link through setting a password.
   Test invitations only to an explicitly approved recipient. Confirm receipt.
5. Remove obsolete Resend secrets/configuration after successful cutover.

The Auth hook bypasses SMTP. Disabling it restores the previous SMTP path, which
now points to Zoho SMTP (updated separately by the user); SMTP delivery has not been verified.

Contact message emails retain the mailto reply link in their body. Zoho's
published send API does not document per-message Reply-To, so the old Reply-To
header is not carried over. Normal Reply targets the configured sender mailbox.

`npm test` covers callback/hash mapping, recipient validation, OAuth caching,
Australian endpoints and provider failures with mocked HTTP. No test emails are
sent by the automated suite. Live credential validation passed. Actual email delivery remains pending user testing.
