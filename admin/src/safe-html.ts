import DOMPurify from 'dompurify';

/**
 * CMS page HTML is sanitized on save, but pages stored before that (and unsaved
 * previews) are not, so every render goes through DOMPurify as well.
 */
export function safePageHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'object', 'embed', 'iframe', 'base'],
    FORBID_ATTR: ['style'],
  });
}

const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

/**
 * CMS-edited link targets: absolute http(s)/mailto/tel, or a same-site path.
 * Anything else (javascript:, data:, protocol-relative //host) falls back.
 */
export function safeHref(href: string | null | undefined, fallback = '#'): string {
  const value = (href ?? '').trim();
  // Browsers drop tabs/newlines inside URLs (`/\t/evil` → `//evil`); refuse them outright.
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  return SAFE_HREF.test(value) ? value : fallback;
}
