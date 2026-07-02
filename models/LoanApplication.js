import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const LoanApplicationSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Customer is required'] },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    plot: { type: Schema.Types.ObjectId, ref: 'Plot' },
    loanAmount: { type: Number, required: [true, 'Loan amount is required'], min: 0 },
    bankName: { type: String, required: [true, 'Bank name is required'], trim: true },
    interestRate: { type: Number, min: 0 },
    tenure: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['applied', 'approved', 'rejected', 'disbursed'],
      default: 'applied',
    },
    monthlyIncome: { type: Number, min: 0 },
    existingEmi: { type: Number, min: 0, default: 0 },
    age: { type: Number, min: 18, max: 100 },
    emi: { type: Number, min: 0 },
    documents: [String],
    remarks: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LoanApplicationSchema.index({ customer: 1 });
LoanApplicationSchema.index({ status: 1 });

const LoanApplication = model('LoanApplication', LoanApplicationSchema);
export default LoanApplication;
