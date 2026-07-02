import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const PropertyValuationSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'] },
    phone: { type: String, required: [true, 'Phone is required'] },
    email: { type: String },
    propertyAddress: { type: String, required: [true, 'Property address is required'] },
    propertyType: {
      type: String,
      enum: ['plot', 'villa', 'apartment', 'commercial'],
    },
    landArea: { type: Number },
    estimatedValue: { type: Number },
    confidence: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'completed'],
      default: 'pending',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PropertyValuation = model('PropertyValuation', PropertyValuationSchema);
export default PropertyValuation;
