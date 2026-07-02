import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const GallerySchema = new Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: String,
    type: {
      type: String,
      enum: ['image', 'video', 'drone'],
      required: [true, 'Media type is required'],
    },
    url: { type: String, required: [true, 'URL is required'] },
    thumbnail: String,
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    category: {
      type: String,
      enum: ['project', 'construction', 'event', 'marketing'],
      default: 'project',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GallerySchema.index({ project: 1 });
GallerySchema.index({ category: 1 });

const Gallery = model('Gallery', GallerySchema);
export default Gallery;
