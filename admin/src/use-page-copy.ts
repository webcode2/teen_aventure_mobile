import { normalizeContentNames } from '@askhub/puzzle-contracts';
import { normalizeContactEmails } from './contact-emails';
import { useEffect, useState } from 'react';
import { publicApi } from './api';
import { PUBLIC_PAGE_COPY } from './public-page-copy';
import { mergeCms } from './cms-fields';

export function usePageCopy<K extends keyof typeof PUBLIC_PAGE_COPY>(section: K, supplied?: Record<string, string>): typeof PUBLIC_PAGE_COPY[K] {
  const [remote, setRemote] = useState<unknown>();
  useEffect(() => {
    if (supplied) return;
    let cancelled = false;
    publicApi<Record<string, unknown>>('/api/content/web').then(data => { if (!cancelled) setRemote(data?.[section]); }).catch(() => {});
    return () => { cancelled = true; };
  }, [section, supplied]);
  const value = normalizeContentNames(supplied ?? remote);
  return mergeCms(PUBLIC_PAGE_COPY[section], section === 'contactPage' ? normalizeContactEmails(value) : value);
}
