import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema, model } = mongoose;

const PaymentSchema = new Schema(
  {
    // Auto-generated unique payment identifier e.g. PAY-000001
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Parent relationship
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: [true, 'Booking is required'] },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },

    // Payment details
    amount: { type: Number, required: [true, 'Amount is required'], min: 0 },

    paymentType: {
      type: String,
      enum: ['token', 'installment', 'final_payment', 'loan_disbursement', 'refund'],
      required: [true, 'Payment type is required'],
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'online', 'bank_transfer', 'upi'],
      required: [true, 'Payment method is required'],
    },

    referenceNumber: { type: String, trim: true },

    // Staff member who collected the payment
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Transaction lifecycle status
    transactionStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'success',
    },

    receiptUrl: String,
    invoiceUrl: String,

    paidAt: { type: Date, default: Date.now },
    remarks: String,

    // Soft-delete / cancellation audit fields
    isActive: { type: Boolean, default: true },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
PaymentSchema.index({ booking: 1 });
PaymentSchema.index({ customer: 1 });
PaymentSchema.index({ transactionStatus: 1 });
PaymentSchema.index({ project: 1 });
PaymentSchema.index({ paymentType: 1 });
PaymentSchema.index({ createdAt: 1 });

// ─── Auto-generate paymentId ──────────────────────────────────────────────────
PaymentSchema.pre('save', async function (next) {
  if (!this.paymentId) {
    // Generate sequential-style ID: PAY-000001
    const count = await this.constructor.countDocuments();
    const padded = String(count + 1).padStart(6, '0');
    this.paymentId = `PAY-${padded}`;
  }
  next();
});

const Payment = model('Payment', PaymentSchema);
export default Payment;
