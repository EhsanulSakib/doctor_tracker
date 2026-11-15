import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared field look. Text is 16px on phones (smaller makes iOS zoom in on focus) and 14px from `sm`.
 * Focus = accent border + soft ring; invalid = danger border (driven by aria-invalid, so the same
 * attribute that informs screen readers also styles the field).
 */
export const fieldStyles =
  "w-full rounded-control border border-line-strong bg-surface text-base text-ink sm:text-sm " +
  "placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 ease-clinical " +
  "hover:border-ink-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/20 " +
  "disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-subtle " +
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Icon inside the field, on the left (decorative). */
  leading?: ReactNode;
  /** Element inside the field, on the right (e.g. a clear button). */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ leading, trailing, className, ref, ...props }: InputProps) {
  const input = (
    <input
      ref={ref}
      className={cn(fieldStyles, "h-9 px-3 pointer-coarse:h-11", leading && "pl-9", trailing && "pr-10", !leading && !trailing && className)}
      {...props}
    />
  );

  if (!leading && !trailing) return input;

  return (
    <div className={cn("relative", className)}>
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">{leading}</span>
      )}
      {input}
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

export function Textarea({ className, rows = 4, ref, ...props }: TextareaProps) {
  return <textarea ref={ref} rows={rows} className={cn(fieldStyles, "min-h-20 resize-y px-3 py-2 leading-relaxed", className)} {...props} />;
}
