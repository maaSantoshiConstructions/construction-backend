import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ComparisonPlotSchema = new Schema(
  {
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
  },
  { _id: false }
);

const PropertyComparisonSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'User is required'] },
    plots: [ComparisonPlotSchema],
    notes: String,
  },
  { timestamps: true }
);

PropertyComparisonSchema.index({ user: 1 });

const PropertyComparison = model('PropertyComparison', PropertyComparisonSchema);
export default PropertyComparison;
