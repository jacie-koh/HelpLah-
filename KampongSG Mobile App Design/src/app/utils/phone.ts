export function phoneHref(phoneNumber?: string | null) {
  const normalized = String(phoneNumber || '').replace(/[^+\d]/g, '');
  return normalized ? `tel:${normalized}` : '';
}

export function callPhoneNumber(phoneNumber?: string | null) {
  const href = phoneHref(phoneNumber);
  if (!href) return false;
  window.location.href = href;
  return true;
}
