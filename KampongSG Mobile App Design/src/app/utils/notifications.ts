export type AppNotificationPayload = {
  title: string;
  body?: string;
};

export function notifyInApp(title: string, body?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AppNotificationPayload>('helplah:notification', {
    detail: { title, body }
  }));
}

export function notifyInBrowser(title: string, body?: string) {
  notifyInApp(title, body);

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  new Notification(title, body ? { body } : undefined);
  return true;
}

export const notifyUser = notifyInBrowser;
