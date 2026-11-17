import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { withoutEmptySteps, type StudioDoc } from './doc-store';

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export type DraftConflict = {
  serverVersion: number;
  serverDoc: unknown;
  localVersion: number;
  localDoc: StudioDoc;
};

const OFFLINE_BACKOFF_MS = 20_000;

/**
 * Debounced WIP autosave → PUT /api/puzzle-drafts with version numbers.
 * On mismatch, surfaces conflict for "reload theirs / keep mine".
 * Network failures enter a quiet backoff so the status badge does not flicker.
 */
export function useDebouncedDraftAutosave(opts: {
  draftId: string | null;
  replace?: { id: string; version: number } | null;
  loadedVersion?: number;
  version: number;
  doc: StudioDoc;
  enabled?: boolean;
  debounceMs?: number;
  onDraftId?: (id: string) => void;
  onConflict?: (conflict: DraftConflict) => void;
  /** Fired after a save that omitted blank word cards. */
  onDroppedEmpty?: () => void;
  /** Set true the moment a publish finishes, before React re-renders. */
  holdRef?: { readonly current: boolean };
}) {
  const {
    draftId,
    replace,
    loadedVersion = 1,
    version,
    doc,
    enabled = true,
    debounceMs = 1200,
    onDraftId,
    onConflict,
    onDroppedEmpty,
    holdRef,
  } = opts;
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ draftId, replace, loadedVersion, version, doc, onDraftId, onConflict, onDroppedEmpty });
  latest.current = { draftId, replace, loadedVersion, version, doc, onDraftId, onConflict, onDroppedEmpty };
  const lastSaved = useRef<{ key: string; version: number } | null>(null);
  const blockedKey = useRef<string | null>(null);
  const backoffUntil = useRef(0);
  const inFlight = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const hold = useRef(holdRef);
  hold.current = holdRef;
  const savingHeld = () => !enabledRef.current || Boolean(hold.current?.current);
  const scheduleSave = useRef<(immediate?: boolean) => void>(() => {});

  scheduleSave.current = (immediate = false) => {
    if (!enabled || hold.current?.current) return;
    const cur = latest.current;
    if (cur.version <= cur.loadedVersion || blockedKey.current === cur.doc.id) return;
    if (lastSaved.current?.key === cur.doc.id && lastSaved.current.version === cur.version) return;
    if (inFlight.current) return;

    if (timer.current) clearTimeout(timer.current);
    const wait = immediate ? 0 : Math.max(debounceMs, backoffUntil.current - Date.now());
    timer.current = setTimeout(async () => {
      const snap = latest.current;
      if (savingHeld()) return;
      if (snap.version <= snap.loadedVersion || blockedKey.current === snap.doc.id) return;
      if (lastSaved.current?.key === snap.doc.id && lastSaved.current.version === snap.version) return;
      if (inFlight.current) return;

      inFlight.current = true;
      // Stay on "offline" during backoff — don't flash saving/error.
      const quietOffline = Date.now() < backoffUntil.current;
      if (!quietOffline) setStatus('saving');

      try {
        const savedDoc = withoutEmptySteps(snap.doc);
        const saved = await api<{ id: string; version: number }>('/api/puzzle-drafts', {
          method: 'PUT',
          body: JSON.stringify({
            id: snap.draftId ?? undefined,
            replace: snap.draftId ? undefined : snap.replace ?? undefined,
            version: snap.version,
            title: savedDoc.title,
            doc: savedDoc,
          }),
        });
        lastSaved.current = { key: snap.doc.id, version: snap.version };
        if (latest.current.doc.id !== snap.doc.id) return;
        backoffUntil.current = 0;
        if (savedDoc !== snap.doc) snap.onDroppedEmpty?.();
        if (!snap.draftId) snap.onDraftId?.(saved.id);
        if (savingHeld()) return;
        setConflict(null);
        setError(null);
        setStatus('saved');
      } catch (e) {
        if (savingHeld()) return;
        if (e instanceof ApiError && e.status === 409) {
          const body = (e.body ?? {}) as {
            code?: string;
            serverVersion?: number;
            doc?: unknown;
          };
          if (body.code === 'ACTIVE_DRAFT_EXISTS') {
            blockedKey.current = snap.doc.id;
            setStatus('error');
            setError(e.message);
            return;
          }
          const next: DraftConflict = {
            serverVersion: body.serverVersion ?? snap.version,
            serverDoc: body.doc,
            localVersion: snap.version,
            localDoc: snap.doc,
          };
          setConflict(next);
          setStatus('conflict');
          setError('Version conflict — reload theirs or keep mine');
          snap.onConflict?.(next);
        } else {
          backoffUntil.current = Date.now() + OFFLINE_BACKOFF_MS;
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Autosave failed');
        }
      } finally {
        inFlight.current = false;
        if (savingHeld()) return;
        // Edits that landed during the PUT — schedule one more quiet pass.
        const again = latest.current;
        if (lastSaved.current?.key !== again.doc.id || lastSaved.current.version !== again.version) {
          scheduleSave.current();
        }
      }
    }, wait);
  };

  useEffect(() => {
    if (!enabled) {
      setStatus((current) => (current === 'saving' || current === 'error' ? 'saved' : current));
      return;
    }
    scheduleSave.current();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draftId, version, enabled, debounceMs]);

  function clearConflict() {
    setConflict(null);
    if (status === 'conflict') setStatus('idle');
  }

  return { status, error, conflict, clearConflict, saveNow: () => scheduleSave.current(true) };
}
