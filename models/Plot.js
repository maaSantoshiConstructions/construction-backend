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

const Plot = model('Plot', PlotSchema);
export default Plot;
