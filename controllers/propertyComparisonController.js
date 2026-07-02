import PropertyComparison from '../models/PropertyComparison.js';
import Plot from '../models/Plot.js';

export const createComparison = async (req, res) => {
  try {
    const { plotIds } = req.body;

    if (!plotIds || plotIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 plot IDs to compare',
      });
    }

    const plots = await Plot.find({ _id: { $in: plotIds }, isActive: true })
      .populate('project', 'name slug type location');

    const comparisonPlots = plots.map((plot) => ({
      plot: plot._id,
      project: plot.project?._id,
    }));

    const comparison = await PropertyComparison.create({
      user: req.user._id,
      plots: comparisonPlots,
    });

    const populated = await PropertyComparison.findById(comparison._id)
      .populate({
        path: 'plots.plot',
        select: 'plotNumber size length width price pricePerSqft facing corner roadWidth coordinates',
        populate: { path: 'project', select: 'name slug type location' },
      })
      .populate({
        path: 'plots.project',
        select: 'name slug type location amenities',
      });

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyComparisons = async (req, res) => {
  try {
    const comparisons = await PropertyComparison.find({ user: req.user._id })
      .sort('-createdAt')
      .populate({
        path: 'plots.plot',
        select: 'plotNumber size price facing corner',
        populate: { path: 'project', select: 'name slug' },
      })
      .populate({
        path: 'plots.project',
        select: 'name slug',
      });

    res.status(200).json({
      success: true,
      count: comparisons.length,
      data: comparisons,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getComparison = async (req, res) => {
  try {
    const comparison = await PropertyComparison.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate({
        path: 'plots.plot',
        select: 'plotNumber size length width price pricePerSqft facing corner roadWidth coordinates',
        populate: { path: 'project', select: 'name slug type location amenities images' },
      })
      .populate({
        path: 'plots.project',
        select: 'name slug type location amenities',
      });

    if (!comparison) {
      return res.status(404).json({ success: false, message: 'Comparison not found' });
    }

    res.status(200).json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteComparison = async (req, res) => {
  try {
    const comparison = await PropertyComparison.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!comparison) {
      return res.status(404).json({ success: false, message: 'Comparison not found' });
    }

    res.status(200).json({ success: true, message: 'Comparison deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
