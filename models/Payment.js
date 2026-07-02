import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const PaymentSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: [true, 'Booking is required'] },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
    paymentType: {
      type: String,
      enum: ['token', 'installment', 'full'],
      required: [true, 'Payment type is required'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'online', 'bank_transfer'],
      required: [true, 'Payment method is required'],
    },
    transactionId: { type: String, unique: true, sparse: true },
    receiptUrl: String,
    invoiceUrl: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: Date,
    remarks: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ booking: 1 });
PaymentSchema.index({ customer: 1 });
PaymentSchema.index({ status: 1 });

const Payment = model('Payment', PaymentSchema);
export default Payment;
