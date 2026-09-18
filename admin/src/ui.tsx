import type { ReactNode } from 'react';

export const APP_NAME = 'Teen Bible Adventures';
export const DASHBOARD_TITLE = `${APP_NAME} Manager`;

export function Brand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`brand brand-${size}`}>
      <img src="/logo.svg" alt={APP_NAME} className="brand-logo" />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Badge({ kind, children }: { kind: 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="lede">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return <p className={kind === 'error' ? 'error-text' : 'ok-text'} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="card muted-card">
      <p className="muted">{label}</p>
    </div>
  );
}

export function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="dialog-root">
      <div className="dialog-backdrop" aria-hidden />
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
      >
        <div className="dialog-head">
          <div className="dialog-head-text">
            {title ? <h3 id="dialog-title">{title}</h3> : null}
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="icon-btn dialog-close"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      <PencilIcon />
    </button>
  );
}

export function EditableCard({
  title,
  editing,
  onEdit,
  onCancel,
  view,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  view: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {editing
          ? <button type="button" className="icon-btn" aria-label="Done" title="Done" onClick={onCancel}><CloseIcon /></button>
          : <EditButton label={`Edit ${title}`} onClick={onEdit} />}
      </div>
      {editing ? children : view}
    </div>
  );
}
