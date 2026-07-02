import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ReviewSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project is required'] },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: { type: String, trim: true },
    comment: { type: String, trim: true },
    images: [String],
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ project: 1, isApproved: 1 });
ReviewSchema.index({ customer: 1 });

const Review = model('Review', ReviewSchema);
export default Review;
