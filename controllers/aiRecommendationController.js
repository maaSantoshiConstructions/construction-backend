import AIRecommendation from '../models/AIRecommendation.js';
import Plot from '../models/Plot.js';
import Project from '../models/Project.js';
import APIFeatures from '../utils/apiFeatures.js';

export const createRecommendation = async (req, res) => {
  try {
    const { budget, location, propertyType, purpose } = req.body;

    const minBudget = budget ? budget * 0.8 : 0;
    const maxBudget = budget ? budget * 1.2 : Infinity;

    const projectQuery = {};
    if (location) {
      projectQuery['location.city'] = { $regex: location, $options: 'i' };
    }
    if (propertyType) {
      projectQuery.type = propertyType;
    }
    projectQuery.isActive = true;

    const projects = await Project.find(projectQuery).select('_id location.city type');
    const projectIds = projects.map((p) => p._id);

    const plotQuery = {
      isActive: true,
      status: 'available',
      price: { $gte: minBudget, $lte: maxBudget },
    };

    if (projectIds.length > 0) {
      plotQuery.project = { $in: projectIds };
    }

    const plots = await Plot.find(plotQuery)
      .populate('project', 'name slug type location')
      .limit(20);

    const scored = plots.map((plot) => {
      let score = 50;

      const priceRatio = plot.price / (budget || 1);
      if (priceRatio >= 0.9 && priceRatio <= 1.1) score += 20;
      else if (priceRatio >= 0.8 && priceRatio <= 1.2) score += 10;

      if (plot.corner) score += 10;

      const project = plot.project;
      if (project && project.location && project.location.city) {
        if (location && project.location.city.toLowerCase().includes(location.toLowerCase())) {
          score += 10;
        }
      }

      if (purpose === 'investment' && plot.size > 0) score += 5;
      if (purpose === 'self' && plot.size > 1200) score += 5;

      return {
        plot: plot._id,
        project: plot.project?._id,
        score: Math.min(score, 100),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, 5);

    const recommendation = await AIRecommendation.create({
      user: req.user?._id || null,
      budget,
      location,
      propertyType,
      purpose,
      recommendedPlots: topResults,
      preferences: req.body,
    });

    const populatedRecommendation = await AIRecommendation.findById(recommendation._id)
      .populate({
        path: 'recommendedPlots.plot',
        select: 'plotNumber size price facing corner coordinates',
        populate: { path: 'project', select: 'name slug type location' },
      })
      .populate({
        path: 'recommendedPlots.project',
        select: 'name slug type location',
      });

    res.status(201).json({
      success: true,
      data: populatedRecommendation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const features = new APIFeatures(
      AIRecommendation.find({ user: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const recommendations = await features.query
      .populate({
        path: 'recommendedPlots.plot',
        select: 'plotNumber size price facing',
        populate: { path: 'project', select: 'name slug' },
      });

    const total = await AIRecommendation.countDocuments({ user: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: recommendations.length,
      total,
      data: recommendations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRecommendation = async (req, res) => {
  try {
    const recommendation = await AIRecommendation.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true,
    })
      .populate({
        path: 'recommendedPlots.plot',
        select: 'plotNumber size price facing corner coordinates',
        populate: { path: 'project', select: 'name slug type location amenities' },
      })
      .populate({
        path: 'recommendedPlots.project',
        select: 'name slug type location',
      });

    if (!recommendation) {
      return res.status(404).json({ success: false, message: 'Recommendation not found' });
    }

    res.status(200).json({ success: true, data: recommendation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRecommendationStats = async (req, res) => {
  try {
    const totalRecommendations = await AIRecommendation.countDocuments({ isActive: true });

    const propertyTypeBreakdown = await AIRecommendation.aggregate([
      { $match: { isActive: true, propertyType: { $ne: null } } },
      { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]);

    const purposeBreakdown = await AIRecommendation.aggregate([
      { $match: { isActive: true, purpose: { $ne: null } } },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
      { $project: { purpose: '$_id', count: 1, _id: 0 } },
    ]);

    const avgBudget = await AIRecommendation.aggregate([
      { $match: { isActive: true, budget: { $ne: null } } },
      { $group: { _id: null, average: { $avg: '$budget' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRecommendations,
        propertyTypeBreakdown,
        purposeBreakdown,
        averageBudget: avgBudget.length > 0 ? Math.round(avgBudget[0].average) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
