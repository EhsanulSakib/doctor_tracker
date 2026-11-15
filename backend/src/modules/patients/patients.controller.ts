import { handler } from '../../lib/handler.js';
import { idParamsSchema } from '../../lib/schemas.js';
import {
  createDoctorPatientSchema,
  createPatientSchema,
  listDoctorPatientsQuerySchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from './patients.schema.js';
import * as patientsService from './patients.service.js';

export const list = handler({ query: listPatientsQuerySchema }, async ({ query }, _req, res) => {
  res.json(await patientsService.listPatients(query));
});

export const getById = handler({ params: idParamsSchema }, async ({ params }, _req, res) => {
  res.json({ data: await patientsService.getPatient(params.id) });
});

export const create = handler({ body: createPatientSchema }, async ({ body }, _req, res) => {
  res.status(201).json({ data: await patientsService.createPatient(body) });
});

export const update = handler({ params: idParamsSchema, body: updatePatientSchema }, async ({ params, body }, _req, res) => {
  res.json({ data: await patientsService.updatePatient(params.id, body) });
});

export const remove = handler({ params: idParamsSchema }, async ({ params }, _req, res) => {
  await patientsService.deletePatient(params.id);
  res.status(204).end();
});

// Nested under a doctor: /api/doctors/:id/patients (wired in doctors.routes.ts).

export const listForDoctor = handler(
  { params: idParamsSchema, query: listDoctorPatientsQuerySchema },
  async ({ params, query }, _req, res) => {
    res.json(await patientsService.listDoctorPatients(params.id, query));
  },
);

export const createForDoctor = handler(
  { params: idParamsSchema, body: createDoctorPatientSchema },
  async ({ params, body }, _req, res) => {
    res.status(201).json({ data: await patientsService.createDoctorPatient(params.id, body) });
  },
);
