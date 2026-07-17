import Review from '../models/Review.js';

const SEED_REVIEWS = [
  {
    name: 'Arakhita Mohanty',
    rating: 5,
    comment: 'Purchased a plot in Royal Gardens Phase 1. The documentation process was extremely transparent. Staff assisted us in title verification and getting RERA documents. Highly recommended!',
    project: 'Royal Gardens Phase 1',
    helpfulVotes: 24,
  },
  {
    name: 'Subhashree Dash',
    rating: 5,
    comment: 'Maa Santoshi Constructions is the most trusted developer in Bhubaneswar. The development speed is impressive. Wide roads, boundary walls, and electricity are already in place.',
    project: 'Royal Gardens Phase 2',
    helpfulVotes: 18,
  },
  {
    name: 'Debasish Patnaik',
    rating: 4,
    comment: 'Very satisfied with their service. We got our plot registered last month. Only minor delay in getting the layout plan approved, but the support team helped resolve it quickly.',
    project: 'Santoshi Vihar',
    helpfulVotes: 11,
  },
  {
    name: 'Priyanka Mishra',
    rating: 5,
    comment: 'Great investment opportunity. The appreciation rate in this corridor is very promising. Excellent customer service and clear communication throughout the booking process.',
    project: 'Royal Gardens Phase 2',
    helpfulVotes: 9,
  },
  {
    name: 'Niranjan Sahoo',
    rating: 4,
    comment: 'Excellent location and good pricing. The staff is polite and guided us through the bank loan process. Looking forward to constructing my villa next year.',
    project: 'Santoshi Vihar',
    helpfulVotes: 7,
  },
];

export const getReviews = async (req, res) => {
  try {
    let count = await Review.countDocuments();
    if (count === 0) {
      await Review.insertMany(SEED_REVIEWS);
    }

    const { sort, rating, project } = req.query;
    const query = { isApproved: true };

    if (rating) {
      query.rating = Number(rating);
    }

    if (project) {
      query.project = project;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'highest') {
      sortOption = { rating: -1, createdAt: -1 };
    } else if (sort === 'lowest') {
      sortOption = { rating: 1, createdAt: -1 };
    } else if (sort === 'helpful') {
      sortOption = { helpfulVotes: -1, createdAt: -1 };
    }

    const reviews = await Review.find(query).sort(sortOption);

    // Calculate rating aggregates
    const allReviews = await Review.find({ isApproved: true });
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 
      ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach((r) => {
      if (breakdown[r.rating] !== undefined) {
        breakdown[r.rating]++;
      }
    });

    res.status(200).json({
      success: true,
      data: reviews,
      stats: {
        totalReviews,
        averageRating,
        breakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReview = async (req, res) => {
  try {
    const { name, rating, comment, project } = req.body;

    if (!name || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Name, rating, and comment are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const review = await Review.create({
      name,
      rating: Number(rating),
      comment,
      project,
      helpfulVotes: 0,
      isApproved: true,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const voteHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.helpfulVotes += 1;
    await review.save();

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
