import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ReviewSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'] },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    comment: { type: String, required: [true, 'Comment is required'] },
    project: { type: String },
    helpfulVotes: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Review = model('Review', ReviewSchema);
export default Review;
