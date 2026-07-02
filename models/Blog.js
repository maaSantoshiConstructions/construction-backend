import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const BlogSchema = new Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: [true, 'Content is required'] },
    excerpt: { type: String, trim: true },
    featuredImage: String,
    author: { type: String, trim: true },
    tags: [String],
    category: String,
    publishedAt: Date,
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BlogSchema.index({ isPublished: 1, publishedAt: -1 });
BlogSchema.index({ tags: 1 });

const Blog = model('Blog', BlogSchema);
export default Blog;
