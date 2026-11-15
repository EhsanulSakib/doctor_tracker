import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  /** Required: an icon-only button needs an accessible name. Also its tooltip (unless `title` overrides it; "" = none). */
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
  ref?: Ref<HTMLButtonElement>;
};

const variants = {
  ghost: "text-ink-muted hover:bg-paper-2 hover:text-ink",
  secondary: "border border-line bg-surface text-ink shadow-card hover:bg-paper-2",
};

const sizes = {
  sm: "size-8 pointer-coarse:size-10",
  md: "size-9 pointer-coarse:size-11",
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  type = "button",
  title,
  className,
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      data-tooltip={title === "" ? undefined : (title ?? label)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-clinical",
        "focus-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
