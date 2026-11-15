import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium " +
  "transition-[background-color,color,border-color,transform] duration-150 ease-clinical focus-ring " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink shadow-sm shadow-accent/25 hover:bg-accent-hover",
  secondary: "border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-paper-2",
  ghost: "text-ink-muted hover:bg-paper-2 hover:text-ink",
  danger: "bg-danger text-danger-ink shadow-sm hover:bg-danger-hover",
};

// 36px tall with a mouse; 44px on touch screens (minimum comfortable touch target).
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px] pointer-coarse:h-10",
  md: "h-9 gap-2 px-3.5 text-sm pointer-coarse:h-11",
  lg: "h-11 gap-2 px-5 text-[15px]",
};

/** The button look, for links that should appear as buttons (`<Link className={buttonStyles()}>`). */
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, disables the button and sets aria-busy. The label stays, so the width doesn't jump. */
  loading?: boolean;
  /** Icon before the label (replaced by the spinner while loading). */
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  icon,
  disabled,
  type = "button",
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : icon}
      {children}
    </button>
  );
}
