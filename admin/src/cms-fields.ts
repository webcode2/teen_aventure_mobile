export type CmsObject = { [key: string]: string | boolean | number | CmsObject | CmsObject[] | string[] };
export type CmsField = { path: string[]; label: string; value: string | boolean | number };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Merge nested documents without dropping sibling fields from older payloads. */
export function mergeCms<T>(defaults: T, value: unknown): T {
  if (Array.isArray(defaults)) return (Array.isArray(value) ? value.map(item => defaults.length ? mergeCms(defaults[0], item) : item) : defaults) as T;
  if (!record(defaults)) return (typeof defaults === typeof value ? value : defaults) as T;
  if (!record(value)) return defaults;
  const next = { ...defaults } as Record<string, unknown>;
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    next[key] = key in next ? mergeCms(next[key], item) : item;
  }
  return next as T;
}

export function cmsFields(value: unknown, path: string[] = []): CmsField[] {
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return [{ path, label: path.map(k => /^\d+$/.test(k) ? `Item ${+k + 1}` : k.replace(/([a-z])([A-Z])/g, '$1 $2')).join(' / '), value }];
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, item]) => cmsFields(item, [...path, key]));
}

export function setCmsField<T>(source: T, path: string[], value: unknown): T {
  const next = structuredClone(source);
  let target: any = next;
  for (const key of path.slice(0, -1)) target = target[key];
  target[path[path.length - 1]] = value;
  return next;
}

export function validateCms(content: unknown): string[] {
  return cmsFields(content).flatMap(field => {
    const text = String(field.value).trim();
    if (/email$/i.test(field.path.at(-1) ?? '') && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return [`${field.label}: enter a valid email address.`];
    if (/(?:Url|Href)$/.test(field.path.at(-1) ?? '') && text && !text.startsWith('/') && !text.startsWith('#')) {
      try { if (!['https:', 'http:'].includes(new URL(text).protocol)) throw new Error(); }
      catch { return [`${field.label}: use an HTTPS URL or a site-relative path.`]; }
    }
    return [];
  });
}

export function cmsLists(value: unknown, path: string[] = []): Array<{ path: string[]; value: unknown[] }> {
  if (Array.isArray(value)) return [{ path, value }];
  if (!record(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => cmsLists(item, [...path, key]));
}

/** Public content may predate client validation; reject executable URL schemes. */
export function safeCmsUrl(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^(https?:\/\/|\/(?!\/)|#)/i.test(value.trim()) ? value.trim() : fallback;
}
