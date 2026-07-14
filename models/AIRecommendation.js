import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ScoreBreakdownSchema = new Schema(
  {
    label: String,
    points: Number,
  },
  { _id: false }
);

const RecommendedPlotSchema = new Schema(
  {
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    score: { type: Number, min: 0, max: 100 },
    matchReasons: [String],
    scoreBreakdown: [ScoreBreakdownSchema],
  },
  { _id: false }
);

const AIRecommendationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    budget: { type: Number, min: 0 },
    location: String,
    propertyType: {
      type: String,
      enum: ['Residential Plot', 'Commercial Plot', 'Villa', 'Farm Land'],
    },
    purpose: {
      type: String,
      enum: ['Investment', 'Self Use', 'Both'],
    },
    recommendedPlots: [RecommendedPlotSchema],
    totalResults: { type: Number, default: 0 },
    preferences: { type: Schema.Mixed },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AIRecommendationSchema.index({ user: 1 });
AIRecommendationSchema.index({ createdAt: -1 });

const AIRecommendation = model('AIRecommendation', AIRecommendationSchema);
export default AIRecommendation;
