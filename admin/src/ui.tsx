import { useState, type ButtonHTMLAttributes, type ComponentPropsWithoutRef, type ReactNode } from 'react';

export const APP_NAME = 'Teen Bible Adventures';
export const DASHBOARD_TITLE = `${APP_NAME} Manager`;

export type ButtonVariant = 'primary' | 'teal' | 'soft' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white border-transparent hover:bg-teal shadow-xs',
  teal: 'bg-teal text-white border-transparent hover:bg-navy shadow-xs',
  soft: 'bg-teal-tint/50 text-teal border-teal/30 hover:bg-teal hover:text-white',
  secondary: 'bg-surface text-navy border-border hover:bg-surface-2',
  outline: 'bg-transparent text-navy border-border hover:bg-cream',
  danger: 'bg-error-bg text-error border-error/30 hover:bg-error/15',
  ghost: 'bg-transparent text-muted border-transparent hover:bg-surface-2 hover:text-navy',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold',
  md: 'px-4 py-2 text-xs font-semibold',
  lg: 'px-4 py-3 text-sm font-semibold',
};

/** Shared desk button — use variants instead of repeating navy/teal class strings. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-md border transition-colors cursor-pointer disabled:opacity-50',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Brand({ size = 'md' }: { size?: 'sm' | 'header' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-[44px]',
    header: 'h-[56px]',
    md: 'h-[72px]',
    lg: 'h-[88px]',
  }[size];
  return (
    <div className="flex items-center">
      <img src="/logo.svg" alt={APP_NAME} className={`block w-auto max-w-full object-contain ${sizeClasses}`} />
    </div>
  );
}

export function PasswordInput({ className, type = 'password', ...props }: ComponentPropsWithoutRef<'input'>) {
  const [visible, setVisible] = useState(false);
  if (type !== 'password') return <input {...props} type={type} className={className} />;
  return (
    <span className="relative block min-w-0 [&>input]:pr-16">
      <input {...props} type={visible ? 'text' : 'password'} className={className} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold normal-case tracking-normal text-navy hover:text-teal focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(value => !value)}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </span>
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
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted tracking-tight">
      <span className="text-navy text-xs font-semibold tracking-wide uppercase">{label}</span>
      {children}
      {hint ? <span className="text-[11px] font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Badge({ kind, children }: { kind: 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  const styles = {
    ok: 'bg-sage text-forest border-forest/20',
    warn: 'bg-surface-2 text-orange border-orange/30',
    bad: 'bg-error-bg text-error border-error/20',
    info: 'bg-teal-tint text-teal border-teal/20',
  }[kind];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {children}
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-10 px-6 rounded-card border border-dashed border-border bg-surface/60">
      <strong className="block text-navy font-semibold text-sm mb-1">{title}</strong>
      <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">{body}</p>
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
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-border">
      <div>
        {kicker ? <p className="text-[11px] font-bold uppercase tracking-wider text-teal mb-1">{kicker}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
        {subtitle ? <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2.5 shrink-0">{actions}</div> : null}
    </header>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  const style = kind === 'error'
    ? 'bg-error-bg text-error border-error/30'
    : 'bg-sage text-forest border-forest/30';
  return (
    <p
      className={`p-3 rounded-xl text-xs font-semibold border ${style}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="bg-surface border border-border rounded-card p-8 text-center shadow-xs">
      <p className="text-sm text-muted animate-pulse">{label}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy/50 backdrop-blur-xs transition-opacity" onClick={onClose} aria-hidden />
      <div
        className="relative bg-surface border border-border rounded-card shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-10 p-6 flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
          <div>
            {title ? <h3 id="dialog-title" className="text-lg font-bold text-navy">{title}</h3> : null}
            {subtitle ? <p className="text-xs text-muted mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  headerActions,
  widthClass = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby={title ? 'drawer-title' : undefined}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Slide-over container anchored right */}
      <div className="fixed inset-y-0 right-0 flex pl-6 sm:pl-10 pointer-events-none max-w-full">
        <div
          className={`pointer-events-auto w-screen ${widthClass} bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in-right`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border bg-surface shrink-0">
            <div className="min-w-0 flex-1">
              {title ? (
                <h3 id="drawer-title" className="text-lg font-bold text-navy truncate">
                  {title}
                </h3>
              ) : null}
              {subtitle ? (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label="Close"
                title="Close"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          {/* Scrollable content body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export const PAGE_SIZE = 40;

export function slicePage<T>(items: readonly T[], page: number, size = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * size;
  return { page: current, totalPages, start, rows: items.slice(start, start + size), total };
}

export function Pager({
  page,
  total,
  onPage,
  pageSize = PAGE_SIZE,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
  pageSize?: number;
}) {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
      <p className="m-0 text-[11px] text-muted">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPage(current - 1)}
          className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs font-semibold tabular-nums text-muted">
          {current} / {totalPages}
        </span>
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => onPage(current + 1)}
          className="cursor-pointer rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-surface-2 border border-border/60 transition-colors cursor-pointer"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
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
    <div className="bg-surface border border-border rounded-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-border/60">
        <h3 className="text-base font-bold text-navy">{title}</h3>
        {editing
          ? <button type="button" className="p-1 rounded-lg text-muted hover:text-navy hover:bg-surface-2 cursor-pointer" aria-label="Done" title="Done" onClick={onCancel}><CloseIcon /></button>
          : <EditButton label={`Edit ${title}`} onClick={onEdit} />}
      </div>
      {editing ? children : view}
    </div>
  );
}
