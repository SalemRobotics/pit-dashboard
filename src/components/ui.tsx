import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const labelClass = "mb-1.5 block text-[13px] font-medium text-ink";
const controlBase =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink shadow-xs placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/25";
export const inputClass = `${controlBase} h-9`;
export const selectClass = `${controlBase} h-9`;
export const textareaClass = `${controlBase} min-h-20 py-2`;

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">{eyebrow}</p>
        )}
        <h1 className="text-[1.625rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  flush,
  className = "",
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={`overflow-clip rounded-card border border-line bg-surface shadow-card ${className}`}>
      {hasHeader && (
        <div
          className={`flex items-start justify-between gap-3 ${flush ? "border-b border-line px-5 py-3.5" : "px-5 pt-5"}`}
        >
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-ink-2">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : `px-5 pb-5 ${hasHeader ? "pt-4" : "pt-5"}`}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-neutral-soft text-neutral-ink ring-neutral-line",
  success: "bg-success-soft text-success-ink ring-success-line",
  warning: "bg-warning-soft text-warning-ink ring-warning-line",
  danger: "bg-danger-soft text-danger-ink ring-danger-line",
  accent: "bg-accent-soft text-accent-ink ring-accent/25",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-neutral-soft text-ink-3 ring-1 ring-inset ring-neutral-line">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
