import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const SiteVisitSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project is required'] },
    salesExecutive: { type: Schema.Types.ObjectId, ref: 'User' },
    preferredDate: { type: Date, required: [true, 'Preferred date is required'] },
    preferredTime: String,
    pickupLocation: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
      default: 'pending',
    },
    notes: String,
    feedback: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SiteVisitSchema.index({ customer: 1 });
SiteVisitSchema.index({ project: 1 });
SiteVisitSchema.index({ status: 1 });
SiteVisitSchema.index({ preferredDate: 1 });

const SiteVisit = model('SiteVisit', SiteVisitSchema);
export default SiteVisit;
