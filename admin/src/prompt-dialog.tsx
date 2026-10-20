import { useEffect, useId, useState, type ReactNode } from 'react';
import { useSyncExternalStore } from 'react';

export type PromptTone = 'default' | 'danger';

type ConfirmRequest = {
  kind: 'confirm';
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: PromptTone;
  resolve: (value: boolean) => void;
};

type PromptRequest = {
  kind: 'prompt';
  title: string;
  message?: string;
  label: string;
  defaultValue: string;
  inputType?: 'text' | 'password';
  confirmLabel: string;
  cancelLabel: string;
  resolve: (value: string | null) => void;
};

type PromptRequestItem = ConfirmRequest | PromptRequest;

let queue: PromptRequestItem[] = [];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getQueue() {
  return queue;
}

function setQueue(next: PromptRequestItem[]) {
  queue = next;
  listeners.forEach((listener) => listener());
}

function enqueue(item: PromptRequestItem) {
  setQueue([...queue, item]);
}

function finish(item: PromptRequestItem) {
  setQueue(queue.filter((queued) => queued !== item));
}

/** Yes/no prompt. Resolves false when cancelled. */
export function askConfirm(
  message: string,
  options: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: PromptTone;
  } = {},
) {
  return new Promise<boolean>((resolve) => {
    enqueue({
      kind: 'confirm',
      title: options.title ?? 'Please confirm',
      message,
      confirmLabel: options.confirmLabel ?? 'OK',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      tone: options.tone ?? 'default',
      resolve,
    });
  });
}

/** Text prompt. Resolves null when cancelled. */
export function askPrompt(
  label: string,
  options: {
    title?: string;
    message?: string;
    defaultValue?: string;
    inputType?: 'text' | 'password';
    confirmLabel?: string;
    cancelLabel?: string;
  } = {},
) {
  return new Promise<string | null>((resolve) => {
    enqueue({
      kind: 'prompt',
      title: options.title ?? label,
      message: options.message,
      label,
      defaultValue: options.defaultValue ?? '',
      inputType: options.inputType,
      confirmLabel: options.confirmLabel ?? 'OK',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      resolve,
    });
  });
}

export function PromptDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: PromptTone;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const confirmClass = tone === 'danger'
    ? 'bg-error text-white hover:bg-error/90'
    : 'bg-navy text-cream hover:bg-navy/90';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy/50 backdrop-blur-xs" onClick={onCancel} aria-hidden />
      <div
        className="relative z-10 w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="text-lg font-bold text-navy">{title}</h3>
        {message ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{message}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-2"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptFields({ request }: { request: PromptRequest }) {
  const [value, setValue] = useState(request.defaultValue);
  return (
    <PromptDialog
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      onCancel={() => {
        request.resolve(null);
        finish(request);
      }}
      onConfirm={() => {
        request.resolve(value);
        finish(request);
      }}
    >
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy">
        {request.label}
        <input
          type={request.inputType ?? 'text'}
          autoComplete={request.inputType === 'password' ? 'current-password' : 'off'}
          autoFocus
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-normal normal-case text-navy outline-none focus:border-navy"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              request.resolve(value);
              finish(request);
            }
          }}
        />
      </label>
    </PromptDialog>
  );
}

/** Mount once at the app root. Every askConfirm / askPrompt uses this dialog. */
export function PromptHost() {
  const items = useSyncExternalStore(subscribe, getQueue, getQueue);
  const request = items[0];
  if (!request) return null;
  if (request.kind === 'prompt') return <PromptFields key={request.title + request.defaultValue} request={request} />;
  return (
    <PromptDialog
      title={request.title}
      message={request.message}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      tone={request.tone}
      onCancel={() => {
        request.resolve(false);
        finish(request);
      }}
      onConfirm={() => {
        request.resolve(true);
        finish(request);
      }}
    />
  );
}
