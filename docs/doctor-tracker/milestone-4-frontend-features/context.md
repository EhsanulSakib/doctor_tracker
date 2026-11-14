# Milestone 4 — Frontend Features: Context

## Goal
Doctors, Patients and Dashboard pages fully working against the verified API, responsive on desktop and mobile, with loading, empty and error states.

## Relevant decisions
#3–#9 (data, deletes, search, pagination, dashboard, data layer) · #10 UI

## Page pattern (shared by Doctors / Patients / Doctor detail)
1. `page.tsx` (Server Component) receives `searchParams` → validates/normalizes them → `serverFetch` list → renders `<PageHeader>` + `<ListToolbar>` (client) + `<DataTable>` + `<Pagination>`.
2. `ListToolbar` keeps filter **drafts** locally; applying them writes the URL via `useQueryParams` (`router.replace`, `scroll: false`) inside `startTransition`. Search input is debounced 300 ms and resets `page` to 1.
3. While a transition is pending, the table dims slightly (keeping the previous rows instead of flashing a skeleton). `loading.tsx` skeletons appear only on the first navigation.
4. Mutations: dialog form → `clientFetch` → toast → close → `router.refresh()`. Deletes use `ConfirmDialog`.
5. Active filters render as removable chips under the toolbar, plus a "Clear all" action.

## Re-render hygiene
- Server Components do the data work; client islands stay small (toolbar, dialogs, row actions).
- Row action menus and dialogs are separate components so opening one doesn't re-render the table.
- `React.memo` on table rows keyed by id; stable column definitions via module-level constants.
- Charts are client components loaded with `next/dynamic` so Recharts stays out of the other pages' bundles.
