# Module 4.1 — Doctors UI: Walkthrough

## What was built
- `/doctors`: search, filters (inline from `xl` plus a Filters dialog), removable filter tokens, sortable columns, pagination with page size, new / edit / delete.
- `/doctors/[id]`: profile card with contact details and patient stats, then the doctor's patients with their own search, filters, sorting, paging and add / edit / delete.
- Skeletons, empty states and a not-found page, all fitting the screen on laptops with no window scrollbar.

## How a list page works (the pattern 4.2 reuses)
1. **Server page** (`app/(app)/doctors/page.tsx`): `parseDoctorParams(await searchParams)` turns the URL into a valid query and silently drops anything the API would reject. It then fetches the doctors and the hospitals in parallel and passes plain data to the client view. A page past the end (after deleting the last row) redirects to the last real page.
2. **Client view** (`DoctorsView`): renders the toolbar, the tokens, the table and the pagination from those props. Every interaction calls `navigate(patch)`: build the next URL with `doctorsHref(params, patch)` (the page resets to 1 unless only the page changed), then call `router.replace` inside `startTransition`. Next keeps rendering the old page until the new one is ready, and `isPending` dims the table meanwhile.
3. **Why no `useSearchParams`:** the server already parsed the params, so the client never reads the URL itself. That leaves one source of truth and nothing to keep in sync.

## Forms
- React Hook Form + `zodResolver` with a schema that mirrors the backend rules. Selects start as `""`, so the form-values type differs from the schema input; the resolver is cast once, with a comment.
- The form lives *inside* the dialog body, keyed by the record id, so it remounts with fresh values every time the dialog opens. It tells the dialog when it's saving, and the dialog can't be dismissed meanwhile.
- API errors: `error.fieldErrors` (validation details, or `details.fields` for a 409 duplicate email) map straight onto `setError(field)`. Anything else becomes a form-level `FormAlert`.

## Layout tricks worth knowing
- **Table that fills the remaining height:** a chain of `flex flex-col` + `min-h-0` from `<main>` down to the table's scroll box (`DataTable fill`). Without `min-h-0`, a flex child refuses to shrink below its content and the page grows instead.
- **Sticky header in a scroll box:** `position: sticky` on the `th` cells with an opaque background. The bottom rule is `box-shadow: inset 0 -1px`, because a border on a sticky row scrolls away.
- **Truncation in tables and grids:** `truncate` needs a width limit. Table cells and grid items don't shrink below their content by default, so cap the cell content (`max-w-64`) and use `grid-cols-1` (= `minmax(0, 1fr)`) for the phone card list.
- **Skeleton boxes:** vertical margins of block siblings collapse (3px + 2px becomes 3px), so a stack of bars with margins sits in a `flex flex-col` where margins add up. Measure the skeleton against the real row instead of trusting the arithmetic.
- **Search box focus:** never key an input by the value it's editing. Key it by a counter that changes only when something outside resets it.

## Checkpoint summary
- 32/32 browser checks (desktop + phone), regressions green, typecheck / lint / build clean.
- Next: **4.2 Patients UI**. It reuses `PatientFormDialog` (adding a doctor picker), `list-params`, `DataTable fill` and the same page pattern.
