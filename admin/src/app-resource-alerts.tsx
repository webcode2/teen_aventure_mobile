import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from './api';

type Resource = { key: string; label: string; url: string; status: string };
export function AppResourceAlerts({ refreshKey }: { refreshKey?: string | number }) {
  const [rows, setRows] = useState<Resource[]>([]);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    api<Resource[]>('/api/admin/app-resource-health').then(value => { if (active) setRows(Array.isArray(value) ? value : []); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [refreshKey, retry]);
  const missing = rows.filter(row => ['missing', 'unpublished', 'invalid'].includes(row.status));
  if (!missing.length && !error) return null;
  return <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-navy">
    <div className="flex items-center justify-between gap-3"><strong>{error ? 'App resource check unavailable' : 'App links need attention'}</strong><button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-10 px-2 font-semibold underline">Check again</button></div>
    {error ? <p>Could not verify app pages. Try again before publishing or deleting resources.</p> : <><ul className="mt-2 list-disc space-y-1 pl-5">{missing.map(row => <li key={row.key}>{row.label}: <span className="font-semibold">{row.status}</span> <span className="break-all text-muted">({row.url || 'No link configured'})</span></li>)}</ul><p className="mt-2">Publish the missing page or <Link to="/app/dashboard/content-mobile" className="font-semibold underline">update its app link</Link> in Legal &amp; resource links.</p></>}
  </div>;
}
