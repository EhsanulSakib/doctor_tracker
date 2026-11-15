# Module 4.2 — Patients UI: Context

## URL params → API
`/patients?page=1&limit=10&search=ali&condition=Diabetes&status=under_treatment&gender=female&doctorId=<id>&admittedFrom=2026-01-01&admittedTo=2026-06-30&sort=-admissionDate`
maps 1:1 to `GET /api/patients` (see the module 2.2 context).

## Components
```
app/(app)/patients/page.tsx           (server)
app/(app)/patients/loading.tsx
features/patients/components/
  PatientsToolbar.tsx                 (client)
  PatientsTable.tsx                   (client, memo rows)
  PatientRowActions.tsx               (client)
  PatientFormDialog.tsx               (client, from 4.1)
  DeletePatientDialog.tsx             (client)
features/doctors/components/
  DoctorSelect.tsx                    (client, async)
```

## Status / condition badges
Status → semantic tone (active = teal, under treatment = amber, recovered = green). Condition → neutral outline badge, so the table doesn't turn into a rainbow.

## Implementation notes / changes from plan (2026-11-15)
- **Same page pattern as 4.1:** the server parses the params and fetches, and the client view navigates inside a transition, dimming the table while it loads. `useNavigateTransition()` and `FilterTokens` are now shared by both lists.
- **Doctor filter:** `?doctorId=` is validated as an id. The server fetches that doctor's name for the token and the picker (`getDoctorOption`). If the doctor no longer exists, the page redirects without the filter instead of showing an unexplained empty list.
- **`DoctorSelect`:** an editable combobox rather than a button + popover. Focus stays in the input, so it works inside dialogs (Escape closes only its list) without a second focus scope.
  - Results come from `/api/doctors/options` (≤ 20, matched by name, email or phone), debounced, and only the latest request may update the list.
  - Until results for the typed text arrive, the previous results are narrowed to matching names, so Enter can't pick a stale highlight.
- **Columns:** age, gender and phone ride on the patient's second line, because a column each wouldn't fit a laptop. Condition is plain text: the plan's outline badge was dropped to avoid more pill shapes, and status already has a badge. The doctor shows as a profile link with the specialization below. Admitted shows from `xl`.
- **Create on this page too** (the plan only had edit): "New patient" with the doctor picker (`POST /api/patients`). Editing with another doctor sends `doctorId`, which reassigns (toast "Patient moved").
- **`PatientFormDialog` modes:** `fixedDoctor` (doctor profile: no picker, create through `/doctors/:id/patients`) or picker mode (patients page). A `DOCTOR_NOT_FOUND` error lands on the doctor field, or becomes a form error when the doctor is fixed.
