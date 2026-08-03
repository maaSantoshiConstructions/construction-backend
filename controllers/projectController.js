import Project from '../models/Project.js';
import Plot from '../models/Plot.js';
import APIFeatures from '../utils/apiFeatures.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import crypto from 'crypto';

export const getProjects = asyncHandler(async (req, res) => {
  const features = new APIFeatures(Project.find({ isActive: true }), req.query)
    .search(['name', 'description', 'location.address'])
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const projects = await features.query;
  const total = await Project.countDocuments({ isActive: true });
  sendPaginated(res, projects, total, req.query.page, req.query.limit);
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ slug: req.params.slug, isActive: true });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const plotsCount = await Plot.countDocuments({ project: project._id, isActive: true });
  sendSuccess(res, { ...project.toObject(), plotsCount });
});

const sanitizeProjectInput = (body) => {
  const data = { ...body };
  ['pricePerSqft', 'totalPlots', 'totalArea', 'possessionDate'].forEach((key) => {
    if (data[key] === null || data[key] === '' || data[key] === undefined) {
      delete data[key];
    }
  });
  return data;
};

const generateUniqueSlug = async (name, currentSlug, projectId = null) => {
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

export const createProject = asyncHandler(async (req, res) => {
  const sanitized = sanitizeProjectInput(req.body);

  // 1. Duplicate RERA Number Validation
  if (sanitized.reraNumber && sanitized.reraNumber.trim()) {
    const reraTrimmed = sanitized.reraNumber.trim();
    const existingRera = await Project.findOne({
      reraNumber: new RegExp('^' + reraTrimmed.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'),
      isActive: true,
    });
    if (existingRera) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Project: A project with RERA Number "${reraTrimmed}" already exists.`,
      });
    }
  }

  // 2. Duplicate Project Name + Location Validation
  if (sanitized.name) {
    const nameTrimmed = sanitized.name.trim();
    const locAddress = sanitized.location?.address || (typeof sanitized.location === 'string' ? sanitized.location : '');
    const locCity = sanitized.location?.city || sanitized.city || '';

    const query = {
      name: new RegExp('^' + nameTrimmed.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'),
      isActive: true,
    };
    if (locAddress) {
      query['location.address'] = new RegExp('^' + locAddress.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
    }
    if (locCity) {
      query['location.city'] = new RegExp('^' + locCity.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
    }

    const existingNameLoc = await Project.findOne(query);
    if (existingNameLoc) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Project: A project named "${nameTrimmed}" at this location already exists.`,
      });
    }
  }

  sanitized.slug = await generateUniqueSlug(sanitized.name, sanitized.slug);

  try {
    const project = await Project.create({ ...sanitized, createdBy: req.user?._id });
    sendSuccess(res, project, null, 201);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || '';
      if (field.includes('reraNumber')) {
        return res.status(400).json({
          success: false,
          message: `Duplicate Project: RERA Number "${sanitized.reraNumber}" already exists in the system.`,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Duplicate Project: A project with identical details already exists.',
      });
    }
    throw err;
  }
});

export const updateProject = asyncHandler(async (req, res) => {
  const sanitized = sanitizeProjectInput(req.body);

  // 1. Duplicate RERA Number Validation
  if (sanitized.reraNumber && sanitized.reraNumber.trim()) {
    const reraTrimmed = sanitized.reraNumber.trim();
    const existingRera = await Project.findOne({
      _id: { $ne: req.params.id },
      reraNumber: new RegExp('^' + reraTrimmed.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'),
      isActive: true,
    });
    if (existingRera) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Project: A project with RERA Number "${reraTrimmed}" already exists.`,
      });
    }
  }

  // 2. Duplicate Project Name + Location Validation
  if (sanitized.name) {
    const nameTrimmed = sanitized.name.trim();
    const locAddress = sanitized.location?.address || (typeof sanitized.location === 'string' ? sanitized.location : '');
    const locCity = sanitized.location?.city || sanitized.city || '';

    const query = {
      _id: { $ne: req.params.id },
      name: new RegExp('^' + nameTrimmed.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'),
      isActive: true,
    };
    if (locAddress) {
      query['location.address'] = new RegExp('^' + locAddress.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
    }
    if (locCity) {
      query['location.city'] = new RegExp('^' + locCity.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
    }

    const existingNameLoc = await Project.findOne(query);
    if (existingNameLoc) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Project: A project named "${nameTrimmed}" at this location already exists.`,
      });
    }
  }

  if (sanitized.name || sanitized.slug) {
    sanitized.slug = await generateUniqueSlug(sanitized.name, sanitized.slug, req.params.id);
  }

  try {
    const project = await Project.findByIdAndUpdate(req.params.id, sanitized, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    sendSuccess(res, project);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Project: RERA Number or Name/Location combination already exists.',
      });
    }
    throw err;
  }
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  sendSuccess(res, null, 'Project deactivated successfully');
});

export const uploadProjectImages = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const imageUrls = req.files.map((file) => file.path || file.location);
    project.images = [...(project.images || []), ...imageUrls];
    await project.save();

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process image upload.' });
  }
};

export const getProjectStats = async (req, res) => {
  try {
    const projectId = req.params.id;

    const total = await Plot.countDocuments({ project: projectId, isActive: true });
    const sold = await Plot.countDocuments({ project: projectId, status: 'sold', isActive: true });
    const reserved = await Plot.countDocuments({ project: projectId, status: 'reserved', isActive: true });
    const available = await Plot.countDocuments({ project: projectId, status: 'available', isActive: true });

    res.status(200).json({
      success: true,
      data: {
        total,
        sold,
        reserved,
        available,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
