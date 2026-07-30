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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ status: 1 });

const Lead = model('Lead', LeadSchema);
export default Lead;
