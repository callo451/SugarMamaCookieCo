import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { sendMail } from '../_shared/zoho-mail.ts';
import { authMessages } from './messages.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  if (!secret) return new Response('Email hook is not configured', { status: 503 });
  let payload;
  try {
    payload = new Webhook(secret.replace(/^v1,whsec_/, '')).verify(await req.text(), Object.fromEntries(req.headers));
  } catch {
    return new Response('Invalid webhook signature', { status: 401 });
  }
  try {
    const appUrl = Deno.env.get('PORTAL_APP_URL') || 'https://sugarmamacookieco.com.au';
    const origins = (Deno.env.get('PORTAL_ALLOWED_ORIGINS') || appUrl).split(',').map(value => value.trim());
    const messages = authMessages(payload as Parameters<typeof authMessages>[0], Deno.env.get('SUPABASE_URL')!, appUrl, origins);
    for (const message of messages) await sendMail(message);
    return Response.json({});
  } catch {
    // Auth payloads contain login tokens. Never log payloads or provider responses.
    console.error('Auth email delivery failed; check Zoho server configuration');
    return Response.json({ error: { http_code: 500, message: 'Unable to send authentication email' } }, { status: 500 });
  }
});
