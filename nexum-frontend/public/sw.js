const CACHE = 'nexum-shell-v1';
const BADGE_CACHE = 'nexum-badge';
const BADGE_KEY = '/__badge';
const OFFLINE_URL = '/offline.html';

// ---- App icon badge (the red dot / number on the installed app icon) ----
// The service worker can't ask the API for the real unread count (it has no
// login token), so it keeps its own counter in Cache Storage. The open app
// overwrites this counter with the true number every time it syncs.

async function readBadge() {
  const cache = await caches.open(BADGE_CACHE);
  const res = await cache.match(BADGE_KEY);
  return res ? Number(await res.text()) || 0 : 0;
}

async function writeBadge(count) {
  const cache = await caches.open(BADGE_CACHE);
  await cache.put(BADGE_KEY, new Response(String(count)));
}

async function bumpBadge() {
  try {
    const next = (await readBadge()) + 1;
    await writeBadge(next);
    if (self.navigator && 'setAppBadge' in self.navigator) {
      await self.navigator.setAppBadge(next);
    }
  } catch {
    // Badging is a nicety; never let it break the notification.
  }
}

// ---- Lifecycle ----

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE && k !== BADGE_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Only page navigations get an offline fallback. API calls are never cached.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

// ---- Push notifications ----

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'Nexum', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        data: { url: data.url || '/' },
      }),
      bumpBadge(),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          try {
            await client.navigate(url);
          } catch {}
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
