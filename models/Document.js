import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const DocumentSchema = new Schema(
  {
    title: { type: String, required: [true, 'Document title is required'], trim: true },
    type: {
      type: String,
      enum: {
        values: [
          'sale_deed',
          'mutation',
          'ror',
          'layout_approval',
          'noc',
          'agreement',
          'receipt',
          'payment_receipt',
          'invoice',
          'aadhar',
          'pan',
          'identity',
          'identification',
          'kyc',
          'other',
        ],
        message: '{VALUE} is not a valid document type',
      },
      required: [true, 'Document type is required'],
    },
    fileUrl: { type: String, required: [true, 'File URL is required'] },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    customer: { type: Schema.Types.ObjectId, ref: 'User' },
    description: String,
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DocumentSchema.index({ type: 1 });
DocumentSchema.index({ project: 1 });
DocumentSchema.index({ booking: 1 });

const Document = model('Document', DocumentSchema);
export default Document;
