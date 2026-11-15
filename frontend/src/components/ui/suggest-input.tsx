"use client";

import { AnimatePresence, m } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useAnchoredPosition } from "@/hooks/use-anchored-position";
import { useDismiss } from "@/hooks/use-dismiss";
import { highlightSpring, menuItem, menuPanel } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { fieldStyles } from "./input";
import { Portal } from "./portal";

type SuggestInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Known values offered while typing (any other text is still allowed). */
  suggestions: readonly string[];
  placeholder?: string;
  leading?: ReactNode;
  className?: string;
  id?: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  onBlur?: () => void;
};

const MAX_SUGGESTIONS = 8;

/**
 * Free text with suggestions (WAI-ARIA combobox, list autocomplete): replaces the browser's <datalist>,
 * which can't be styled and looks different everywhere. Matches anywhere in the text (case-insensitive);
 * ↑ ↓ move, Enter picks, Escape closes the list (not a surrounding dialog).
 */
export function SuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  leading,
  className,
  id,
  name,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  onBlur,
}: SuggestInputProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const query = value.trim().toLowerCase();
  const matches = suggestions.filter((s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query).slice(0, MAX_SUGGESTIONS);
  const visible = open && matches.length > 0;

  useDismiss(visible, [wrapperRef, panelRef], () => setOpen(false));
  useAnchoredPosition(wrapperRef, panelRef, visible, { matchWidth: true, offset: 4 });

  const choose = (text: string) => {
    onChange(text);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (matches.length) setActive((i) => (i + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (matches.length) setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (event.key === "Enter" && visible && active >= 0) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === "Escape" && visible) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <>
      <div ref={wrapperRef} className={cn("relative", className)}>
        {leading && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle">{leading}</span>}
        <input
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={visible}
          aria-controls={visible ? listId : undefined}
          aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || undefined}
          aria-required={ariaRequired || undefined}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
          className={cn(fieldStyles, "h-9 px-3 pointer-coarse:h-11", leading && "pl-9", visible && "border-accent ring-3 ring-accent/20")}
        />
      </div>

      <Portal>
        <AnimatePresence>
          {visible && (
            <m.div
              ref={panelRef}
              style={{ top: 0, left: 0, visibility: "hidden" }}
              className="fixed z-60 max-w-popover overflow-hidden rounded-panel border border-line bg-surface shadow-overlay"
              variants={menuPanel}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ul id={listId} role="listbox" aria-label="Suggestions" className="max-h-[min(var(--panel-max-height,16rem),16rem)] overflow-y-auto p-1.5 scrollbar-thin">
                {matches.map((text, index) => (
                  <m.li
                    key={text}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    variants={menuItem}
                    onPointerMove={() => index !== active && setActive(index)}
                    // Keep focus in the input; the click still picks.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(text)}
                    className="relative flex min-h-9 cursor-pointer items-center rounded-control px-2.5 text-ui text-ink select-none pointer-coarse:min-h-11"
                  >
                    {index === active && (
                      <m.span aria-hidden layoutId={`${listId}-highlight`} transition={highlightSpring} className="absolute inset-0 rounded-control bg-paper-2" />
                    )}
                    <span className="relative truncate">{highlight(text, query)}</span>
                  </m.li>
                ))}
              </ul>
            </m.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

/** The typed part in bold: "Lake" → "Dhanmondi **Lake**view Hospital". */
function highlight(text: string, query: string): ReactNode {
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold">{text.slice(at, at + query.length)}</strong>
      {text.slice(at + query.length)}
    </>
  );
}
