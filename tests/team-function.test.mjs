import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
const source = await readFile(
  new URL("../supabase/functions/manage-team/index.ts", import.meta.url),
  "utf8",
);
let handler;
let actorRole = "owner";
let actorActive = true;
let inviteCount = 0;
let updateCount = 0;
const mock = {
  auth: {
    getUser: async (token) => ({
      data: { user: token === "valid" ? { id: "owner" } : null },
      error: token === "valid" ? null : {},
    }),
    admin: {
      inviteUserByEmail: async () => {
        inviteCount++;
        return { data: { user: { id: "invited" } } };
      },
    },
  },
  from: () => {
    let id,
      op = "select";
    const chain = {
      select: () => chain,
      eq: (_key, v) => {
        id = v;
        return chain;
      },
      ilike: () => chain,
      order: async () => ({ data: [] }),
      maybeSingle: async () => ({ data: null }),
      single: async () => ({
        data:
          id === "owner"
            ? { role: actorRole, active: actorActive }
            : { role: id === "another-owner" ? "owner" : "staff" },
      }),
      insert: async () => ({ error: null }),
      update: () => {
        op = "update";
        return chain;
      },
      delete: () => chain,
      then: (resolve) => {
        if (op === "update") updateCount++;
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
    return chain;
  },
};
globalThis.__testCreateClient = () => mock;
globalThis.Deno = {
  env: {
    get: (key) =>
      ({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
        PORTAL_APP_URL: "https://portal.example.test",
      })[key],
  },
  serve: (fn) => {
    handler = fn;
  },
};
const code = await transformWithEsbuild(
  source.replace(
    /import \{ createClient \} from [^;]+;/,
    "const createClient=globalThis.__testCreateClient;",
  ),
  "manage-team.ts",
  { loader: "ts", format: "esm" },
);
await import(
  `data:text/javascript;base64,${Buffer.from(code.code).toString("base64")}`
);
const request = (body, token = "valid") =>
  handler(
    new Request("https://example.test", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        origin: "https://portal.example.test",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
test("unauthenticated and staff cannot list or invite users", async () => {
  assert.equal((await request({ action: "list" }, "invalid")).status, 401);
  actorRole = "staff";
  assert.equal(
    (await request({ action: "invite", email: "x@example.test" })).status,
    403,
  );
  assert.equal(inviteCount, 0);
  actorRole = "owner";
});
test("revoked owner cannot manage users", async () => {
  actorActive = false;
  assert.equal((await request({ action: "list" })).status, 403);
  actorActive = true;
});
test("owner cannot remove themselves or another owner", async () => {
  assert.equal(
    (await request({ action: "revoke", userId: "owner" })).status,
    400,
  );
  assert.equal(
    (await request({ action: "revoke", userId: "another-owner" })).status,
    403,
  );
  assert.equal(updateCount, 0);
});
test("owner can invite staff and revoke staff access", async () => {
  assert.equal(
    (await request({ action: "invite", email: "new@example.test" })).status,
    200,
  );
  assert.equal(inviteCount, 1);
  assert.equal(
    (await request({ action: "revoke", userId: "staff" })).status,
    200,
  );
  assert.equal(updateCount, 1);
});
test("invalid invitation input rejected", async () => {
  assert.equal(
    (await request({ action: "invite", email: "not-an-email" })).status,
    400,
  );
  assert.equal(inviteCount, 1);
});
