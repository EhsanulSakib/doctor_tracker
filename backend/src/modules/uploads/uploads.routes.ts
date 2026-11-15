import { Router } from 'express';
import { z } from 'zod';
import { UPLOAD_KINDS, signUpload } from '../../lib/cloudinary.js';
import { handler } from '../../lib/handler.js';
import { staffAccess } from '../../middleware/auth.js';

export const uploadsRouter = Router();

// staffAccess: the demo account is read-only, so it gets no upload signature either.
uploadsRouter.use(staffAccess);

const signatureSchema = z.object({ kind: z.enum(UPLOAD_KINDS, 'Choose what the image is for') });

/** `{ cloudName, apiKey, timestamp, folder, signature }` for one direct upload to Cloudinary. */
uploadsRouter.post(
  '/signature',
  handler({ body: signatureSchema }, ({ body }, _req, res) => {
    res.json({ data: signUpload(body.kind) });
  }),
);
