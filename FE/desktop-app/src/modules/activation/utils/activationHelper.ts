export function maskLicenseKey(key?: string): string {
  if (!key) return "";
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}-****-****-${key.slice(-4)}`;
}
