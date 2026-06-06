self.addEventListener("push", (event) => {
  let payload = { title: "Loan payment due", body: "An installment is due today." };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Loan payment due", {
      body: payload.body,
      icon: "/favicon.ico",
      data: { url: payload.url ?? "/loans" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/loans";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
