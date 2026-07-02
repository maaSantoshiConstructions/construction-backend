import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const CustomerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'User is required'] },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    purchaseDate: Date,
    totalPaid: { type: Number, min: 0, default: 0 },
    documents: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ user: 1 }, { unique: true });
CustomerSchema.index({ project: 1 });
CustomerSchema.index({ booking: 1 });

const Customer = model('Customer', CustomerSchema);
export default Customer;
