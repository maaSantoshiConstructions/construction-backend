import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ConversationEntrySchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    attachments: [String],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SupportTicketSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    subject: { type: String, required: [true, 'Subject is required'], trim: true },
    message: { type: String, required: [true, 'Message is required'] },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    conversation: [ConversationEntrySchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ customer: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ priority: 1 });
SupportTicketSchema.index({ assignedTo: 1 });

const SupportTicket = model('SupportTicket', SupportTicketSchema);
export default SupportTicket;
