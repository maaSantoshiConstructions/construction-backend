import Project from '../models/Project.js';
import Plot from '../models/Plot.js';
import APIFeatures from '../utils/apiFeatures.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';

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
  if (data.name && !data.slug) {
    data.slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  return data;
};

export const createProject = asyncHandler(async (req, res) => {
  const sanitized = sanitizeProjectInput(req.body);
  const project = await Project.create({ ...sanitized, createdBy: req.user?._id });
  sendSuccess(res, project, null, 201);
});

export const updateProject = asyncHandler(async (req, res) => {
  const sanitized = sanitizeProjectInput(req.body);
  const project = await Project.findByIdAndUpdate(req.params.id, sanitized, {
    new: true,
    runValidators: true,
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  sendSuccess(res, project);
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

    const imageUrls = req.files.map((file) => file.path || file.location);
    project.images = [...project.images, ...imageUrls];
    await project.save();

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
