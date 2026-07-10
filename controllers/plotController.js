import Plot from '../models/Plot.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getPlots = async (req, res) => {
  try {
    const features = new APIFeatures(Plot.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const plots = await features.query.populate('project', 'name slug type').populate('owner', 'name email phone');
    const total = await Plot.countDocuments({ isActive: true });

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
    const plots = await Plot.find({
      isActive: true,
      'coordinates.lat': { $exists: true },
      'coordinates.lng': { $exists: true },
    }).select('plotNumber coordinates status facing project');

    res.status(200).json({ success: true, count: plots.length, data: plots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
