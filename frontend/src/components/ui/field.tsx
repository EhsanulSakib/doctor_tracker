"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "./icons";

/** Props a control receives from <Field>: spread them onto the input so label, hint and error connect. */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

/** Extra wiring for controls that aren't labelable elements (the custom Select uses aria-labelledby). */
export type FieldMeta = { labelId: string };

type FieldProps = {
  label: ReactNode;
  /** Help text under the control (replaced by the error while there is one). */
  hint?: ReactNode;
  /** Validation message; sets aria-invalid and is read out with the field. */
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps, meta: FieldMeta) => ReactNode;
};

/**
 * Label + control + hint/error with the ARIA wiring done once:
 * `<Field label="Email" error={errors.email}>{(p) => <Input {...p} type="email" />}</Field>`
 * `<Field label="Status">{(p, { labelId }) => <Select {...p} labelId={labelId} … />}</Field>`
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label id={labelId} htmlFor={id} className="text-ui font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children(
        {
          id,
          "aria-describedby": message ? messageId : undefined,
          "aria-invalid": error ? true : undefined,
          "aria-required": required ? true : undefined,
        },
        { labelId },
      )}
      {message && (
        <p id={messageId} className={cn("flex items-start gap-1 text-xs", error ? "text-danger" : "text-ink-muted")}>
          {error && <AlertCircleIcon size={14} className="mt-px shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
