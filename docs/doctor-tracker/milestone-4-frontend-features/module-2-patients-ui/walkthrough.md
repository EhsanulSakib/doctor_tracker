# Module 4.2 — Patients UI: Walkthrough

## What was built
- `/patients`: every patient, with search, inline status / condition filters, a Filters dialog (gender, doctor, admission range, sort too), removable tokens, sortable columns, pages, and new / edit / move / delete.
- `DoctorSelect`: a searchable doctor picker backed by the API, used for the doctor filter and in the patient form.

## Reusing the 4.1 pattern
The page is the doctors list again: parse the URL on the server, fetch in parallel, then hand data + params to a client view that navigates inside a transition. The parts both lists share are now real shared code:
- `useNavigateTransition()` returns `[isPending, navigate(href)]`.
- `<FilterTokens tokens onClearAll>` and `<FiltersButton count>` give one look for active filters everywhere.
- `lib/list-params.ts` adds `readObjectId` for `?doctorId=`.

## An async combobox, step by step
1. **Input, not button:** an editable combobox keeps focus in the input. The list is announced via `aria-activedescendant`, and options use `onMouseDown preventDefault` so clicking one doesn't steal focus. This is what makes it safe inside a modal dialog.
2. **Fetching:** opening loads the first 20 doctors. Typing calls a 250 ms debounced search. Each request takes a number, and only the latest may write the results (`requestRef`), so a slow old answer never overwrites a newer one.
3. **No stale picks:** the list on screen can belong to an older search for a moment (debounce + network). Until `resultsFor` equals the typed text, the old results are filtered by name, and the highlight resets to the first match on each keystroke. Enter always picks something that matches what you see.
4. **Escape:** handled in the input and stopped there while the list is open, so it closes the list, not the surrounding dialog.
5. **Display value:** the input shows the chosen doctor's name while you aren't typing (`query === null`) and your text while you are. Closing reverts to the name.

## One dialog, two modes
`PatientFormDialog` takes `fixedDoctor` on a doctor profile (no picker; created through `/doctors/:id/patients`). Without it, the form has a doctor field: a new patient goes to `POST /api/patients` with `doctorId`, and an edit sends `doctorId` only when the doctor changed. That reassigns the patient and creates a "moved" notification.

## Checkpoint summary
- 17/17 browser checks, all regressions green, typecheck / lint / build clean.
- Next: **4.3 Dashboard UI** (stats from `/api/dashboard/stats`, charts).
