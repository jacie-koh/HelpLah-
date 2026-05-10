export function notifyInBrowser(title: string, body?: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  new Notification(title, body ? { body } : undefined);
  return true;
}
