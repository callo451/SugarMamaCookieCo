import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const url = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const appUrl = Deno.env.get("PORTAL_APP_URL");
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("PORTAL_ALLOWED_ORIGINS") || appUrl || "")
    .split(",")
    .map((s) => s.trim());
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);
  if (origin && !allowed.includes(origin))
    return respond({ error: "Origin not allowed" }, 403);
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) return respond({ error: "Sign in required" }, 401);
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) return respond({ error: "Sign in required" }, 401);
  const { data: owner, error: ownerError } = await admin
    .from("portal_members")
    .select("role,active")
    .eq("user_id", user.id)
    .single();
  if (ownerError || owner?.role !== "owner" || !owner.active)
    return respond({ error: "Only the owner can manage users" }, 403);
  try {
    const { action, email, userId } = await req.json();
    if (action === "list") {
      const { data, error } = await admin
        .from("portal_members")
        .select("*")
        .order("invited_at");
      if (error) throw error;
      return respond({ members: data });
    }
    if (action === "invite") {
      if (!appUrl)
        return respond(
          { error: "Invitation redirect URL is not configured" },
          503,
        );
      if (
        typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      )
        return respond({ error: "Enter a valid email address" }, 400);
      const normalized = email.trim().toLowerCase();
      const { data: existing, error: lookupError } = await admin
        .from("portal_members")
        .select("user_id")
        .eq("email", normalized)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing)
        return respond(
          {
            error:
              "This person already has a team record. Use restore access or password reset.",
          },
          409,
        );
      const { data, error } = await admin.auth.admin.inviteUserByEmail(
        normalized,
        {
          redirectTo: `${(allowed.includes(origin) ? origin : appUrl).replace(/\/$/, "")}/admin/set-password`,
        },
      );
      if (error || !data.user)
        return respond(
          { error: error?.message || "Could not send invitation" },
          400,
        );
      const { error: memberError } = await admin.from("portal_members").insert({
        user_id: data.user.id,
        email: normalized,
        role: "staff",
        active: true,
        invited_by: user.id,
      });
      if (memberError)
        return respond(
          {
            error:
              "Invitation sent, but access could not be assigned. Contact the owner to complete setup.",
          },
          500,
        );
      return respond({ ok: true });
    }
    if (action === "revoke" || action === "restore") {
      if (typeof userId !== "string" || userId === user.id)
        return respond({ error: "You cannot change your own access" }, 400);
      const { data: target, error } = await admin
        .from("portal_members")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (error || !target) return respond({ error: "User not found" }, 404);
      if (target.role === "owner")
        return respond({ error: "Owner access cannot be changed here" }, 403);
      const { error: updateError } = await admin
        .from("portal_members")
        .update({ active: action === "restore" })
        .eq("user_id", userId)
        .eq("role", "staff");
      if (updateError) throw updateError;
      if (action === "revoke")
        await admin
          .from("portal_push_subscriptions")
          .delete()
          .eq("user_id", userId);
      return respond({ ok: true });
    }
    return respond({ error: "Unknown action" }, 400);
  } catch {
    return respond(
      { error: "The request could not be completed. Please try again." },
      500,
    );
  }
});
