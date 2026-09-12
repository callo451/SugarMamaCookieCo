import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePortalAuth } from "../../auth/PortalAuth";
export default function NotificationSettings() {
  const { user } = usePortalAuth();
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newOrders, setNewOrders] = useState(true);
  const [updates, setUpdates] = useState(true);
  const [customerMessages, setCustomerMessages] = useState(true);
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  useEffect(() => {
    if (!supported || !user) return;
    let alive = true;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/admin-sw.js",
          { scope: "/admin" },
        );
        const sub = await registration.pushManager.getSubscription();
        if (!alive) return;
        setSubscription(sub);
        if (sub) {
          const { data, error } = await supabase
            .from("portal_push_subscriptions")
            .select("new_orders,order_updates,customer_messages")
            .eq("endpoint", sub.endpoint)
            .eq("user_id", user.id)
            .maybeSingle();
          if (error) throw error;
          if (alive && data) {
            setRegistered(true);
            setNewOrders(data.new_orders);
            setUpdates(data.order_updates);
            setCustomerMessages(data.customer_messages);
          }
        }
      } catch {
        if (alive)
          setError(
            "Could not check notification settings. Refresh to try again.",
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [supported, user]);
  async function enable() {
    if (!user) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications are not allowed. Enable them in your browser or device settings, then try again.",
        );
      const registration = await navigator.serviceWorker.register(
        "/admin-sw.js",
        { scope: "/admin" },
      );
      await navigator.serviceWorker.ready;
      const bytes = Uint8Array.from(
        atob(key.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      const sub =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        }));
      const json = sub.toJSON();
      const { error } = await supabase
        .from("portal_push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            new_orders: newOrders,
            order_updates: updates,
            customer_messages: customerMessages,
          },
          { onConflict: "endpoint" },
        );
      if (error)
        throw new Error(
          "The device could not be registered. Check that notification setup is complete.",
        );
      setSubscription(sub);
      setRegistered(true);
      setMessage("This device will receive your selected order notifications.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Notifications could not be enabled",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!subscription || !user) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { error } = await supabase
      .from("portal_push_subscriptions")
      .update({ new_orders: newOrders, order_updates: updates, customer_messages: customerMessages })
      .eq("endpoint", subscription.endpoint)
      .eq("user_id", user.id);
    if (error) setError("Could not save preferences.");
    else setMessage("Preferences saved for this device.");
    setBusy(false);
  }
  async function disable() {
    if (!subscription || !user) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase
        .from("portal_push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint)
        .eq("user_id", user.id);
      if (error) throw error;
      await subscription.unsubscribe();
      setSubscription(null);
      setRegistered(false);
      setMessage("Notifications turned off on this device.");
    } catch {
      setError("Could not turn off notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <h2>Stay in the loop.</h2>
      <p className="muted">
        Receive an alert when an order comes in, changes, or a customer sends a message. Settings apply to
        this device. You can always find updates in Activity.
      </p>
      {ios && !standalone && (
        <div className="studio-notice">
          On iPhone or iPad, open the portal in Safari, tap Share → Add to Home
          Screen, then open it from the new icon to enable notifications.
        </div>
      )}
      {!supported && (
        <p className="studio-notice">
          Push notifications aren’t available in this browser. Your order
          activity is still available in the workspace.
        </p>
      )}
      {!key && (
        <p className="studio-notice">
          Device notifications are awaiting server setup. Activity will work
          once the database update is applied.
        </p>
      )}
      <div className="settings-row">
        <div>
          <p>New orders</p>
          <small>When a customer submits an order or quote.</small>
        </div>
        <input
          aria-label="Notify me about new orders"
          type="checkbox"
          checked={newOrders}
          onChange={(e) => setNewOrders(e.target.checked)}
        />
      </div>
      <div className="settings-row">
        <div>
          <p>Order updates</p>
          <small>
            Status, collection date, quantity, price or design changes.
          </small>
        </div>
        <input
          aria-label="Notify me about order updates"
          type="checkbox"
          checked={updates}
          onChange={(e) => setUpdates(e.target.checked)}
        />
      </div>
      <div className="settings-row"><div><p>Customer messages</p><small>New messages and replies from customers. Email alerts also go to the bakery inbox.</small></div><input aria-label="Notify me about customer messages" type="checkbox" checked={customerMessages} onChange={e=>setCustomerMessages(e.target.checked)}/></div>
      <div className="settings-row">
        <div>
          <p>This device</p>
          <small>
            {registered ? "Notifications enabled" : "Notifications off"}
          </small>
        </div>
        {registered ? (
          <button
            className="studio-button secondary"
            disabled={busy}
            onClick={disable}
          >
            Turn off
          </button>
        ) : (
          <button
            className="studio-button"
            disabled={busy || !supported || !key || (ios && !standalone)}
            onClick={enable}
          >
            Enable notifications
          </button>
        )}
      </div>
      {registered && (
        <button className="studio-button" disabled={busy} onClick={save}>
          Save preferences
        </button>
      )}
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="studio-notice">
          {message}
        </p>
      )}
    </section>
  );
}
