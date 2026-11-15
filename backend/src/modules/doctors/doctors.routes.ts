import { Router } from 'express';
import { staffAccess } from '../../middleware/auth.js';
import * as attendance from '../attendance/attendance.controller.js';
import * as patients from '../patients/patients.controller.js';
import * as doctors from './doctors.controller.js';

export const doctorsRouter = Router();

doctorsRouter.use(staffAccess);

// Fixed paths before "/:id" so they are not treated as ids.
doctorsRouter.get('/hospitals', doctors.hospitals);
doctorsRouter.get('/options', doctors.options);

doctorsRouter.get('/', doctors.list);
doctorsRouter.post('/', doctors.create);
doctorsRouter.get('/:id', doctors.getById);
doctorsRouter.patch('/:id', doctors.update);
doctorsRouter.delete('/:id', doctors.remove);

// A doctor's patients. Handlers live in the patients module; the URL lives here with its parent.
doctorsRouter.get('/:id/patients', patients.listForDoctor);
doctorsRouter.post('/:id/patients', patients.createForDoctor);

// Attendance (present / absent / leave per day). Writes go through staffAccess, so the demo account can't mark.
doctorsRouter.get('/:id/attendance', attendance.history);
doctorsRouter.put('/:id/attendance', attendance.mark);
