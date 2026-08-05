import Project from '../models/Project.js';
import Plot from '../models/Plot.js';
import APIFeatures from '../utils/apiFeatures.js';
import { generateUniqueSlug } from './projectSlug.service.js';
import {
  sanitizeProjectInput,
  validateDuplicateReraNumber,
  validateDuplicateNameAndLocation,
} from './projectValidation.service.js';

export const fetchAllProjects = async (query) => {
  const filter = { isActive: true };
  const features = new APIFeatures(Project.find(filter), query)
    .search(['name', 'description', 'location.address'])
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const projects = await features.query;
  const total = await Project.countDocuments(filter);

  return { projects, total };
};

export const fetchProjectBySlug = async (slug) => {
  const project = await Project.findOne({ slug, isActive: true });
  if (!project) return null;

  const plotsCount = await Plot.countDocuments({ project: project._id, isActive: true });
  return { ...project.toObject(), plotsCount };
};

export const createNewProject = async (body, userId) => {
  const sanitized = sanitizeProjectInput(body);

  const reraErr = await validateDuplicateReraNumber(sanitized.reraNumber);
  if (reraErr) {
    return { error: 'VALIDATION_ERROR', message: reraErr };
  }

  const nameLocErr = await validateDuplicateNameAndLocation(
    sanitized.name,
    sanitized.location,
    sanitized.city
  );
  if (nameLocErr) {
    return { error: 'VALIDATION_ERROR', message: nameLocErr };
  }

  sanitized.slug = await generateUniqueSlug(sanitized.name, sanitized.slug);

  try {
    const project = await Project.create({ ...sanitized, createdBy: userId });
    return { project };
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || '';
      if (field.includes('reraNumber')) {
        return {
          error: 'VALIDATION_ERROR',
          message: `Duplicate Project: RERA Number "${sanitized.reraNumber}" already exists in the system.`,
        };
      }
      return {
        error: 'VALIDATION_ERROR',
        message: 'Duplicate Project: A project with identical details already exists.',
      };
    }
    throw err;
  }
};

export const updateProjectById = async (id, body) => {
  const sanitized = sanitizeProjectInput(body);

  const reraErr = await validateDuplicateReraNumber(sanitized.reraNumber, id);
  if (reraErr) {
    return { error: 'VALIDATION_ERROR', message: reraErr };
  }

  const nameLocErr = await validateDuplicateNameAndLocation(
    sanitized.name,
    sanitized.location,
    sanitized.city,
    id
  );
  if (nameLocErr) {
    return { error: 'VALIDATION_ERROR', message: nameLocErr };
  }

  if (sanitized.name || sanitized.slug) {
    sanitized.slug = await generateUniqueSlug(sanitized.name, sanitized.slug, id);
  }

  try {
    const project = await Project.findByIdAndUpdate(id, sanitized, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return { error: 'NOT_FOUND', message: 'Project not found' };
    }

    return { project };
  } catch (err) {
    if (err.code === 11000) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Duplicate Project: RERA Number or Name/Location combination already exists.',
      };
    }
    throw err;
  }
};

export const softDeleteProjectById = async (id) => {
  return await Project.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
};

export const appendProjectImages = async (id, files) => {
  const project = await Project.findById(id);
  if (!project) {
    return { error: 'NOT_FOUND', message: 'Project not found' };
  }

  if (!files || files.length === 0) {
    return { error: 'NO_FILES', message: 'No image files provided.' };
  }

  const imageUrls = files.map((file) => file.path || file.location);
  project.images = [...(project.images || []), ...imageUrls];
  await project.save();

  return { project };
};

export const fetchProjectPlotStats = async (projectId) => {
  const total = await Plot.countDocuments({ project: projectId, isActive: true });
  const sold = await Plot.countDocuments({ project: projectId, status: 'sold', isActive: true });
  const reserved = await Plot.countDocuments({ project: projectId, status: 'reserved', isActive: true });
  const available = await Plot.countDocuments({ project: projectId, status: 'available', isActive: true });

  return {
    total,
    sold,
    reserved,
    available,
  };
};
