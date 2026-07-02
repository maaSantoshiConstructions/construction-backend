import Project from '../models/Project.js';
import Plot from '../models/Plot.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getProjects = async (req, res) => {
  try {
    const features = new APIFeatures(Project.find({ isActive: true }), req.query)
      .search(['name', 'description', 'location.address'])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const projects = await features.query;
    const total = await Project.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug, isActive: true });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const plotsCount = await Plot.countDocuments({ project: project._id, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        plotsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user._id });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({ success: true, message: 'Project deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
