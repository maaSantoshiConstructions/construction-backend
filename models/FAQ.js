import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const FAQSchema = new Schema(
  {
    question: { type: String, required: [true, 'Question is required'], trim: true },
    answer: { type: String, required: [true, 'Answer is required'] },
    category: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FAQSchema.index({ category: 1, order: 1 });

const FAQ = model('FAQ', FAQSchema);
export default FAQ;
