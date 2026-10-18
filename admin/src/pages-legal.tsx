import { AppResourceAlerts } from './app-resource-alerts';
import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { RichTextEditor, richTextHasContent } from './rich-text-editor';
import { askConfirm, askPrompt } from './prompt-dialog';
import { Alert, Button, Badge, Empty, Field, Spinner } from './ui';

export type SitePage = {
  id: string;
  slug: string;
  title: string;
  html: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function publicPathForSlug(slug: string) {
  return `/p/${slug}`;
}

function publicUrlForSlug(slug: string) {
  return `${window.location.origin}${publicPathForSlug(slug)}`;
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  html: '<p></p>',
  published: false,
};

const PREVIEW_BODY_CLASS =
  'text-sm leading-relaxed text-text-2 [&_a]:text-teal [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-extrabold [&_h2]:text-navy [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-navy [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5';

export function LegalDocsPage() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editorKey, setEditorKey] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  const selected = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? null,
    [pages, selectedId],
  );

  function applyPage(page: SitePage) {
    setSelectedId(page.id);
    setForm({
      title: page.title,
      slug: page.slug,
      html: page.html || '<p></p>',
      published: page.published,
    });
    setSlugTouched(true);
    setEditorKey((k) => k + 1);
    setEditing(false);
    setView('edit');
  }

  async function load(preferId?: string | null) {
    setLoading(true);
    setError('');
    try {
      const rows = await api<SitePage[]>('/api/admin/site-pages');
      setPages(rows);
      const nextId = preferId ?? selectedId;
      const pick = rows.find((p) => p.id === nextId) ?? rows[0] ?? null;
      if (pick) {
        applyPage(pick);
      } else {
        setSelectedId(null);
        setForm(EMPTY_FORM);
        setSlugTouched(false);
        setEditorKey((k) => k + 1);
        setEditing(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load pages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setEditorKey((k) => k + 1);
    setView('edit');
    setEditing(true);
    setMessage('');
    setError('');
    setCopied(false);
  }

  function selectPage(page: SitePage) {
    applyPage(page);
    setMessage('');
    setError('');
    setCopied(false);
  }

  function beginEdit() {
    setView('edit');
    setEditing(true);
    setEditorKey((k) => k + 1);
    setMessage('');
    setError('');
  }

  function cancelEdit() {
    if (selected) {
      applyPage(selected);
    } else if (pages[0]) {
      applyPage(pages[0]);
    } else {
      setForm(EMPTY_FORM);
      setEditing(false);
    }
    setMessage('');
    setError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    if (!form.title.trim()) {
      setError('Title is required');
      setSaving(false);
      return;
    }
    if (!richTextHasContent(form.html)) {
      setError('Page content is required');
      setSaving(false);
      return;
    }
    const slug = slugify(form.slug || form.title);
    if (!slug) {
      setError('Slug is required');
      setSaving(false);
      return;
    }
    try {
      const body = {
        title: form.title.trim(),
        slug,
        html: form.html,
        published: form.published,
      };
      const saved = selectedId
        ? await api<SitePage>(`/api/admin/site-pages/${selectedId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : await api<SitePage>('/api/admin/site-pages', {
            method: 'POST',
            body: JSON.stringify(body),
          });
      setMessage(form.published ? 'Saved and published.' : 'Saved as draft.');
      await load(saved.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function removePage() {
    if (!selectedId || !selected) return;
    let usage: { label: string }[];
    try { usage = await api<{ label: string }[]>(`/api/admin/site-pages/${selectedId}/usage`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not check page usage. Try again before deleting.'); return; }
    const warning = usage.length ? `This resource is currently in use by: ${usage.map(row => row.label).join(', ')}. Deleting it will break these app links. Update them in App content → Legal & resource links, or confirm deletion anyway. ` : '';
    const ok = await askConfirm(`${warning}Delete “${selected.title}”? This cannot be undone.`, {
      title: 'Delete page',
      confirmLabel: usage.length ? 'Delete linked page anyway' : 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/admin/site-pages/${selectedId}${usage.length ? '?confirmInUse=true' : ''}`, { method: 'DELETE' });
      setMessage('Page deleted.');
      await load(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  }

  async function copyPublicLink() {
    const slug = slugify(form.slug || form.title);
    if (!slug || !form.published) return;
    const url = publicUrlForSlug(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await askPrompt('Public link', {
        title: 'Copy this public link',
        defaultValue: url,
        confirmLabel: 'Done',
      });
    }
  }

  if (loading && pages.length === 0) return <Spinner label="Loading site pages…" />;

  const displaySlug = slugify(form.slug || form.title);
  const publicUrl = displaySlug ? publicUrlForSlug(displaySlug) : '';
  const hasContent = Boolean(selectedId) || editing;

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100dvh-5.25rem)] lg:min-h-0">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div><h1 className="m-0 text-xl font-bold tracking-tight text-navy">Site pages</h1><p className="m-0 mt-1 text-sm text-muted">Manage your public policies and documents.</p></div>
        <Button type="button" size="sm" onClick={startNew}>
          New page
        </Button>
      </div>

      <AppResourceAlerts refreshKey={pages.map(page => `${page.id}:${page.updatedAt}`).join()} />
      {error ? <Alert kind="error">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="flex max-h-[calc(100dvh-12rem)] min-h-0 flex-col lg:h-full lg:max-h-full">
          <h3 className="m-0 shrink-0 px-1 pb-2 text-xs font-bold uppercase tracking-wider text-muted">Pages</h3>
          {pages.length === 0 ? (
            <Empty title="No pages yet" body="Create a privacy policy, terms page, or any policy for your site." />
          ) : (
            <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto overscroll-contain p-0 pb-1">
              {pages.map((page) => {
                const active = page.id === selectedId;
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      onClick={() => selectPage(page)}
                      className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        active ? 'bg-teal/10 text-navy' : 'text-navy hover:bg-cream'
                      }`}
                    >
                      <span className="text-sm font-bold leading-snug">{page.title}</span>
                      <span className={`text-[11px] ${'text-muted'}`}>
                        /p/{page.slug}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${page.published ? 'bg-teal' : 'bg-amber-500'}`} />
                        {page.published ? 'Published' : 'Draft'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {!hasContent ? (
          <Empty title="No page selected" body="Choose a page from the list or create a new one." />
        ) : (
          <div className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border/60 bg-surface p-5 sm:p-7 lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 text-xl font-extrabold tracking-tight text-navy">
                  {form.title || 'Untitled page'}
                </h2>
                {displaySlug ? (
                  <p className="m-0 mt-1 font-mono text-xs text-muted">/p/{displaySlug}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge kind={form.published ? 'ok' : 'warn'}>
                  {form.published ? 'Published' : 'Draft'}
                </Badge>
                {!editing ? (
                  <Button type="button" size="sm" onClick={beginEdit}>
                    Edit
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 text-xs text-muted">
              <span>{selected ? `Updated ${formatWhen(selected.updatedAt)}` : 'New page'}</span>
              {form.published && displaySlug ? <div className="flex min-w-0 items-center gap-3">
                <a href={publicPathForSlug(displaySlug)} target="_blank" rel="noreferrer" className="truncate text-teal hover:underline" title={publicUrl}>View public page ↗</a>
                <button type="button" onClick={() => void copyPublicLink()} className="min-h-10 shrink-0 cursor-pointer px-2 font-semibold text-navy hover:text-teal">{copied ? 'Copied!' : 'Copy link'}</button>
              </div> : <span>Draft · Publish to share</span>}
            </div>
            <details className="text-xs text-muted">
              <summary className="w-fit cursor-pointer py-1">Page details</summary>
              <div className="mt-2 space-y-1 break-all">
                <p>Created: {selected ? formatWhen(selected.createdAt) : 'New page'}</p>
                <p>Updated: {selected ? formatWhen(selected.updatedAt) : '—'}</p>
                {form.published && publicUrl && <p>{publicUrl}</p>}
              </div>
            </details>

            {editing ? (
              <form className="flex flex-col gap-4" onSubmit={save}>
                <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Field label="Title">
                    <input
                      required
                      value={form.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          title,
                          slug: slugTouched ? prev.slug : slugify(title),
                        }));
                      }}
                      placeholder="Privacy Policy"
                      className="w-full min-w-0 rounded-lg border border-border bg-cream px-3 py-2 text-sm font-semibold text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
                    />
                  </Field>
                  <Field label="URL slug">
                    <input
                      required
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm({ ...form, slug: slugify(e.target.value) });
                      }}
                      placeholder="privacy-policy"
                      className="w-full min-w-0 rounded-lg border border-border bg-cream px-3 py-2 font-mono text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
                    />
                  </Field>
                  <label className="mt-6 inline-flex min-h-10 cursor-pointer items-center gap-2 px-1 text-sm font-medium text-navy">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      className="accent-teal"
                    />
                    Published
                  </label>
                </div>

                <div>
                  <div role="tablist" aria-label="Page workspace" className="mb-4 flex gap-6 border-b border-border/60">
                    {(['edit', 'preview'] as const).map(mode => <button key={mode} id={`page-tab-${mode}`} type="button" role="tab" aria-selected={view === mode} aria-controls={`page-panel-${mode}`} onClick={() => setView(mode)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'edit' : event.key === 'End' ? 'preview' : view === 'edit' ? 'preview' : 'edit'; setView(next); document.getElementById(`page-tab-${next}`)?.focus(); } }} tabIndex={view === mode ? 0 : -1} className={`min-h-11 cursor-pointer border-b-2 px-1 text-sm font-semibold ${view === mode ? 'border-teal text-navy' : 'border-transparent text-muted hover:text-navy'}`}>{mode === 'edit' ? 'Write' : 'Preview'}</button>)}
                  </div>
                  <div role="tabpanel" id="page-panel-edit" aria-labelledby="page-tab-edit" hidden={view !== 'edit'}>
                    <RichTextEditor key={editorKey} html={form.html} onChange={(html) => setForm(prev => ({ ...prev, html }))} minHeightClass="min-h-[26rem] max-h-[65vh]" />
                  </div>
                  <div role="tabpanel" id="page-panel-preview" aria-labelledby="page-tab-preview" hidden={view !== 'preview'}>
                    <article className="mx-auto min-h-[26rem] max-w-3xl px-1 py-3 sm:px-6">
                      <h1 className="mb-6 mt-0 text-2xl font-bold tracking-tight text-navy">{form.title || 'Untitled page'}</h1>
                      <div className={PREVIEW_BODY_CLASS} dangerouslySetInnerHTML={{ __html: form.html }} />
                    </article>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : selectedId ? 'Save changes' : 'Create page'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  {selectedId ? (
                    <Button type="button" variant="danger" onClick={() => void removePage()}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : (
              <article className="mx-auto w-full max-w-3xl py-3 sm:px-4">
                <div
                  className={PREVIEW_BODY_CLASS}
                  dangerouslySetInnerHTML={{ __html: form.html }}
                />
              </article>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
