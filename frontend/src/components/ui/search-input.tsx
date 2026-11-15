"use client";

import { useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";
import { SearchIcon, XIcon } from "./icons";
import { Input } from "./input";
import { Spinner } from "./spinner";

type SearchInputProps = {
  /** Initial text (e.g. `?search=` from the URL). Re-key the component to reset it from outside. */
  defaultValue?: string;
  /** Called 300 ms after typing stops, immediately on Enter, and with "" on clear/Escape. */
  onSearch: (value: string) => void;
  /** Accessible name, e.g. "Search doctors". */
  label: string;
  placeholder?: string;
  delay?: number;
  /** Shows a spinner instead of the magnifier while results load. */
  pending?: boolean;
  className?: string;
};

export function SearchInput({ defaultValue = "", onSearch, label, placeholder = "Search…", delay = 300, pending = false, className }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useDebouncedCallback((text: string) => onSearch(text.trim()), delay);

  const clear = () => {
    setValue("");
    search.cancel();
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <Input
      ref={inputRef}
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      autoComplete="off"
      spellCheck={false}
      enterKeyHint="search"
      onChange={(event) => {
        setValue(event.target.value);
        search(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          search.flush();
        } else if (event.key === "Escape" && value) {
          event.preventDefault();
          event.stopPropagation();
          clear();
        }
      }}
      leading={pending ? <Spinner size={15} /> : <SearchIcon />}
      trailing={
        value ? (
          <IconButton label="Clear search" icon={<XIcon size={14} />} size="sm" className="size-7 pointer-coarse:size-9" onClick={clear} />
        ) : undefined
      }
      className={cn("w-full sm:w-72", className)}
    />
  );
}
