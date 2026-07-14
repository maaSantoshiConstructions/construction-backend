import AIRecommendation from '../models/AIRecommendation.js';
import Plot from '../models/Plot.js';
import Project from '../models/Project.js';
import APIFeatures from '../utils/apiFeatures.js';
import { getGeminiRecommendations } from '../utils/geminiService.js';
import {
  BUDGET_MAP,
  PROPERTY_TYPE_MAP,
  scorePlotsRuleBased,
} from '../utils/recommendationEngine.js';

export const createRecommendation = async (req, res) => {
  try {
    const { budget, location, propertyType, purpose } = req.body;

    const budgetRange = BUDGET_MAP[budget] || { min: 0, max: Infinity };
    const minBudget = budgetRange.min;
    const maxBudget = budgetRange.max;
    const budgetMid = maxBudget === Infinity
      ? (minBudget + 3000000) / 2
      : (minBudget + maxBudget) / 2;

    const projectQuery = { isActive: true };
    if (location) {
      projectQuery['location.city'] = { $regex: location, $options: 'i' };
    }
    const allowedTypes = PROPERTY_TYPE_MAP[propertyType];
    if (allowedTypes) {
      projectQuery.type = { $in: allowedTypes };
    }

    const projects = await Project.find(projectQuery)
      .select('_id name slug type location status amenities reraNumber images');
    const projectIds = projects.map((p) => p._id);

    const plotQuery = {
      isActive: true,
      status: 'available',
    };

    if (maxBudget !== Infinity || minBudget > 0) {
      plotQuery.price = {};
      if (minBudget > 0) plotQuery.price.$gte = minBudget * 0.7;
      if (maxBudget !== Infinity) plotQuery.price.$lte = maxBudget * 1.3;
    }

    if (projectIds.length > 0) {
      plotQuery.project = { $in: projectIds };
    }

    const plots = await Plot.find(plotQuery)
      .populate('project', 'name slug type location status amenities reraNumber images pricePerSqft')
      .limit(50);

    if (plots.length === 0) {
      const recommendation = await AIRecommendation.create({
        user: req.user?._id || null,
        budget: budgetMid,
        location,
        propertyType,
        purpose,
        recommendedPlots: [],
        totalResults: 0,
        preferences: req.body,
      });

      return res.status(200).json({
        success: true,
        data: {
          _id: recommendation._id,
          recommendedPlots: [],
          totalResults: 0,
          preferences: req.body,
        },
      });
    }

    let scored;

    const geminiResults = await getGeminiRecommendations(
      { budget: budgetRange.label || budget, location, propertyType, purpose },
      plots
    );

    if (geminiResults) {
      console.log('[AI] ✅ NVIDIA recommendation —', geminiResults.length, 'plots scored');
      scored = geminiResults.map((gr) => {
        const plot = plots[gr.plotIndex];
        const project = plot.project;
        return {
          plot: plot._id,
          project: project?._id,
          score: gr.score,
          matchReasons: gr.matchReasons,
          scoreBreakdown: [{ label: 'AI-analyzed recommendation', points: gr.score }],
        };
      });
    } else {
      console.log('[AI] ⚠️ Rule-based fallback — NVIDIA AI unavailable');
      scored = scorePlotsRuleBased(plots, budgetMid, location, propertyType, purpose);
    }

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, 8);

    const recommendation = await AIRecommendation.create({
      user: req.user?._id || null,
      budget: budgetMid,
      location,
      propertyType,
      purpose,
      recommendedPlots: topResults,
      totalResults: plots.length,
      preferences: req.body,
      source: geminiResults ? 'nvidia' : 'rule-based',
    });

    const populatedRecommendation = await AIRecommendation.findById(recommendation._id)
      .populate({
        path: 'recommendedPlots.plot',
        select: 'plotNumber size price facing corner coordinates roadWidth pricePerSqft length width',
        populate: { path: 'project', select: 'name slug type location status amenities reraNumber images pricePerSqft' },
      })
      .populate({
        path: 'recommendedPlots.project',
        select: 'name slug type location status amenities reraNumber images pricePerSqft',
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
        select: 'plotNumber size price facing corner coordinates roadWidth pricePerSqft length width',
        populate: { path: 'project', select: 'name slug type location amenities reraNumber images' },
      })
      .populate({
        path: 'recommendedPlots.project',
        select: 'name slug type location amenities reraNumber images',
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
