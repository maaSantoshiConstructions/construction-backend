import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const RecommendedPlotSchema = new Schema(
  {
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    score: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const AIRecommendationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'User is required'] },
    budget: { type: Number, min: 0 },
    location: String,
    propertyType: {
      type: String,
      enum: ['plot', 'villa', 'apartment'],
    },
    purpose: {
      type: String,
      enum: ['self', 'investment', 'both'],
    },
    recommendedPlots: [RecommendedPlotSchema],
    preferences: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AIRecommendationSchema.index({ user: 1 });

const AIRecommendation = model('AIRecommendation', AIRecommendationSchema);
export default AIRecommendation;
