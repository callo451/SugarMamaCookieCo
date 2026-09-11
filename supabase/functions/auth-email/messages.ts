type Payload = {
  user: { email: string; new_email?: string };
  email_data: { email_action_type: string; token?: string; token_hash?: string; token_hash_new?: string; redirect_to?: string };
};
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const titles: Record<string, string> = {
  recovery: 'Reset your password', invite: 'You’re invited to Sugar Mama',
  signup: 'Confirm your email', magiclink: 'Sign in to Sugar Mama',
  email: 'Confirm your email', email_change: 'Confirm your email change',
};

export function authMessages(payload: Payload, supabaseUrl: string, appUrl: string, allowedOrigins: string[]) {
  const { user, email_data: data } = payload;
  const action = data.email_action_type;
  const wrap = (subject: string, content: string, to = user.email) => ({
    to, subject: `${subject} · Sugar Mama Cookie Co`,
    html: `<div style="font-family:Arial,sans-serif;color:#29382e;max-width:560px;margin:32px auto;padding:32px;background:#f7f5ef"><p>SUGAR MAMA COOKIE CO</p><h1 style="font-size:26px">${escape(subject)}</h1>${content}<p style="font-size:13px;margin-top:32px">Sugar Mama Cookie Co</p></div>`,
  });
  if (action === 'reauthentication') {
    if (!/^\d{6,10}$/.test(data.token || '')) throw new Error('Missing verification code');
    return [wrap('Your verification code', `<p>Enter this code to continue: <strong>${data.token}</strong></p>`)];
  }
  const notices: Record<string, string> = {
    password_changed_notification: 'Your password was changed', email_changed_notification: 'Your email address was changed',
    phone_changed_notification: 'Your phone number was changed', identity_linked_notification: 'A sign-in method was linked',
    identity_unlinked_notification: 'A sign-in method was removed', mfa_factor_enrolled_notification: 'Two-step verification was added',
    mfa_factor_unenrolled_notification: 'Two-step verification was removed',
  };
  if (notices[action]) return [wrap(notices[action], '<p>If you did not make this change, contact the portal owner immediately.</p>')];
  if (!titles[action] || !data.token_hash) throw new Error('Unsupported or incomplete auth email');
  const redirect = new URL(data.redirect_to || '/admin/set-password', appUrl);
  if (!allowedOrigins.includes(redirect.origin) || redirect.username || redirect.password) throw new Error('Unapproved auth redirect');
  const message = (to: string, hash: string) => {
    const link = new URL('/auth/v1/verify', supabaseUrl);
    link.searchParams.set('token', hash);
    link.searchParams.set('type', action);
    link.searchParams.set('redirect_to', redirect.href);
    return wrap(titles[action], `<p>Follow this link to continue. This link can only be used once.</p><p><a style="color:#36593e" href="${escape(link.href)}">${escape(titles[action])}</a></p><p>If you weren’t expecting this email, you can ignore it.</p>`, to);
  };
  if (action === 'email_change') {
    if (!user.new_email) throw new Error('Missing new email');
    return [...(data.token_hash_new ? [message(user.email, data.token_hash_new)] : []), message(user.new_email, data.token_hash)];
  }
  return [message(user.email, data.token_hash)];
}
