import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Email service is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { name, email, message } = await req.json();

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and message are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Sugar Mama Cookie Co <no-reply@sugarmamacookieco.com.au>';
    const toEmail = 'hello@sugarmamacookieco.com.au';

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney',
    });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #6B7F6B; padding: 32px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">
            New Contact Message
          </h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">
            Received ${formattedDate}
          </p>
        </div>

        <div style="padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">Name</span>
                <p style="margin: 4px 0 0; font-size: 16px; color: #111827;">${escapeHtml(name)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">Email</span>
                <p style="margin: 4px 0 0; font-size: 16px; color: #111827;">
                  <a href="mailto:${escapeHtml(email)}" style="color: #6B7F6B; text-decoration: none;">${escapeHtml(email)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">Message</span>
                <p style="margin: 4px 0 0; font-size: 16px; color: #111827; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
              </td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
            <a href="mailto:${escapeHtml(email)}?subject=Re: Your message to Sugar Mama Cookie Co"
               style="display: inline-block; background: #6B7F6B; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
              Reply to ${escapeHtml(name)}
            </a>
          </div>
        </div>

        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">
          Sent from the Sugar Mama Cookie Co website contact form
        </p>
      </div>
    `;

    console.log(`[${now.toISOString()}] Sending contact message from ${email}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `New message from ${name} — Sugar Mama Cookie Co`,
        html: htmlBody,
        reply_to: email,
      }),
    });

    const responseBody = await res.json();

    if (!res.ok) {
      console.error(`Resend API error (${res.status}):`, responseBody);
      return new Response(
        JSON.stringify({ error: 'Failed to send message. Please try again.' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Contact email sent successfully. Resend ID: ${responseBody.id}`);

    return new Response(
      JSON.stringify({ message: 'Message sent successfully', id: responseBody.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Error processing contact message:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/** Escape HTML to prevent injection in email content */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
