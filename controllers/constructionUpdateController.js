import ConstructionUpdate from '../models/ConstructionUpdate.js';
import Customer from '../models/Customer.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getUpdates = async (req, res) => {
  try {
    const features = new APIFeatures(ConstructionUpdate.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const updates = await features.query
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber')
      .populate('updatedBy', 'name');

    const total = await ConstructionUpdate.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: updates.length,
      total,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUpdate = async (req, res) => {
  try {
    const update = await ConstructionUpdate.findById(req.params.id)
      .populate('project', 'name slug type')
      .populate('plot', 'plotNumber')
      .populate('updatedBy', 'name');

    if (!update) {
      return res.status(404).json({ success: false, message: 'Update not found' });
    }

    res.status(200).json({ success: true, data: update });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUpdate = async (req, res) => {
  try {
    const imageUrls = req.files ? req.files.map((file) => file.path || file.location) : [];

    const update = await ConstructionUpdate.create({
      ...req.body,
      images: imageUrls,
      updatedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: update });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUpdate = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map((file) => file.path || file.location);
      updateData.images = imageUrls;
    }

    const update = await ConstructionUpdate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!update) {
      return res.status(404).json({ success: false, message: 'Update not found' });
    }

    res.status(200).json({ success: true, data: update });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUpdate = async (req, res) => {
  try {
    const update = await ConstructionUpdate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!update) {
      return res.status(404).json({ success: false, message: 'Update not found' });
    }

    res.status(200).json({ success: true, message: 'Update deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectUpdates = async (req, res) => {
  try {
    const updates = await ConstructionUpdate.find({
      project: req.params.projectId,
      isActive: true,
    })
      .sort('-date')
      .populate('plot', 'plotNumber')
      .populate('updatedBy', 'name');

    const grouped = updates.reduce((acc, update) => {
      const stage = update.stage;
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(update);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: updates.length,
      data: {
        grouped,
        updates,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPlotUpdates = async (req, res) => {
  try {
    const customer = await Customer.findOne({ user: req.user._id });
    if (!customer || !customer.plot) {
      return res.status(404).json({ success: false, message: 'No plot found for your account' });
    }

    const updates = await ConstructionUpdate.find({
      plot: customer.plot,
      isActive: true,
    })
      .sort('-date')
      .populate('project', 'name slug')
      .populate('updatedBy', 'name');

    res.status(200).json({
      success: true,
      count: updates.length,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
