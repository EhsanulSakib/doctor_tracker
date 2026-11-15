"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { fieldStyles } from "@/components/ui/input";
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatTime, offsetLabel, offsetMinutes, searchZones } from "./time";

type TimezoneComboboxProps = {
  /** Zones already on the list (not offered again). */
  exclude: string[];
  now: Date;
  onSelect: (zone: string) => void;
  /** Escape: leave the search without adding anything. */
  onCancel: () => void;
};

/**
 * Editable combobox with a list popup (WAI-ARIA APG "combobox with list autocomplete"): type a city,
 * country or zone name; ArrowUp/Down move through the matches, Enter adds, Escape cancels.
 * The list sits inline inside the clock panel, so it never fights the panel for outside clicks.
 */
export function TimezoneCombobox({ exclude, now, onSelect, onCancel }: TimezoneComboboxProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const options = searchZones(query, exclude, now);
  const activeIndex = Math.min(active, options.length - 1);
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the highlighted option visible while moving with the arrow keys.
  useEffect(() => {
    document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (options.length) setActive((i) => (Math.min(i, options.length - 1) + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (options.length) setActive((i) => (Math.min(i, options.length - 1) - 1 + options.length) % options.length);
        break;
      case "Enter":
        event.preventDefault();
        if (options[activeIndex]) onSelect(options[activeIndex].id);
        break;
      case "Escape":
        // Only the search closes; the clock panel stays open.
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        break;
    }
  };

  return (
    <div className="px-2 pt-1">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search time zones"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={options.length ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="City or time zone"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(fieldStyles, "h-9 pl-8 text-ui pointer-coarse:h-11")}
        />
      </div>

      <ul id={listId} role="listbox" aria-label="Time zones" className="mt-1 max-h-52 overflow-y-auto scrollbar-thin">
        {options.map((option, index) => (
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            // Keep focus in the input (the APG pattern): the click still selects.
            onPointerDown={(event) => event.preventDefault()}
            onPointerMove={() => setActive(index)}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5",
              index === activeIndex && "bg-paper-2",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui font-medium text-ink">{option.city}</span>
              <span className="block truncate text-xs text-ink-muted">
                {option.longName} · {offsetLabel(offsetMinutes(now, option.id))}
              </span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-ink-muted">{formatTime(now, option.id)}</span>
          </li>
        ))}
      </ul>
      {options.length === 0 && <p className="px-2 py-3 text-ui text-ink-muted">No matching time zones</p>}
    </div>
  );
}
