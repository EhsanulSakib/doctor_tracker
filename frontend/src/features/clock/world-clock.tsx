"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ClockIcon, PlusIcon, StarIcon, XIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { addZone, removeZone, setMainZone, useClockPreferences, type ClockPreferences } from "./clock-preferences";
import { MonthCalendar } from "./month-calendar";
import { TimezoneCombobox } from "./timezone-combobox";
import {
  cityOf,
  dayRelation,
  formatLongDate,
  formatShortDay,
  formatTime,
  MAX_ZONES,
  offsetLabel,
  offsetMinutes,
  relativeOffset,
  zoneDateIso,
  zoneLongName,
} from "./time";

/**
 * Fixed box per breakpoint, so the time filling in after hydration (and "9:59" becoming "10:00")
 * never moves the icons next to it. Phones: icon only. `sm`: time. `lg`: + date. `xl`: + city.
 */
const TRIGGER_BOX =
  "flex size-9 shrink-0 items-center justify-center gap-2 rounded-control text-ui pointer-coarse:size-11 " +
  "sm:w-29.5 sm:justify-start sm:border sm:border-line sm:px-2.5 sm:pointer-coarse:w-29.5 " +
  "lg:w-50 lg:pointer-coarse:w-50 xl:w-63 xl:pointer-coarse:w-63";

/** Topbar clock (Bangladesh time by default). Opens a calendar and the user's world clocks. */
export function WorldClock() {
  const now = useNow("minute");
  const { main } = useClockPreferences();
  const city = cityOf(main);

  return (
    <Popover
      label="Calendar and time zones"
      align="end"
      className="max-h-(--panel-max-height) w-85 overflow-y-auto p-0 scrollbar-thin md:w-170"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={now ? `${formatTime(now, main)}, ${formatLongDate(now, main)}, ${city} time. Calendar and time zones` : "Calendar and time zones"}
          className={cn(TRIGGER_BOX, "text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring")}
        >
          <ClockIcon size={17} className="shrink-0" />
          {now ? (
            <>
              <span className="hidden font-semibold tabular-nums text-ink sm:inline">{formatTime(now, main)}</span>
              <span aria-hidden className="hidden h-4 w-px shrink-0 bg-line lg:block" />
              <span className="hidden truncate lg:inline">{formatShortDay(now, main)}</span>
              <span className="hidden min-w-0 truncate text-ink-muted xl:inline">· {city}</span>
            </>
          ) : (
            <>
              <Skeleton className="hidden h-3.5 w-16 sm:block" />
              <Skeleton className="hidden h-3.5 w-20 lg:block" />
            </>
          )}
        </button>
      )}
    >
      <ClockPanel />
    </Popover>
  );
}

function ClockPanel() {
  const now = useNow("second");
  const prefs = useClockPreferences();
  const [adding, setAdding] = useState(false);
  const addButtonId = useId();
  const headingId = useId();
  if (!now) return null;

  const { main, zones } = prefs;
  const mainOffset = offsetMinutes(now, main);

  // Back to "Add time zone" (or the panel itself once the list is full) so Escape / Tab keep working.
  const finishAdding = () => {
    setAdding(false);
    requestAnimationFrame(() => {
      const button = document.getElementById(addButtonId) as HTMLButtonElement | null;
      (button && !button.disabled ? button : button?.closest<HTMLElement>("[role=dialog]"))?.focus();
    });
  };

  return (
    <div className="md:grid md:grid-cols-[300px_1fr]">
      <section aria-label="Calendar" className="p-4 md:border-r md:border-line">
        <p className="text-figure leading-8 font-semibold tracking-tight tabular-nums text-ink">{formatTime(now, main, true)}</p>
        <p className="mt-1 text-ui text-ink-muted">{formatLongDate(now, main)}</p>
        <p className="text-xs text-ink-subtle">
          {cityOf(main)} · {offsetLabel(mainOffset)}
        </p>
        <div className="mt-4 border-t border-line pt-3">
          <MonthCalendar today={zoneDateIso(now, main)} />
        </div>
      </section>

      <section aria-labelledby={headingId} className="border-t border-line p-2 md:border-t-0">
        <h3 id={headingId} className="px-2 pt-2 pb-1 text-label font-semibold text-ink-muted uppercase">
          Time zones
        </h3>
        <ul className="space-y-0.5">
          {zones.map((zone) => (
            <ZoneRow key={zone} zone={zone} now={now} prefs={prefs} mainOffset={mainOffset} />
          ))}
        </ul>

        {adding ? (
          <TimezoneCombobox
            exclude={zones}
            now={now}
            onSelect={(zone) => {
              addZone(prefs, zone);
              finishAdding();
            }}
            onCancel={finishAdding}
          />
        ) : (
          <div className="flex items-center gap-2 px-1 pt-1">
            <Button
              id={addButtonId}
              variant="ghost"
              size="sm"
              icon={<PlusIcon />}
              disabled={zones.length >= MAX_ZONES}
              onClick={() => setAdding(true)}
            >
              Add time zone
            </Button>
            {zones.length >= MAX_ZONES && <span className="text-xs text-ink-muted">Up to {MAX_ZONES}</span>}
          </div>
        )}
      </section>
    </div>
  );
}

function ZoneRow({ zone, now, prefs, mainOffset }: { zone: string; now: Date; prefs: ClockPreferences; mainOffset: number }) {
  const isMain = zone === prefs.main;
  const city = cityOf(zone);
  const relation = dayRelation(now, zone, prefs.main);
  const detail = isMain
    ? `${offsetLabel(mainOffset)} · ${zoneLongName(now, zone)}`
    : [relativeOffset(offsetMinutes(now, zone) - mainOffset), relation].filter(Boolean).join(" · ");

  return (
    <li className="flex items-center gap-2 rounded-control py-1.5 pr-1 pl-2 transition-colors hover:bg-paper-2">
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5 text-ui font-medium text-ink">
          <span className="truncate">{city}</span>
          {isMain && <span className="shrink-0 text-xs font-medium text-accent-fg">Main</span>}
        </p>
        <p className="truncate text-xs text-ink-muted">{detail}</p>
      </div>
      <span className="shrink-0 text-ui font-semibold tabular-nums text-ink">{formatTime(now, zone)}</span>
      <div className="flex shrink-0 items-center">
        {isMain ? (
          <span className="flex size-8 items-center justify-center text-accent-fg pointer-coarse:size-10" title="Main clock">
            <StarIcon className="fill-current" />
          </span>
        ) : (
          <IconButton size="sm" label={`Make ${city} the main clock`} icon={<StarIcon />} onClick={() => setMainZone(prefs, zone)} />
        )}
        <IconButton
          size="sm"
          label={`Remove ${city}`}
          icon={<XIcon />}
          onClick={() => removeZone(prefs, zone)}
          // The main clock can't be removed; the slot stays so every row lines up.
          disabled={isMain}
          className={cn(isMain && "invisible")}
        />
      </div>
    </li>
  );
}
