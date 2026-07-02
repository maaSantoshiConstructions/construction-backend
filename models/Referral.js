import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ReferralSchema = new Schema(
  {
    referrer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Referrer is required'] },
    referredUser: { type: Schema.Types.ObjectId, ref: 'User' },
    referralCode: { type: String, required: [true, 'Referral code is required'] },
    status: {
      type: String,
      enum: ['sent', 'registered', 'booking_done', 'commission_paid'],
      default: 'sent',
    },
    commissionAmount: { type: Number, min: 0, default: 0 },
    paidAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ReferralSchema.index({ referrer: 1 });
ReferralSchema.index({ referralCode: 1 });

const Referral = model('Referral', ReferralSchema);
export default Referral;
