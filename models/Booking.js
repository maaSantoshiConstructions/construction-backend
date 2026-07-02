import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema, model } = mongoose;

const InstallmentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
    receiptUrl: String,
  },
  { _id: false }
);

const BookingSchema = new Schema(
  {
    bookingId: {
      type: String,
      unique: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot', required: [true, 'Plot is required'] },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project is required'] },
    salesExecutive: { type: Schema.Types.ObjectId, ref: 'User' },
    channelPartner: { type: Schema.Types.ObjectId, ref: 'User' },
    bookingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['token', 'partial', 'completed', 'cancelled'],
      default: 'token',
    },
    tokenAmount: { type: Number, min: 0 },
    totalAmount: { type: Number, required: [true, 'Total amount is required'], min: 0 },
    paymentPlan: {
      type: String,
      enum: ['full_payment', 'installment', 'loan'],
      default: 'full_payment',
    },
    installments: [InstallmentSchema],
    documents: [String],
    remarks: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BookingSchema.index({ customer: 1 });
BookingSchema.index({ plot: 1 });
BookingSchema.index({ project: 1 });
BookingSchema.index({ status: 1 });

BookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    this.bookingId = `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

const Booking = model('Booking', BookingSchema);
export default Booking;
