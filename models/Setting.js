import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const SettingSchema = new Schema(
  {
    key: { type: String, required: [true, 'Key is required'], unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: [true, 'Value is required'] },
    group: {
      type: String,
      enum: ['general', 'seo', 'social', 'email', 'payment'],
      default: 'general',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SettingSchema.index({ group: 1 });

const Setting = model('Setting', SettingSchema);
export default Setting;
