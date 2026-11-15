# Module 4.1 — Doctors UI: Context

## URL params → API
`/doctors?page=2&limit=20&search=ok&specialization=Neurology&status=active&joinedFrom=2024-01-01&joinedTo=2024-12-31&expMin=5&sort=-joinedAt`
maps 1:1 to `GET /api/doctors` (see the module 2.1 context). Unknown or invalid params are dropped before fetching, so a hand-edited URL never 400s the page.

## Components
```
app/(app)/doctors/page.tsx            (server)
app/(app)/doctors/loading.tsx
app/(app)/doctors/[id]/page.tsx       (server)
features/doctors/components/
  DoctorsToolbar.tsx                  (client) search + filter popover + sort
  DoctorsTable.tsx                    (client, memo rows)
  DoctorRowActions.tsx                (client) edit / delete menu
  DoctorFormDialog.tsx                (client)
  DeleteDoctorDialog.tsx              (client)
  DoctorProfileHeader.tsx             (server)
features/patients/components/
  PatientFormDialog.tsx               (client, shared with 4.2)
```

## Mobile
The table becomes a card list: name + specialization on top, hospital and status below, patient count on the right, actions behind a kebab button. Filters open in a bottom sheet.

## Implementation notes / changes from plan (2026-11-15)
- **No visible page title** (user request, see 3.2): the list starts with its toolbar. The profile's visible doctor name is the page `<h1>`, and the breadcrumb reads `Doctor Tracker › Doctors › Dr. …` (`BreadcrumbTail` puts the name into the top bar).
- **Filters:** a Dialog (bottom sheet on phones) instead of a popover. It holds selects and a date-range picker that open their own floating panels, and inside a dialog those never fight over outside clicks. Specialization and status also sit inline in the toolbar from `xl`. Sorting uses the column headers, plus "Sort by" in the dialog for phones, which have no headers.
- **Active filters** show as removable tokens (8px corners, not pills) with "Clear all". Search isn't repeated as a token.
- **URL as state, no `useSearchParams`:** the server page parses `searchParams` (invalid values dropped) and passes the params down. The client builds the next URL with `doctorsHref(params, patch)` and navigates with `router.replace(…, { scroll: false })` inside `startTransition`. The current rows stay on screen, dimmed (`aria-busy`), until the new page arrives. Paging and sorting use the same transition (buttons, not links), so every change shows the same pending state.
- **Fits the screen on laptops:** the page is a flex column filling `<main>`. `DataTable fill` lets the table take the remaining height and scroll inside, with a sticky header (its bottom rule is an inset shadow, because borders on sticky rows scroll away). Pagination stays visible below.
- **Columns by width:** hospital rides under the specialization below 2xl, experience shows from `lg`, joined from `xl`. Phone cards always show every field.
- **Skeletons:** `loading.tsx` renders the same `DataTable` in loading mode with the same columns. Columns with a non-standard cell (avatar + two lines, badge) provide a `skeleton` of the same box. Measured header and row heights match the real table.
- **Delete guard up front:** the list knows `patientCount`, so a doctor with patients gets "can't be deleted yet" and a "View patients" link instead of a request that would fail. The 409 is still handled for the race where a patient is added meanwhile.
- **Profile counts:** three parallel `GET /doctors/:id/patients?status=…&limit=1` reads (`meta.total`). No new endpoint was needed.
- **Not found:** malformed ids are rejected before any request. A 404 from any of the parallel reads becomes `not-found.tsx`, never the error page (`orNotFound`).
- **After every write:** toast, `router.refresh()`, and `refreshNotifications()` so the bell updates at once.
- React Compiler handles memoisation; columns are module-level constants. (The plan's `React.memo` rows aren't needed.)
