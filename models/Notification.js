import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Recipient is required'] },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    message: { type: String, required: [true, 'Message is required'] },
    type: {
      type: String,
      enum: ['email', 'whatsapp', 'push', 'sms'],
      required: [true, 'Notification type is required'],
    },
    link: String,
    isRead: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ type: 1 });

const Notification = model('Notification', NotificationSchema);
export default Notification;
