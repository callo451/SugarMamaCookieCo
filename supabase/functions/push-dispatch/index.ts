import { dispatchOrderEmails } from './order-emails.ts';
import { dispatchMessageEmails } from './message-emails.ts';
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
// Only recognised push services are allowed, preventing subscriptions from becoming an SSRF primitive.
const pushHosts = [
  "web.push.apple.com",
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "updates-autopush.stage.mozaws.net",
  "wns.windows.com",
];
function validEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      pushHosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h))
    );
  } catch {
    return false;
  }
}
Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (
    req.method !== "POST" ||
    !secret ||
    req.headers.get("x-dispatch-secret") !== secret
  )
    return new Response("Unauthorized", { status: 401 });
  const emailResult = await dispatchMessageEmails(admin);
  const orderEmailResult = await dispatchOrderEmails(admin);
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY"),
    privateKey = Deno.env.get("VAPID_PRIVATE_KEY"),
    subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject)
    return new Response("Push not configured", { status: 503 });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: jobs, error } = await admin.rpc("claim_portal_push_jobs");
  if (error) return new Response("Could not claim jobs", { status: 500 });
  let failed = emailResult.failed + orderEmailResult.failed;
  for (const event of jobs || []) {
    let success = true;
    const { data: subscriptions, error: subError } = await admin
      .from("portal_push_subscriptions")
      .select("*");
    if (subError) {
      await admin.rpc("finish_portal_push_job", {
        job_id: event.id,
        succeeded: false,
      });
      failed++;
      continue;
    }
    for (const sub of subscriptions || []) {
      if (event.kind === "customer_message" ? !sub.customer_messages : event.kind === "new_order" ? !sub.new_orders : !sub.order_updates)
        continue;
      if (!validEndpoint(sub.endpoint)) {
        await admin.from("portal_push_subscriptions").delete().eq("id", sub.id);
        continue;
      }
      const { data: member, error: memberError } = await admin
        .from("portal_members")
        .select("active")
        .eq("user_id", sub.user_id)
        .maybeSingle();
      if (memberError) {
        success = false;
        continue;
      }
      if (!member?.active) continue;
      const { data: sent, error: sentError } = await admin
        .from("portal_push_deliveries")
        .select("event_id")
        .eq("event_id", event.id)
        .eq("subscription_id", sub.id)
        .maybeSingle();
      if (sentError) {
        success = false;
        continue;
      }
      if (sent) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: event.title,
            body: event.body,
            tag: `order-event-${event.id}`,
            url: event.order_id
              ? `/admin/orders/${event.order_id}${event.kind === "customer_message" ? "#conversation" : ""}`
              : "/admin/activity",
          }),
          { TTL: 3600, timeout: 10000 },
        );
        const { error: recordError } = await admin
          .from("portal_push_deliveries")
          .insert({ event_id: event.id, subscription_id: sub.id });
        if (recordError) success = false;
      } catch (e) {
        if (typeof e === 'object' && e !== null && 'statusCode' in e && (e.statusCode === 404 || e.statusCode === 410))
          await admin
            .from("portal_push_subscriptions")
            .delete()
            .eq("id", sub.id);
        else success = false;
      }
    }
    const { error: finishError } = await admin.rpc("finish_portal_push_job", {
      job_id: event.id,
      succeeded: success,
    });
    if (!success || finishError) failed++;
  }
  return new Response(
    JSON.stringify({ processed: jobs?.length || 0, emails: emailResult, failed }),
    {
      headers: { "Content-Type": "application/json" },
      status: failed ? 207 : 200,
    },
  );
});
