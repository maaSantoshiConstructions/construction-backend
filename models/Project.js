import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: [true, 'Project name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: {
      type: String,
      enum: {
        values: ['plotted_development', 'villas', 'apartments', 'commercial'],
        message: '{VALUE} is not a valid project type',
      },
      required: [true, 'Project type is required'],
    },
    description: String,
    location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    totalPlots: { type: Number, min: [0, 'Total plots must be 0 or greater'] },
    totalArea: { type: Number, min: [0, 'Total area must be 0 or greater'] },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'upcoming',
      required: [true, 'Project status is required'],
    },
    pricePerSqft: { type: Number, min: [0, 'Price per sq.ft must be positive'] },
    images: [String],
    videos: [String],
    amenities: [String],
    highlights: [String],
    reraNumber: { type: String, trim: true },
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
ProjectSchema.index({ reraNumber: 1 }, { unique: true, sparse: true });
ProjectSchema.index({ name: 1, 'location.address': 1, 'location.city': 1 }, { unique: true, sparse: true });

ProjectSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

const Project = model('Project', ProjectSchema);
export default Project;
