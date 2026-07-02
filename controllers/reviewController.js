import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getReviews = async (req, res) => {
  try {
    const query = { isApproved: true, isActive: true };
    if (req.query.project) query.project = req.query.project;

    const features = new APIFeatures(Review.find(query), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const reviews = await features.query
      .populate('customer', 'name avatar')
      .populate('project', 'name slug');

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('customer', 'name avatar')
      .populate('project', 'name slug');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (!review.isApproved && (!req.user || req.user.role === 'customer')) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReview = async (req, res) => {
  try {
    const { project } = req.body;

    const hasBooking = await Booking.findOne({
      customer: req.user._id,
      project,
      isActive: true,
    });

    if (!hasBooking) {
      return res.status(400).json({
        success: false,
        message: 'You must have a confirmed booking to review this project',
      });
    }

    const existing = await Review.findOne({
      customer: req.user._id,
      project,
      isActive: true,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this project',
      });
    }

    const review = await Review.create({
      ...req.body,
      customer: req.user._id,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedBy: req.user._id },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicReviews = async (req, res) => {
  try {
    const query = { isApproved: true, isActive: true };

    const features = new APIFeatures(Review.find(query), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const reviews = await features.query
      .populate('customer', 'name avatar')
      .populate('project', 'name slug');

    const total = await Review.countDocuments(query);

    const averageRating =
      total > 0
        ? await Review.aggregate([
            { $match: query },
            { $group: { _id: null, avg: { $avg: '$rating' } } },
          ])
        : [{ avg: 0 }];

    const ratingDistribution = [0, 0, 0, 0, 0];
    const distResults = await Review.aggregate([
      { $match: query },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    distResults.forEach((r) => {
      if (r._id >= 1 && r._id <= 5) {
        ratingDistribution[r._id - 1] = r.count;
      }
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: {
        reviews,
        averageRating: Math.round((averageRating[0]?.avg || 0) * 10) / 10,
        ratingDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      project: req.params.projectId,
      isApproved: true,
      isActive: true,
    })
      .sort('-createdAt')
      .populate('customer', 'name avatar');

    const total = reviews.length;
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const ratingDistribution = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      ratingDistribution[r.rating - 1]++;
    });

    res.status(200).json({
      success: true,
      count: total,
      data: {
        reviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
