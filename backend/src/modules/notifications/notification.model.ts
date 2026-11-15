import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { NOTIFICATION_SUBJECT_KINDS, NOTIFICATION_TYPES } from '../../constants/enums.js';

/** Notifications older than this are removed by MongoDB's TTL monitor (runs about once a minute). */
export const NOTIFICATION_TTL_SECONDS = 30 * 24 * 60 * 60;

const notificationSchema = new Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    // Copy is written once, when the event happens: a later rename doesn't rewrite history.
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    subject: {
      type: new Schema(
        {
          kind: { type: String, enum: NOTIFICATION_SUBJECT_KINDS, required: true },
          id: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true, trim: true, maxlength: 80 },
        },
        { _id: false },
      ),
      required: true,
    },
    // One shared inbox for every admin account: read by anyone = read for everyone.
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Newest first with _id as the tie-breaker (stable order for equal timestamps).
notificationSchema.index({ createdAt: -1, _id: -1 });
// Unread count and "mark all as read": equality on readAt (null = unread), then the sort field.
notificationSchema.index({ readAt: 1, createdAt: -1 });
// Cleanup when a doctor or patient is deleted.
notificationSchema.index({ 'subject.id': 1 });
// TTL indexes must be single-field, so this can't double as the listing index above.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_SECONDS });

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationDoc = Notification & { _id: Types.ObjectId };

export const NotificationModel = model('Notification', notificationSchema);
