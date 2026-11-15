# Milestone 3 — Frontend Foundation: Walkthrough

> Index of every file produced in this milestone. Each module's `walkthrough.md` explains its files in detail.

| Module | Status | Detailed walkthrough |
|---|---|---|
| 3.1 Scaffold + design system | done | [module-1-scaffold-and-design-system/walkthrough.md](module-1-scaffold-and-design-system/walkthrough.md) |
| 3.2 Auth + app shell | not started | — |

## Files added so far
```
frontend/
├── next.config.ts · package.json · tsconfig.json · eslint.config.mjs · .env.example · README.md   3.1
└── src/
    ├── app/{layout,providers,page}.tsx · globals.css                                           3.1
    ├── components/ui/   17 primitives + icons + portal                                           3.1
    ├── hooks/           use-debounce · use-anchored-position · use-dismiss · use-toast           3.1
    ├── lib/             api/{server-fetch,client-fetch,errors,types} · constants · motion · utils 3.1
    └── store/           store · provider · hooks · slices/{ui,toast}                             3.1
```

## File index
| File | Module | One-line purpose |
|---|---|---|
| `next.config.ts` | 3.1 | `/api` rewrite to Express, security headers, Cache Components, React Compiler |
| `src/app/globals.css` | 3.1 | design tokens (light + dark), base styles, `focus-ring` |
| `src/app/layout.tsx` | 3.1 | IBM Plex fonts, metadata, providers |
| `src/app/providers.tsx` | 3.1 | Redux store, lazy motion, reduced motion, `#app-root`, toaster |
| `src/components/ui/button.tsx` · `icon-button.tsx` | 3.1 | buttons (variants, sizes, loading) and labelled icon buttons |
| `src/components/ui/input.tsx` · `field.tsx` | 3.1 | inputs/textarea and label + hint + error wiring |
| `src/components/ui/select.tsx` | 3.1 | accessible custom select (combobox pattern, type-ahead) |
| `src/components/ui/popover.tsx` · `dialog.tsx` · `confirm-dialog.tsx` | 3.1 | overlays: floating panel, modal (bottom sheet on phones), "are you sure?" |
| `src/components/ui/toaster.tsx` | 3.1 | toasts with live-region announcements |
| `src/components/ui/data-table.tsx` · `pagination.tsx` | 3.1 | sortable table (cards on phones), numbered pagination |
| `src/components/ui/search-input.tsx` · `date-range-field.tsx` | 3.1 | debounced search, date-range filter with presets |
| `src/components/ui/badge.tsx` · `spinner.tsx` · `skeleton.tsx` · `empty-state.tsx` | 3.1 | status chips, loading and empty states |
| `src/components/ui/icons.tsx` · `portal.tsx` | 3.1 | SVG icon set; portal + focus helpers |
| `src/hooks/*` | 3.1 | debounce, floating-panel positioning, outside click, toasts |
| `src/lib/api/*` | 3.1 | `serverFetch`, `clientFetch` (single-flight refresh), `ApiError`, response types |
| `src/lib/constants.ts` | 3.1 | enums mirrored from the backend, labels, badge tones, page sizes |
| `src/lib/motion.ts` · `motion-features.ts` | 3.1 | shared motion variants; lazily loaded animation features |
| `src/lib/utils.ts` | 3.1 | `cn()`, Bangladesh date/number formatting, query strings |
| `src/store/*` | 3.1 | Redux store factory, provider, typed hooks, `ui` + `toast` slices |
