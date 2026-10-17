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
    const ok = await askConfirm(`Delete “${selected.title}”? This cannot be undone.`, {
      title: 'Delete page',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setError('');
    setMessage('');
    try {
      await api(`/api/admin/site-pages/${selectedId}`, { method: 'DELETE' });
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={startNew}>
          New page
        </Button>
      </div>

      {error ? <Alert kind="error">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[18rem_1fr] items-start">
        <aside className="rounded-card border border-border bg-surface p-3 shadow-xs">
          <h3 className="m-0 px-1 pb-2 text-xs font-bold uppercase tracking-wider text-muted">Pages</h3>
          {pages.length === 0 ? (
            <Empty title="No pages yet" body="Create a privacy policy, terms page, or any policy for your site." />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {pages.map((page) => {
                const active = page.id === selectedId;
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      onClick={() => selectPage(page)}
                      className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        active ? 'bg-navy text-white' : 'text-navy hover:bg-cream'
                      }`}
                    >
                      <span className="text-sm font-bold leading-snug">{page.title}</span>
                      <span className={`text-[11px] ${active ? 'text-white/70' : 'text-muted'}`}>
                        /p/{page.slug}
                      </span>
                      <span className="pt-0.5">
                        <Badge kind={page.published ? 'ok' : 'warn'}>
                          {page.published ? 'Published' : 'Draft'}
                        </Badge>
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
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-xs">
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

            <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-cream/70 px-3 py-2.5 text-xs text-navy">
              <span>
                <strong className="text-muted">Created:</strong>{' '}
                {selected ? formatWhen(selected.createdAt) : '— (new page)'}
              </span>
              <span className="text-border">·</span>
              <span>
                <strong className="text-muted">Updated:</strong>{' '}
                {selected ? formatWhen(selected.updatedAt) : '—'}
              </span>
            </div>

            {form.published && displaySlug ? (
              <div className="flex flex-col gap-2 rounded-xl border border-teal/30 bg-teal-tint/40 px-3 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-teal">Public page link</p>
                  <a
                    href={publicPathForSlug(displaySlug)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate font-mono text-xs font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    {publicUrl}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => void copyPublicLink()}
                  className="cursor-pointer shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal"
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            ) : (
              <p className="m-0 rounded-xl border border-dashed border-border bg-cream/50 px-3 py-2 text-xs text-muted">
                Publish this page to get a shareable public link for Play Store / website use.
              </p>
            )}

            {editing ? (
              <form className="flex flex-col gap-4" onSubmit={save}>
                <div className="flex flex-wrap items-end gap-3">
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
                      className="w-full min-w-[14rem] rounded-xl border border-border bg-cream px-3 py-2 text-sm font-semibold text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
                    />
                  </Field>
                  <Field label="URL slug" hint="Used in the public link">
                    <input
                      required
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm({ ...form, slug: slugify(e.target.value) });
                      }}
                      placeholder="privacy-policy"
                      className="w-full min-w-[12rem] rounded-xl border border-border bg-cream px-3 py-2 font-mono text-sm text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
                    />
                  </Field>
                  <label className="mb-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-cream px-3 py-2 text-xs font-bold text-navy">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      className="accent-teal"
                    />
                    Published
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-navy">Editor</span>
                    <RichTextEditor
                      key={editorKey}
                      html={form.html}
                      onChange={(html) => setForm({ ...form, html })}
                      minHeightClass="min-h-[18rem] max-h-[28rem]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Live preview</span>
                    <article className="min-h-[18rem] max-h-[28rem] overflow-y-auto rounded-card border border-border bg-cream px-5 py-4">
                      <h1 className="mb-3 mt-0 text-xl font-extrabold tracking-tight text-navy">
                        {form.title || 'Untitled page'}
                      </h1>
                      <div
                        className={PREVIEW_BODY_CLASS}
                        dangerouslySetInnerHTML={{ __html: form.html }}
                      />
                    </article>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
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
              <article className="rounded-card border border-border bg-cream px-5 py-5 sm:px-6">
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
