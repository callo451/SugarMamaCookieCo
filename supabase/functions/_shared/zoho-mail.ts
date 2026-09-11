// Server-only Zoho Mail transport. Never put OAuth credentials in VITE_* variables.
type Mail = { to: string | string[]; subject: string; html: string };
let cached: { token: string; expires: number } | undefined;
let refreshing: Promise<string> | undefined;
const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
};

function region() {
  const suffix = Deno.env.get('ZOHO_REGION') || 'com.au';
  if (!['com', 'com.au', 'eu', 'in', 'jp', 'ca', 'sa', 'com.cn'].includes(suffix)) {
    throw new Error('Invalid ZOHO_REGION');
  }
  return suffix;
}

async function accessToken() {
  if (cached && cached.expires > Date.now()) return cached.token;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const response = await fetch(`https://accounts.zoho.${region()}/oauth/v2/token`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(3500),
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: required('ZOHO_CLIENT_ID'),
        client_secret: required('ZOHO_CLIENT_SECRET'),
        refresh_token: required('ZOHO_REFRESH_TOKEN'),
      }),
    });
    const data = await response.json();
    if (!response.ok || typeof data.access_token !== 'string') {
      throw new Error('Zoho OAuth refresh failed; check server credentials');
    }
    cached = { token: data.access_token, expires: Date.now() + Math.max(0, Number(data.expires_in || 3600) - 60) * 1000 };
    return cached.token;
  })();
  try { return await refreshing; } finally { refreshing = undefined; }
}

export async function sendMail(mail: Mail): Promise<{ id?: string }> {
  const account = required('ZOHO_ACCOUNT_ID');
  const from = required('ZOHO_FROM_EMAIL');
  const recipients = Array.isArray(mail.to) ? mail.to : [mail.to];
  if (!recipients.length || recipients.some(address => !/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(address))) {
    throw new Error('Invalid email recipient');
  }
  const token = await accessToken();
  const response = await fetch(`https://mail.zoho.${region()}/api/accounts/${encodeURIComponent(account)}/messages`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(3500),
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromAddress: from, toAddress: recipients.join(','), subject: mail.subject, content: mail.html, mailFormat: 'html', encoding: 'UTF-8' }),
  });
  // Never retry an ambiguous send: the provider may already have accepted it.
  if (response.status === 401) cached = undefined;
  const data = await response.json();
  if (!response.ok || Number(data.status?.code) !== 200) {
    throw new Error(`Zoho Mail rejected delivery (HTTP ${response.status})`);
  }
  return { id: data.data?.messageId };
}

// Preserve existing function response contracts while centralizing the sender.
// Zoho's send API has no documented per-message Reply-To option; contact emails
// retain their existing mailto reply links in the body.
export async function mailResponse(mail: Mail & { from?: string; reply_to?: string }): Promise<Response> {
  try {
    return Response.json(await sendMail(mail));
  } catch {
    return Response.json({ error: 'Email delivery failed. Check Zoho server configuration.' }, { status: 502 });
  }
}
