import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ConversationLogEntrySchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    message: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const LeadSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    source: {
      type: String,
      enum: {
        values: ['website', 'website_contact', 'whatsapp', 'referral', 'walk_in', 'phone_call', 'social_media', 'other'],
        message: '{VALUE} is not a valid lead source',
      },
      required: [true, 'Lead source is required'],
    },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booking_done', 'lost'],
      default: 'new',
    },
    score: { type: Number, default: 0, min: 0, max: 100 },
    followUpDate: Date,
    notes: [String],
    conversationLog: [ConversationLogEntrySchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ followUpDate: 1 });

const Lead = model('Lead', LeadSchema);
export default Lead;
