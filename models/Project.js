import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: [true, 'Project name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: {
      type: String,
      enum: {
        values: ['plotted_development', 'villas', 'apartments'],
        message: '{VALUE} is not a valid project type',
      },
      required: [true, 'Project type is required'],
    },
    description: String,
    location: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    totalPlots: { type: Number, min: 0 },
    totalArea: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'upcoming',
    },
    pricePerSqft: { type: Number, min: 0 },
    images: [String],
    videos: [String],
    amenities: [String],
    reraNumber: String,
    possessionDate: Date,
    layoutImage: String,
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ProjectSchema.index({ status: 1 });
ProjectSchema.index({ type: 1 });
ProjectSchema.index({ featured: 1 });

const Project = model('Project', ProjectSchema);
export default Project;
