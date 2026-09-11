// No caching of authenticated pages or customer data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* Use a safe generic notification. */
  }
  const path =
    typeof data.url === "string" && /^\/admin(?:\/|$)/.test(data.url)
      ? data.url
      : "/admin/activity";
  event.waitUntil(
    self.registration.showNotification(data.title || "Sugar Mama update", {
      body: data.body || "There’s an update in your workspace.",
      tag: data.tag || "sugar-mama",
      icon: "/admin-icon-192.png",
      badge: "/admin-icon-192.png",
      data: { url: path },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/admin/activity",
    self.location.origin,
  );
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        for (const client of clients) {
          if (new URL(client.url).origin === target.origin) {
            await client.navigate(target.href);
            return client.focus();
          }
        }
        return self.clients.openWindow(target.href);
      }),
  );
});
