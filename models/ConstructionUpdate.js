import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ConstructionUpdateSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project is required'] },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'] },
    stage: {
      type: String,
      enum: {
        values: ['planning', 'foundation', 'structure', 'roofing', 'finishing', 'completed'],
        message: '{VALUE} is not a valid construction stage',
      },
      required: [true, 'Stage is required'],
    },
    progressPercent: {
      type: Number,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0,
    },
    images: [String],
    droneVideos: [String],
    engineerReport: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Updated by is required'] },
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ConstructionUpdateSchema.index({ project: 1, stage: 1 });
ConstructionUpdateSchema.index({ date: -1 });

const ConstructionUpdate = model('ConstructionUpdate', ConstructionUpdateSchema);
export default ConstructionUpdate;
