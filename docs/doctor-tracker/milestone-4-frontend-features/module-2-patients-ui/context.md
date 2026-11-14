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
