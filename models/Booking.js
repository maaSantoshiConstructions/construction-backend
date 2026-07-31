import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema, model } = mongoose;

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

    // Booking lifecycle status — independent of payment
    bookingStatus: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },

    // Payment financial status — system-calculated only, never set manually
    paymentStatus: {
      type: String,
      enum: ['token_paid', 'partially_paid', 'fully_paid', 'refunded'],
      default: 'token_paid',
    },

    paymentPlan: {
      type: String,
      enum: ['full_payment', 'installment', 'loan'],
      default: 'full_payment',
    },

    totalAmount: { type: Number, required: [true, 'Total amount is required'], min: 0 },
    tokenAmount: { type: Number, min: 0, default: 0 },

    // System-maintained payment totals — updated automatically on every payment event
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0, min: 0 },
    lastPaymentDate: { type: Date },

    documents: [String],
    remarks: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
BookingSchema.index({ customer: 1 });
BookingSchema.index({ plot: 1 });
BookingSchema.index({ project: 1 });
BookingSchema.index({ bookingStatus: 1 });
BookingSchema.index({ paymentStatus: 1 });

// ─── Auto-generate bookingId ──────────────────────────────────────────────────
BookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    this.bookingId = `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

// ─── Instance method: calculate paymentStatus from amounts ───────────────────
BookingSchema.methods.calculatePaymentStatus = function () {
  const { paidAmount, tokenAmount, totalAmount } = this;

  if (paidAmount <= 0) return 'token_paid';
  if (paidAmount <= tokenAmount) return 'token_paid';
  if (paidAmount < totalAmount) return 'partially_paid';
  if (paidAmount >= totalAmount) return 'fully_paid';
  return 'token_paid';
};

// ─── Pre-save hook: auto-calculate remainingAmount and paymentStatus ─────────
BookingSchema.pre('save', function (next) {
  // Ensure paidAmount is never negative
  if (this.paidAmount < 0) this.paidAmount = 0;

  // Recalculate remaining
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  // Auto-set paymentStatus based on amounts
  this.paymentStatus = this.calculatePaymentStatus();

  next();
});

// ─── Helper: sync associated Plot status ─────────────────────────────────────
const syncPlotStatus = async (bookingDoc) => {
  const Plot = mongoose.model('Plot');

  let plotStatus = 'available';
  let owner = null;

  if (bookingDoc.isActive && bookingDoc.bookingStatus !== 'cancelled') {
    if (bookingDoc.bookingStatus === 'completed') {
      plotStatus = 'sold';
      owner = bookingDoc.customer;
    } else if (bookingDoc.bookingStatus === 'active') {
      plotStatus = 'reserved';
      owner = bookingDoc.customer;
    }
  }

  await Plot.findByIdAndUpdate(bookingDoc.plot, {
    status: plotStatus,
    owner: owner,
    booking: bookingDoc.isActive && bookingDoc.bookingStatus !== 'cancelled' ? bookingDoc._id : null,
  });
};

// ─── Post-save hook: sync plot status ────────────────────────────────────────
BookingSchema.post('save', async function () {
  await syncPlotStatus(this);
});

// ─── Post-findOneAndUpdate hook: sync plot status ─────────────────────────────
BookingSchema.post(/^findOneAndUpdate/, async function (doc) {
  if (doc) {
    await syncPlotStatus(doc);
  }
});

const Booking = model('Booking', BookingSchema);
export default Booking;
