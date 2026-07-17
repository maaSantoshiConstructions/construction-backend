import Plot from '../models/Plot.js';
import Project from '../models/Project.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getPlots = async (req, res) => {
  try {
    const queryObj = { isActive: true };
    if (req.query.project) queryObj.project = req.query.project;
    if (req.query.status) queryObj.status = req.query.status;
    if (req.query.facing) queryObj.facing = req.query.facing;
    if (req.query.search) {
      queryObj.plotNumber = { $regex: req.query.search, $options: 'i' };
    }

    const total = await Plot.countDocuments(queryObj);

    // Compute stats (project and facing filtered only)
    const statsQuery = { isActive: true };
    if (req.query.project) statsQuery.project = req.query.project;
    if (req.query.facing) statsQuery.facing = req.query.facing;

    const stats = {
      total: await Plot.countDocuments(statsQuery),
      available: await Plot.countDocuments({ ...statsQuery, status: 'available' }),
      reserved: await Plot.countDocuments({ ...statsQuery, status: 'reserved' }),
      sold: await Plot.countDocuments({ ...statsQuery, status: 'sold' }),
      blocked: await Plot.countDocuments({ ...statsQuery, status: 'blocked' }),
    };

    // Find and paginate plots
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const plots = await Plot.find(queryObj)
      .sort(req.query.sort ? req.query.sort.split(',').join(' ') : '-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('project', 'name slug type location')
      .populate('owner', 'name email phone');

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: plots.length,
      total,
      totalPages,
      stats,
      data: plots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlot = async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id)
      .populate('project', 'name slug type location')
      .populate('owner', 'name email phone');

    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    res.status(200).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlot = async (req, res) => {
  try {
    const plot = await Plot.create(req.body);

    res.status(201).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlot = async (req, res) => {
  try {
    const plot = await Plot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('project', 'name slug type');

    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    res.status(200).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlot = async (req, res) => {
  try {
    const plot = await Plot.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    res.status(200).json({ success: true, message: 'Plot deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailablePlots = async (req, res) => {
  try {
    const features = new APIFeatures(
      Plot.find({ isActive: true, status: 'available' }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const plots = await features.query.populate('project', 'name slug type').populate('owner', 'name email phone');
    const total = await Plot.countDocuments({ isActive: true, status: 'available' });

    res.status(200).json({
      success: true,
      count: plots.length,
      total,
      data: plots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlotStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const plot = await Plot.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    res.status(200).json({ success: true, data: plot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlotMapData = async (req, res) => {
  try {
    const { project } = req.query;
    const filter = { isActive: true };

    if (project) {
      const proj = await Project.findOne({ slug: project, isActive: true }).select('_id');
      if (proj) filter.project = proj._id;
    }

    const plots = await Plot.find(filter)
      .populate('project', 'name slug type location status')
      .select('plotNumber size price pricePerSqft facing corner roadWidth status project coordinates');

    res.status(200).json({ success: true, count: plots.length, data: plots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
