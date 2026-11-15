"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useAnchoredPosition } from "@/hooks/use-anchored-position";
import { useDismiss } from "@/hooks/use-dismiss";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { fieldStyles } from "./input";
import { Portal } from "./portal";

export type SelectOption<V extends string = string> = { value: V; label: string; description?: string };

type SelectProps<V extends string> = {
  value: V | "";
  onChange: (value: V | "") => void;
  options: readonly SelectOption<V>[];
  placeholder?: string;
  /** Prepends an option with value "" (e.g. "All statuses") so a filter can be cleared. */
  emptyOption?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  /** From <Field>: id for the trigger and the label's id. Otherwise pass aria-label. */
  id?: string;
  labelId?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  /** Called when focus leaves the closed select (React Hook Form's touched state). */
  onBlur?: () => void;
};

const TYPEAHEAD_RESET_MS = 500;

/**
 * Custom select following the WAI-ARIA "select-only combobox" pattern: focus stays on the trigger,
 * the highlighted option is announced through aria-activedescendant.
 * Keys: ↑/↓/Enter/Space open · ↑/↓ Home/End PageUp/PageDown move · Enter/Space choose ·
 * Escape/Tab close · typing jumps to the first matching label.
 */
export function Select<V extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyOption,
  size = "md",
  disabled = false,
  className,
  id,
  labelId,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  onBlur,
}: SelectProps<V>) {
  const items: SelectOption<V | "">[] = emptyOption ? [{ value: "", label: emptyOption }, ...options] : [...options];
  const selectedIndex = items.findIndex((item) => item.value === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", timer: undefined as ReturnType<typeof setTimeout> | undefined });
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const openAt = (index: number) => {
    setActive(Math.max(0, Math.min(items.length - 1, index)));
    setOpen(true);
  };

  const choose = (index: number) => {
    const item = items[index];
    if (item) onChange(item.value);
    setOpen(false);
  };

  useDismiss(open, [triggerRef, listRef], () => setOpen(false));
  useAnchoredPosition(triggerRef, listRef, open, { matchWidth: true, offset: 4 });

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId is derived from a stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => () => clearTimeout(typeahead.current.timer), []);

  /** Repeated presses of one letter cycle through matches; typing a word jumps to it. */
  const findByTyping = (key: string): number => {
    const state = typeahead.current;
    clearTimeout(state.timer);
    state.text += key.toLowerCase();
    state.timer = setTimeout(() => {
      state.text = "";
    }, TYPEAHEAD_RESET_MS);

    const cycling = state.text.length > 1 && [...state.text].every((char) => char === state.text[0]);
    const query = cycling ? state.text[0]! : state.text;
    const from = open ? active : Math.max(selectedIndex, 0);
    const start = cycling || query.length === 1 ? from + 1 : from;
    for (let offset = 0; offset < items.length; offset++) {
      const index = (start + offset) % items.length;
      if (items[index]!.label.toLowerCase().startsWith(query)) return index;
    }
    return -1;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openAt(selectedIndex >= 0 ? selectedIndex : event.key === "ArrowUp" ? items.length - 1 : 0);
      } else if (printable) {
        const match = findByTyping(event.key);
        if (match >= 0) openAt(match);
      }
      return;
    }

    const last = items.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "PageDown":
        event.preventDefault();
        setActive((i) => Math.min(last, i + 10));
        break;
      case "PageUp":
        event.preventDefault();
        setActive((i) => Math.max(0, i - 10));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        // Stop here so a surrounding dialog doesn't close too.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (printable) {
          event.preventDefault();
          const match = findByTyping(event.key);
          if (match >= 0) setActive(match);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        aria-required={ariaRequired || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
        className={cn(
          fieldStyles,
          "flex items-center justify-between gap-2 px-3 text-left focus-visible:ring-3",
          size === "sm" ? "h-8 text-[13px] sm:text-[13px] pointer-coarse:h-10" : "h-9 pointer-coarse:h-11",
          open && "border-accent ring-3 ring-accent/20",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-ink-subtle")}>{selected?.label ?? placeholder}</span>
        <ChevronDownIcon
          className={cn("shrink-0 text-ink-subtle transition-transform duration-150 ease-clinical", open && "rotate-180")}
        />
      </button>

      <Portal>
        <AnimatePresence>
          {open && (
            <m.ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={labelId}
              aria-label={labelId ? undefined : ariaLabel}
              tabIndex={-1}
              style={{ top: 0, left: 0, visibility: "hidden" }}
              className="fixed z-60 max-h-[min(var(--panel-max-height,18rem),18rem)] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-panel border border-line bg-surface p-1 shadow-overlay outline-none"
              variants={popIn}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {items.map((item, index) => {
                const isSelected = item.value === value;
                return (
                  <li
                    key={item.value || "__empty"}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex cursor-pointer select-none items-center justify-between gap-3 rounded-[4px] px-2.5 py-2 text-sm text-ink pointer-coarse:py-3",
                      index === active && "bg-paper-2",
                      isSelected && "font-medium",
                    )}
                    onPointerMove={() => {
                      if (index !== active) setActive(index);
                    }}
                    // Keep focus on the trigger (aria-activedescendant pattern).
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(index)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{item.label}</span>
                      {item.description && <span className="block truncate text-xs font-normal text-ink-muted">{item.description}</span>}
                    </span>
                    {isSelected && <CheckIcon className="shrink-0 text-accent" />}
                  </li>
                );
              })}
            </m.ul>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
