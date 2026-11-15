"use client";

import { useState } from "react";
import { cn, formatDate, todayIso } from "@/lib/utils";
import { Calendar } from "./calendar";
import { CalendarIcon, XIcon } from "./icons";
import { fieldStyles } from "./input";
import { Popover } from "./popover";

type DatePickerProps = {
  /** `YYYY-MM-DD`, or "" for none. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** Shows a × that empties the field. */
  clearable?: boolean;
  className?: string;
  /** From <Field>: the label's id (the button is named "label: value"); the Field's id is not used, the popover owns the button's id. */
  id?: string;
  labelId?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  onBlur?: () => void;
};

/**
 * Date field with the app's own calendar instead of the browser's (which looks different in every
 * browser and can't follow the theme). Shows the date the Bangladesh way ("15 Nov 2026"); opens a
 * popover calendar focused on the chosen day (or today); Today / Clear shortcuts underneath.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Choose a date",
  clearable = false,
  className,
  labelId,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onBlur,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  // Read when the panel opens (not during render), so rendering stays pure.
  const [today, setToday] = useState("");
  const text = value ? formatDate(value) : null;
  const todayAllowed = !!today && (!min || today >= min) && (!max || today <= max);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setToday(todayIso());
        setOpen(next);
        if (!next) onBlur?.();
      }}
      label="Choose a date"
      initialFocus="none"
      className="w-auto p-3"
      trigger={(props) => (
        <div className={cn("relative", className)}>
          <button
            {...props}
            type="button"
            aria-labelledby={labelId ? `${labelId} ${props.id}-value` : undefined}
            aria-label={labelId ? undefined : `${ariaLabel ?? "Date"}: ${text ?? placeholder}`}
            aria-describedby={ariaDescribedBy}
            className={cn(
              fieldStyles,
              "flex h-9 items-center gap-2 px-3 text-left focus-visible:ring-3 pointer-coarse:h-11",
              clearable && value && "pr-9",
              // Buttons can't carry aria-invalid; the error text is linked through aria-describedby (Field).
              ariaInvalid && "border-danger focus-visible:ring-danger/20",
              open && "border-accent ring-3 ring-accent/20",
            )}
          >
            <CalendarIcon className={cn("shrink-0 transition-colors", open ? "text-accent-fg" : "text-ink-subtle")} />
            <span id={`${props.id}-value`} className={cn("truncate tabular-nums", !text && "text-ink-subtle")}>
              {text ?? placeholder}
            </span>
          </button>
          {clearable && value && (
            <button
              type="button"
              aria-label="Clear date"
              onClick={() => onChange("")}
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-paper-2 hover:text-ink focus-ring pointer-coarse:size-9"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      )}
    >
      {({ close }) => (
        <div>
          <Calendar
            mode="single"
            today={today}
            value={value || undefined}
            min={min}
            max={max}
            autoFocus
            onSelect={(date) => {
              onChange(date);
              close();
            }}
          />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              disabled={!value}
              onClick={() => {
                onChange("");
                close();
              }}
              className="h-8 rounded-full px-3 text-xs font-medium text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!todayAllowed}
              onClick={() => {
                onChange(today);
                close();
              }}
              className="h-8 rounded-full px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-soft focus-ring disabled:pointer-events-none disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}
