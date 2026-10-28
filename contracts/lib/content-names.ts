/** Canonical mascot spelling, including CMS documents saved before the rename. */
export function normalizeContentNames<T>(value: T): T {
  if (typeof value === 'string') {
    if (value === '/zack.png') return '/zach.png' as T;
    // Historical uploaded image URLs must continue pointing to their original objects.
    if (/^(?:https?:\/\/|\/)/i.test(value)) return value;
    return value.replace(/(?:https?:\/\/|\/(?:api|content)\/)[^\s"'<>]+|\bzack\b/gi, name => /^(?:https?:\/\/|\/)/i.test(name) ? name : name === name.toUpperCase() ? 'ZACH' : name[0] === 'Z' ? 'Zach' : 'zach') as T;
  }
  if (Array.isArray(value)) return value.map(item => normalizeContentNames(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(source).flatMap(([key, item]) => {
    const canonical = key.replace(/zack/gi, name => name[0] === 'Z' ? 'Zach' : 'zach');
    if (canonical !== key && Object.hasOwn(source, canonical)) return [];
    return [[canonical, normalizeContentNames(item)]];
  })) as T;
}
