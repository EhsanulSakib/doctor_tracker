import { handler } from '../../lib/handler.js';
import { idParamsSchema } from '../../lib/schemas.js';
import {
  createDoctorSchema,
  doctorOptionsQuerySchema,
  listDoctorsQuerySchema,
  updateDoctorSchema,
} from './doctors.schema.js';
import * as doctorsService from './doctors.service.js';

export const list = handler({ query: listDoctorsQuerySchema }, async ({ query }, _req, res) => {
  res.json(await doctorsService.listDoctors(query));
});

export const getById = handler({ params: idParamsSchema }, async ({ params }, _req, res) => {
  res.json({ data: await doctorsService.getDoctor(params.id) });
});

export const create = handler({ body: createDoctorSchema }, async ({ body }, _req, res) => {
  res.status(201).json({ data: await doctorsService.createDoctor(body) });
});

export const update = handler({ params: idParamsSchema, body: updateDoctorSchema }, async ({ params, body }, _req, res) => {
  res.json({ data: await doctorsService.updateDoctor(params.id, body) });
});

export const remove = handler({ params: idParamsSchema }, async ({ params }, _req, res) => {
  res.json({ data: await doctorsService.deleteDoctor(params.id) });
});

export const hospitals = handler({}, async (_input, _req, res) => {
  res.json({ data: await doctorsService.listHospitals() });
});

export const options = handler({ query: doctorOptionsQuerySchema }, async ({ query }, _req, res) => {
  res.json({ data: await doctorsService.listDoctorOptions(query.search) });
});
