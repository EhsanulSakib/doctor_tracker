import { Router } from 'express';
import { staffAccess } from '../../middleware/auth.js';
import * as patients from './patients.controller.js';

export const patientsRouter = Router();

patientsRouter.use(staffAccess);

patientsRouter.get('/', patients.list);
patientsRouter.post('/', patients.create);
patientsRouter.get('/:id', patients.getById);
patientsRouter.patch('/:id', patients.update);
patientsRouter.delete('/:id', patients.remove);
