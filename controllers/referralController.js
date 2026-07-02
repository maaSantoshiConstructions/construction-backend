import Referral from '../models/Referral.js';
import ChannelPartner from '../models/ChannelPartner.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getReferrals = async (req, res) => {
  try {
    const features = new APIFeatures(Referral.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const referrals = await features.query
      .populate('referrer', 'name email phone')
      .populate('referredUser', 'name email phone');

    const total = await Referral.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: referrals.length,
      total,
      data: referrals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReferral = async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('referrer', 'name email phone')
      .populate('referredUser', 'name email phone');

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    res.status(200).json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReferral = async (req, res) => {
  try {
    const { referredUser, referralCode } = req.body;

    const referral = await Referral.create({
      referrer: req.user._id,
      referredUser,
      referralCode,
    });

    res.status(201).json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyReferrals = async (req, res) => {
  try {
    const features = new APIFeatures(
      Referral.find({ referrer: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const referrals = await features.query.populate('referredUser', 'name email');

    const total = await Referral.countDocuments({ referrer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: referrals.length,
      total,
      data: referrals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReferralStats = async (req, res) => {
  try {
    const stats = await Referral.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCommission: { $sum: '$commissionAmount' },
        },
      },
      { $project: { status: '$_id', count: 1, totalCommission: 1, _id: 0 } },
    ]);

    const totalReferrals = await Referral.countDocuments({ isActive: true });
    const totalCommissionPaid = await Referral.aggregate([
      { $match: { isActive: true, status: 'commission_paid' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalReferrals,
        totalCommissionPaid: totalCommissionPaid.length > 0 ? totalCommissionPaid[0].total : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markCommissionPaid = async (req, res) => {
  try {
    const referral = await Referral.findByIdAndUpdate(
      req.params.id,
      {
        status: 'commission_paid',
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    res.status(200).json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
