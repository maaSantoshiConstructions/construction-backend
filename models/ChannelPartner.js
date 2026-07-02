import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema, model } = mongoose;

const ChannelPartnerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'User is required'], unique: true },
    companyName: { type: String, trim: true },
    gstNumber: String,
    panNumber: String,
    address: String,
    city: String,
    state: String,
    commissionRate: { type: Number, min: 0, max: 100, default: 0 },
    totalEarnings: { type: Number, min: 0, default: 0 },
    totalPayout: { type: Number, min: 0, default: 0 },
    referralCode: {
      type: String,
      unique: true,
    },
    isVerified: { type: Boolean, default: false },
    documents: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);



ChannelPartnerSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = `CP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

const ChannelPartner = model('ChannelPartner', ChannelPartnerSchema);
export default ChannelPartner;
