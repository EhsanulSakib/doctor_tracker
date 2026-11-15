"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { fieldStyles } from "@/components/ui/input";
import { Portal } from "@/components/ui/portal";
import { Spinner } from "@/components/ui/spinner";
import { useAnchoredPosition } from "@/hooks/use-anchored-position";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { useDismiss } from "@/hooks/use-dismiss";
import { clientFetch } from "@/lib/api/client-fetch";
import type { ApiData } from "@/lib/api/types";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** `GET /api/doctors/options` item. */
export type DoctorOption = { id: string; name: string; specialization: string };

type DoctorSelectProps = {
  value: DoctorOption | null;
  onChange: (doctor: DoctorOption | null) => void;
  placeholder?: string;
  /** Shows a × that clears the choice (filters). */
  clearable?: boolean;
  className?: string;
  /** From <Field>: id for the input and the label's id. Otherwise pass aria-label. */
  id?: string;
  labelId?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  onBlur?: () => void;
};

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Searchable doctor picker (WAI-ARIA editable combobox with list autocomplete). Typing searches the
 * API (debounced, ≤ 20 matches by name, email or phone); focus stays in the input, the highlighted
 * option is announced via aria-activedescendant. Keys: ↓ opens / moves, ↑ moves, Enter picks,
 * Escape closes (without closing a surrounding dialog), Tab leaves.
 */
export function DoctorSelect({
  value,
  onChange,
  placeholder = "Search doctors",
  clearable = false,
  className,
  id,
  labelId,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  onBlur,
}: DoctorSelectProps) {
  const [open, setOpen] = useState(false);
  // null = not typing: the input shows the chosen doctor's name.
  const [query, setQuery] = useState<string | null>(null);
  const [options, setOptions] = useState<DoctorOption[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  // The search the current options answer (lower-cased); differs from the typed text until the debounced request returns.
  const [resultsFor, setResultsFor] = useState("");
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  // Until the results for what's typed arrive (debounce + request), narrow the previous results to it, so
  // the list (and Enter) never offers a doctor that doesn't match; the server's answer (it also matches
  // email and phone) then replaces them.
  const typed = query?.trim().toLowerCase() ?? "";
  const shown = typed && typed !== resultsFor ? options.filter((d) => d.name.toLowerCase().includes(typed)) : options;

  // Only the latest request may update the list (an older, slower answer must not overwrite it).
  const load = async (search: string) => {
    const request = ++requestRef.current;
    setStatus("loading");
    try {
      const res = await clientFetch<ApiData<DoctorOption[]>>("/doctors/options", { searchParams: { search: search.trim() } });
      if (request !== requestRef.current) return;
      setOptions(res.data);
      setResultsFor(search.trim().toLowerCase());
      setActive(Math.max(0, res.data.findIndex((d) => d.id === value?.id)));
      setStatus("ready");
    } catch {
      if (request === requestRef.current) setStatus("error");
    }
  };
  const loadDebounced = useDebouncedCallback(load, 250);

  const openList = () => {
    if (open) return;
    setOpen(true);
    void load(query ?? "");
  };
  const close = () => {
    loadDebounced.cancel();
    setOpen(false);
    setQuery(null);
  };
  const choose = (doctor: DoctorOption) => {
    onChange(doctor);
    close();
  };

  // Keep the highlighted option in view (on open it is the current doctor, which may be far down).
  useEffect(() => {
    if (open) document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, shown, listId]);

  useDismiss(open, [wrapperRef, panelRef], close);
  useAnchoredPosition(wrapperRef, panelRef, open, { matchWidth: true });

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else if (shown.length) setActive((i) => (i + 1) % shown.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open && shown.length) setActive((i) => (i - 1 + shown.length) % shown.length);
        break;
      case "Enter":
        if (open) {
          // Never submit the surrounding form while the list is open.
          event.preventDefault();
          if (shown[active]) choose(shown[active]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
      case "Tab":
        if (open) close();
        break;
    }
  };

  const message =
    status === "loading" && shown.length === 0
      ? "Searching…"
      : status === "error"
        ? "Couldn't load doctors. Type to try again."
        : status === "ready" && options.length === 0
          ? "No doctors found"
          : null;

  return (
    <>
      <div ref={wrapperRef} className={cn("relative", className)}>
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle">
          {open && status === "loading" ? <Spinner size={14} /> : <SearchIcon />}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && shown[active] ? optionId(active) : undefined}
          aria-autocomplete="list"
          aria-labelledby={labelId}
          aria-label={labelId ? undefined : ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || undefined}
          aria-required={ariaRequired || undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query ?? value?.name ?? ""}
          onClick={openList}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            if (!open) setOpen(true);
            loadDebounced(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            close();
            onBlur?.();
          }}
          className={cn(fieldStyles, "h-9 pr-9 pl-9 pointer-coarse:h-11", open && "border-accent ring-3 ring-accent/20")}
        />
        {clearable && value ? (
          <button
            type="button"
            aria-label={`Clear doctor: ${value.name}`}
            onClick={() => {
              onChange(null);
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-ink-muted hover:bg-paper-2 hover:text-ink focus-ring pointer-coarse:size-9"
          >
            <XIcon size={14} />
          </button>
        ) : (
          <ChevronDownIcon
            aria-hidden
            className={cn("pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle transition-transform duration-150", open && "rotate-180")}
          />
        )}
      </div>

      <Portal>
        <AnimatePresence>
          {open && (
            <m.div
              ref={panelRef}
              style={{ top: 0, left: 0, visibility: "hidden" }}
              className="fixed z-60 max-w-[calc(100vw-16px)] overflow-hidden rounded-panel border border-line bg-surface shadow-overlay"
              variants={popIn}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ul
                id={listId}
                role="listbox"
                aria-labelledby={labelId}
                aria-label={labelId ? undefined : (ariaLabel ?? "Doctors")}
                aria-busy={status === "loading"}
                className="max-h-[min(var(--panel-max-height,18rem),18rem)] overflow-y-auto overscroll-contain p-1"
              >
                {shown.map((doctor, index) => {
                  const selected = doctor.id === value?.id;
                  return (
                    <li
                      key={doctor.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-[4px] px-2.5 py-2 text-sm text-ink select-none pointer-coarse:py-3",
                        index === active && "bg-paper-2",
                        selected && "font-medium",
                      )}
                      onPointerMove={() => index !== active && setActive(index)}
                      // Keep focus in the input (combobox pattern); the click still picks.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(doctor)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{doctor.name}</span>
                        <span className="block truncate text-xs font-normal text-ink-muted">{doctor.specialization}</span>
                      </span>
                      {selected && <CheckIcon className="shrink-0 text-accent-fg" />}
                    </li>
                  );
                })}
              </ul>
              {message && (
                <p role="status" className="px-3.5 py-3 text-[13px] text-ink-muted">
                  {message}
                </p>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
