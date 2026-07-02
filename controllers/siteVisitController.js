import SiteVisit from '../models/SiteVisit.js';
import sendEmail from '../utils/email.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getSiteVisits = async (req, res) => {
  try {
    const features = new APIFeatures(SiteVisit.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const visits = await features.query
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber')
      .populate('project', 'name slug')
      .populate('salesExecutive', 'name email');

    const total = await SiteVisit.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: visits.length,
      total,
      data: visits,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSiteVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber price facing')
      .populate('project', 'name slug type location')
      .populate('salesExecutive', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit not found' });
    }

    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSiteVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.create({
      ...req.body,
      customer: req.body.customer || req.user?._id,
    });

    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSiteVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name email phone')
      .populate('salesExecutive', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit not found' });
    }

    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const confirmVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', salesExecutive: req.body.salesExecutive || req.user._id },
      { new: true }
    ).populate('customer', 'name email phone');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit not found' });
    }

    try {
      await sendEmail({
        to: visit.customer.email,
        subject: 'Site Visit Confirmed',
        html: `<p>Dear ${visit.customer.name},</p>
               <p>Your site visit has been confirmed.</p>
               <p>Date: ${visit.preferredDate}</p>
               <p>Time: ${visit.preferredTime || 'To be confirmed'}</p>
               <p>Pickup: ${visit.pickupLocation || 'Visit site directly'}</p>`,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeVisit = async (req, res) => {
  try {
    const { notes, feedback } = req.body;

    const visit = await SiteVisit.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', notes, feedback },
      { new: true }
    );

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit not found' });
    }

    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyVisits = async (req, res) => {
  try {
    let query;

    if (req.user.role === 'customer') {
      query = { customer: req.user._id, isActive: true };
    } else {
      query = { salesExecutive: req.user._id, isActive: true };
    }

    const features = new APIFeatures(SiteVisit.find(query), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const visits = await features.query
      .populate('plot', 'plotNumber size price')
      .populate('project', 'name slug')
      .populate('salesExecutive', 'name email');

    const total = await SiteVisit.countDocuments(query);

    res.status(200).json({
      success: true,
      count: visits.length,
      total,
      data: visits,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVisitStats = async (req, res) => {
  try {
    const stats = await SiteVisit.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);

    const totalVisits = await SiteVisit.countDocuments({ isActive: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVisits = await SiteVisit.countDocuments({
      isActive: true,
      preferredDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    });

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalVisits,
        todayVisits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
