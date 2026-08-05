import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const LeadSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    source: {
      type: String,
      enum: {
        values: [
          'website',
          'website_contact',
          'website_register',
          'whatsapp',
          'referral',
          'customer_referral',
          'walk_in',
          'phone_call',
          'social_media',
          'other',
        ],
        message: '{VALUE} is not a valid lead source',
      },
      required: [true, 'Lead source is required'],
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booking_done', 'lost'],
      default: 'new',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    requirement: { type: String },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    referralCode: { type: String, trim: true },
    referrerInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    commissionAmount: { type: Number, default: 0 },
    notes: [
      {
        text: String,
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Pre-validate hook: normalize notes (string or array of strings -> subdocument array) ──
LeadSchema.pre('validate', function (next) {
  if (typeof this.notes === 'string') {
    this.notes = [{ text: this.notes }];
  } else if (Array.isArray(this.notes)) {
    this.notes = this.notes.map((n) => (typeof n === 'string' ? { text: n } : n));
  }
  next();
});

LeadSchema.index({ email: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ project: 1 });
LeadSchema.index({ referredBy: 1 });

const Lead = model('Lead', LeadSchema);
export default Lead;
