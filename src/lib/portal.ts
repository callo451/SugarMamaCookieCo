import { supabase } from "./supabase";
export const money = (value: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    value || 0,
  );
export const statusLabel = (status: string) =>
  ({
    pending: "Awaiting confirmation",
    confirmed: "Confirmed",
    in_progress: "In the making",
    completed: "Completed",
    cancelled: "Cancelled",
  })[status] || status;

export async function stopDeviceNotifications() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration =
      await navigator.serviceWorker.getRegistration("/admin");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabase
        .from("portal_push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    }
  } catch {
    /* Signing out must remain available even when push is offline. */
  }
}
