// Push notification & offline alarm click handler imported by Workbox SW
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {
    title: 'ALERTĂ SEISMICĂ',
    body: 'Eveniment seismic detectat (M ≥ 3.0 Richter).',
    url: '/?tab=map',
    magnitude: 3.0,
    tag: 'seismic-alert',
    alertTier: 'ro_standard',
    isMajorRomania: false,
    sound: null,
    vibrate: [400, 150, 400, 150, 700],
  };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  const isMajorRo = payload.alertTier === 'ro_major_55' || Boolean(payload.isMajorRomania);

  const options = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: isMajorRo
      ? [500, 120, 500, 120, 500, 120, 900, 150, 900]
      : payload.vibrate || [400, 150, 400, 150, 700],
    tag: payload.tag || (isMajorRo ? 'ro-major-quake-55' : 'seismic-alert'),
    renotify: true,
    requireInteraction: true,
    silent: false,
    ...(isMajorRo ? { sound: payload.sound || '/sounds/ro-major-quake-55.wav' } : {}),
    data: {
      url: payload.url || (isMajorRo ? '/?tab=map&majorAlarm=1' : '/?tab=map'),
      eventData: payload,
      isMajorRomania: isMajorRo,
    },
    actions: [
      { action: 'open-map', title: isMajorRo ? 'Sirenă & Epicentru' : 'Vezi Epicentru' },
      { action: 'open-safety', title: 'Plan Siguranță' },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, options),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'SEISMIC_PUSH_ALARM',
              payload,
              isMajorRomania: isMajorRo,
            });
          }
        }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const isMajorRo = Boolean(event.notification.data?.isMajorRomania);
  const eventData = event.notification.data?.eventData || null;
  const targetUrl =
    event.action === 'open-safety'
      ? '/?tab=safety'
      : event.action === 'open-map'
      ? isMajorRo
        ? '/?tab=map&majorAlarm=1'
        : '/?tab=map'
      : event.notification.data?.url || (isMajorRo ? '/?tab=map&majorAlarm=1' : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: event.action,
            targetUrl,
            isMajorRomania: isMajorRo,
            eventData,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
