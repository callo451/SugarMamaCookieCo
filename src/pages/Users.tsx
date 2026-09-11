import { FormEvent, useCallback, useEffect, useState } from "react";
import { usePortalAuth } from "../auth/PortalAuth";
import { supabase } from "../lib/supabase";
interface Member {
  user_id: string;
  email: string;
  role: "owner" | "staff";
  active: boolean;
  invited_at: string;
}
async function teamAction(body: object) {
  const { data, error } = await supabase.functions.invoke("manage-team", {
    body,
  });
  if (error) {
    let message =
      "User management is unavailable. Please check the Supabase function setup.";
    try {
      const payload = await error.context.json();
      message = payload.error || message;
    } catch {
      /* Transport errors have no JSON response. */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export default function Users() {
  const { role } = usePortalAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<Member | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teamAction({ action: "list" });
      setMembers(data.members);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (role === "owner") void load();
  }, [role, load]);
  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await teamAction({ action: "invite", email });
      setEmail("");
      setMessage(
        "Invitation sent. They can use the email link to choose their password.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invitation failed");
    } finally {
      setBusy(false);
    }
  }
  async function change(member: Member, action: "revoke" | "restore") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await teamAction({ action, userId: member.user_id });
      setRevoking(null);
      setMessage(
        action === "revoke"
          ? "Access removed. Order history is preserved."
          : "Access restored.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update access");
    } finally {
      setBusy(false);
    }
  }
  if (role !== "owner")
    return (
      <div className="settings-section">
        <h2>Users</h2>
        <p className="muted">
          Only the owner can invite users or change access.
        </p>
      </div>
    );
  return (
    <section className="settings-section">
      <h2>A small, trusted team.</h2>
      <p className="muted">
        Invite someone to manage orders and customers. Only you can manage user
        access. There is no public registration.
      </p>
      <form className="team-form" onSubmit={invite}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </label>
        <button className="studio-button" disabled={busy}>
          Send invitation
        </button>
      </form>
      {error && (
        <p className="studio-error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {message && (
        <p className="studio-notice" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Loading users…</p>
      ) : (
        <div className="table-scroll">
          <table className="studio-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Access</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.email}</td>
                  <td>{m.role === "owner" ? "Owner" : "Staff"}</td>
                  <td>{m.active ? "Enabled" : "Removed"}</td>
                  <td>
                    {m.role === "owner" ? (
                      <span className="muted">Protected</span>
                    ) : (
                      <button
                        disabled={busy}
                        className="text-button"
                        onClick={() =>
                          m.active ? setRevoking(m) : change(m, "restore")
                        }
                      >
                        {m.active ? "Remove access" : "Restore access"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {revoking && (
        <div
          className="studio-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) setRevoking(null);
          }}
        >
          <div>
            <h2 id="remove-title">Remove access?</h2>
            <p>
              {revoking.email} will no longer be able to use the workspace.
              Their order history will stay intact.
            </p>
            <button
              className="studio-button danger"
              disabled={busy}
              onClick={() => change(revoking, "revoke")}
            >
              Remove access
            </button>{" "}
            <button
              autoFocus
              className="studio-button secondary"
              disabled={busy}
              onClick={() => setRevoking(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
