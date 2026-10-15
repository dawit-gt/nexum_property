import { apiDeleteWithBody, apiGet, apiPost } from './api-client';

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getCurrentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications were blocked. Allow them in your browser or phone settings.');
  }

  const { publicKey } = await apiGet<{ publicKey?: string }>('/push/vapid-public-key');
  if (!publicKey) throw new Error('Push notifications are not configured on the server yet.');

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  await apiPost('/push/subscribe', {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: navigator.userAgent.slice(0, 255),
  });
}

export async function disablePush() {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  await apiDeleteWithBody('/push/unsubscribe', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}