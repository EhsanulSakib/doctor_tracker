# Module 3.1 — Scaffold + Design System: Context

## Design tokens ("Clinical ledger")
| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#FAF9F6` | `#121417` | app background |
| `--surface` | `#FFFFFF` | `#181B1F` | tables, dialogs |
| `--ink` | `#1C1F23` | `#E8E6E1` | primary text |
| `--ink-muted` | `#5D6670` | `#9AA2AB` | secondary text |
| `--line` | `#E6E3DC` | `#2A2F35` | hairline borders |
| `--accent` | `#0F6E6E` | `#3BA6A6` | primary actions, active nav |
| `--accent-soft` | `#E3F0EF` | `#163332` | selected rows, chips |
| `--danger` / `--warning` / `--success` | muted clinical red / amber / green | lighter variants | statuses, destructive actions |

Radius: 6px controls, 10px panels (no pill-shaped cards). Shadows: almost none, only on dialogs and popovers. Spacing: 4px base scale.

## Typography
IBM Plex Sans 400/500/600 for UI; IBM Plex Mono for IDs and figures; `font-variant-numeric: tabular-nums` in tables and KPIs. Page titles 22–24px/600, section labels 11–12px uppercase with letter-spacing.

## Primitive API conventions
- Each primitive is a small, typed component; variants via a `variant`/`size` prop mapped to class strings (no CSS-in-JS).
- Every interactive primitive is keyboard operable, has a visible focus ring (`--accent`), and the correct ARIA role.
- `cn()` helper = `clsx`, plus a tiny conflict-free class merge (or `tailwind-merge` if conflicts appear).
- Motion durations 150–250 ms, ease `[0.2, 0.8, 0.2, 1]`; with reduced motion, transforms are skipped and only opacity changes.

## Fetch layer contract
```ts
serverFetch<T>(path: string, init?: { searchParams?: Record<string, string | undefined> }): Promise<T>   // throws ApiError
clientFetch<T>(path: string, init?: { method, body }): Promise<T>                                       // throws ApiError
class ApiError extends Error { status: number; code: string; details?: unknown }
```
