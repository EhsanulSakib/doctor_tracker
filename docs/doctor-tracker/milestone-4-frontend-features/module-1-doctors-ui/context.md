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
