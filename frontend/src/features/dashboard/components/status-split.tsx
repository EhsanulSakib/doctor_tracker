import { PATIENT_STATUS_LABELS, type PatientStatus } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import { percent } from "../format";

// Same hues as the status badges everywhere else; validated as a set (light and dark card surfaces).
const FILL: Record<PatientStatus, string> = {
  active: "bg-chart-active",
  under_treatment: "bg-chart-treatment",
  recovered: "bg-chart-recovered",
};
// Text printed on a fill: white on the blue and green, near-black on the amber (by the fill's luminance, both themes).
const ON_FILL: Record<PatientStatus, string> = { active: "text-accent-ink", under_treatment: "text-chart-ink", recovered: "text-accent-ink" };

/**
 * One whole (all patients) in three parts: a tall segmented bar (28px, 2px surface gaps, each part's share
 * printed on it when wide enough) plus a legend with the counts. Not a donut: blocks on one line are easier
 * to compare. Identity never relies on colour alone: every part is named in the legend and in its label.
 */
export function StatusSplit({ data, delay = 0 }: { data: { key: PatientStatus; count: number }[]; delay?: number }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div
        role="img"
        aria-label={data.map((d) => `${PATIENT_STATUS_LABELS[d.key]} ${d.count} (${percent(d.count, total)})`).join(", ")}
        className="flex h-7 w-full gap-0.5"
      >
        {data
          .filter((d) => d.count > 0)
          .map((d, index) => {
            const share = d.count / total;
            const at = delay + index * 120;
            return (
              <div
                key={d.key}
                title={`${PATIENT_STATUS_LABELS[d.key]}: ${formatNumber(d.count)} (${percent(d.count, total)})`}
                className={cn("flex h-full min-w-1 origin-left items-center rounded-mark px-2 text-xs font-semibold motion-safe:animate-grow-x", FILL[d.key], ON_FILL[d.key])}
                style={{ flexGrow: share, flexBasis: 0, animationDelay: `${at}ms` }}
              >
                {/* Printed only where it fits comfortably; otherwise the legend carries it. */}
                {share >= 0.12 && (
                  <span className="tabular-nums motion-safe:animate-fade-in" style={{ animationDelay: `${at + 450}ms` }}>
                    {percent(d.count, total)}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      <ul className="grid gap-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-ui leading-4.5">
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-mark", FILL[d.key])} />
            <span className="min-w-0 flex-1 truncate text-ink">{PATIENT_STATUS_LABELS[d.key]}</span>
            <span className="font-medium text-ink tabular-nums">{formatNumber(d.count)}</span>
            <span className="w-10 text-right text-ink-muted tabular-nums">{percent(d.count, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
