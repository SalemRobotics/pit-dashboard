export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-xs hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-ink shadow-xs hover:bg-surface-hover",
  ghost: "text-ink-2 hover:bg-surface-hover hover:text-ink",
  danger: "bg-danger text-white shadow-xs hover:bg-danger-hover",
  "danger-soft": "border border-danger-line bg-surface text-danger-ink shadow-xs hover:bg-danger-soft",
  success: "bg-success text-white shadow-xs hover:brightness-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-sm",
  lg: "h-10 px-4 text-[15px]",
  xl: "h-12 px-6 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}
