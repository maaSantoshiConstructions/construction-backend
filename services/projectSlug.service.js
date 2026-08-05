import crypto from 'crypto';
import Project from '../models/Project.js';

/**
 * Generates a unique, URL-safe slug for a project.
 * Appends counter or random hex string if a collision occurs.
 */
export const generateUniqueSlug = async (name, currentSlug, projectId = null) => {
  let baseSlug = (currentSlug || name || 'project')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (!baseSlug) baseSlug = 'project';

  let uniqueSlug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug: uniqueSlug };
    if (projectId) {
      query._id = { $ne: projectId };
    }
    const existing = await Project.findOne(query);
    if (!existing) break;

    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 20) {
      uniqueSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
      break;
    }
  }

  return uniqueSlug;
};
