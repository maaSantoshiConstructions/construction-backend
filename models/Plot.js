import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const PlotSchema = new Schema(
  {
    plotNumber: { type: String, required: [true, 'Plot number is required'], trim: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: [true, 'Project is required'] },
    size: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    facing: {
      type: String,
      enum: {
        values: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'],
        message: '{VALUE} is not a valid facing direction',
      },
    },
    roadWidth: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'blocked'],
      default: 'available',
    },
    price: { type: Number, min: 0 },
    pricePerSqft: { type: Number, min: 0 },
    corner: { type: Boolean, default: false },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlotSchema.index({ plotNumber: 1, project: 1 }, { unique: true });
PlotSchema.index({ project: 1, status: 1 });
PlotSchema.index({ facing: 1 });

// Static method to update totalPlots on Project
PlotSchema.statics.updateTotalPlots = async function (projectId) {
  if (!projectId) return;
  const Project = mongoose.model('Project');
  const count = await this.countDocuments({ project: projectId, isActive: true });
  await Project.findByIdAndUpdate(projectId, { totalPlots: count });
};

// Post save hook
PlotSchema.post('save', async function () {
  await this.constructor.updateTotalPlots(this.project);
});

// Pre findOneAndUpdate hook to capture original project
PlotSchema.pre(/^findOneAnd/, async function () {
  this._originalPlot = await this.model.findOne(this.getQuery());
});

// Post findOneAndUpdate hook
PlotSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.updateTotalPlots(doc.project);
    if (
      this._originalPlot &&
      this._originalPlot.project &&
      this._originalPlot.project.toString() !== doc.project.toString()
    ) {
      await doc.constructor.updateTotalPlots(this._originalPlot.project);
    }
  }
});

// Post remove hook
PlotSchema.post('remove', async function () {
  await this.constructor.updateTotalPlots(this.project);
});

const Plot = model('Plot', PlotSchema);
export default Plot;
