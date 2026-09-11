import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { usePortalAuth } from "../../auth/PortalAuth";
interface Activity {
  id: number;
  order_id: string | null;
  title: string;
  body: string;
  created_at: string;
}
export default function Activity() {
  const { user } = usePortalAuth();
  const [events, setEvents] = useState<Activity[]>([]);
  const [read, setRead] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) return;
    const [activity, receipts] = await Promise.all([
      supabase
        .from("portal_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("portal_event_reads")
        .select("event_id")
        .eq("user_id", user.id),
    ]);
    if (activity.error || receipts.error)
      setError(
        "Activity could not be loaded. Check the connection and database setup.",
      );
    else {
      setEvents(activity.data || []);
      setRead((receipts.data || []).map((r) => r.event_id));
      setError("");
    }
    setLoading(false);
  }, [user]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);
  async function mark(id: number) {
    if (!user) return;
    const { error } = await supabase
      .from("portal_event_reads")
      .upsert(
        { user_id: user.id, event_id: id },
        { onConflict: "user_id,event_id", ignoreDuplicates: true },
      );
    if (error) setError("Could not mark the notification as read.");
    else setRead((r) => [...r, id]);
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">KEEPING YOU IN THE LOOP</p>
          <h1>Activity</h1>
          <p className="muted">The latest changes in your order book.</p>
        </div>
        <Link
          className="studio-button secondary"
          to="/admin/settings?tab=notifications"
        >
          Notification settings
        </Link>
      </div>
      {error && (
        <div className="studio-error" role="alert">
          {error}
          <button onClick={load}>Retry</button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading activity…</p>
      ) : (
        <div className="studio-panel activity-list">
          {events.length
            ? events.map((e) => (
                <div
                  key={e.id}
                  className={`activity-item ${read.includes(e.id) ? "" : "unread"}`}
                >
                  <Bell size={17} />
                  <Link
                    to={
                      e.order_id
                        ? `/admin/orders/${e.order_id}`
                        : "/admin/orders"
                    }
                    onClick={() => void mark(e.id)}
                  >
                    <strong>{e.title}</strong>
                    <p>{e.body}</p>
                  </Link>
                  <time>
                    {new Date(e.created_at).toLocaleString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {!read.includes(e.id) && (
                    <button onClick={() => mark(e.id)}>Mark read</button>
                  )}
                </div>
              ))
            : !error && (
                <div className="studio-empty">
                  <h3>A fresh page.</h3>
                  <p>New orders and changes will appear here as they happen.</p>
                </div>
              )}
        </div>
      )}
    </div>
  );
}
