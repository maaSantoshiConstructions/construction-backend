import ChannelPartner from '../models/ChannelPartner.js';
import User from '../models/User.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getPartners = async (req, res) => {
  try {
    const features = new APIFeatures(ChannelPartner.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const partners = await features.query.populate('user', 'name email phone city');

    const total = await ChannelPartner.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: partners.length,
      total,
      data: partners,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPartner = async (req, res) => {
  try {
    const partner = await ChannelPartner.findById(req.params.id)
      .populate('user', 'name email phone city state');

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Channel partner not found' });
    }

    res.status(200).json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerPartner = async (req, res) => {
  try {
    const { name, email, phone, password, companyName, gstNumber, panNumber, address, city, state } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'channel_partner',
      address,
      city,
      state,
    });

    const partner = await ChannelPartner.create({
      user: user._id,
      companyName,
      gstNumber,
      panNumber,
      address,
      city,
      state,
    });

    res.status(201).json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        partner,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePartner = async (req, res) => {
  try {
    const partner = await ChannelPartner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email phone');

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Channel partner not found' });
    }

    if (req.body.name || req.body.email || req.body.phone) {
      const userUpdates = {};
      if (req.body.name) userUpdates.name = req.body.name;
      if (req.body.email) userUpdates.email = req.body.email;
      if (req.body.phone) userUpdates.phone = req.body.phone;
      await User.findByIdAndUpdate(partner.user._id, userUpdates);
    }

    res.status(200).json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPartner = async (req, res) => {
  try {
    const partner = await ChannelPartner.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).populate('user', 'name email');

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Channel partner not found' });
    }

    res.status(200).json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPartnerProfile = async (req, res) => {
  try {
    let partner = await ChannelPartner.findOne({ user: req.user._id })
      .populate('user', 'name email phone city state');

    if (!partner) {
      if (req.user.role === 'channel_partner') {
        partner = await ChannelPartner.create({
          user: req.user._id,
          companyName: `${req.user.name} Co.`,
          address: req.user.address || '',
          city: req.user.city || '',
          state: req.user.state || '',
        });
        partner = await ChannelPartner.findOne({ _id: partner._id })
          .populate('user', 'name email phone city state');
      } else {
        return res.status(404).json({ success: false, message: 'Partner profile not found' });
      }
    }

    res.status(200).json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPartnerStats = async (req, res) => {
  try {
    const totalPartners = await ChannelPartner.countDocuments({ isActive: true });
    const verifiedPartners = await ChannelPartner.countDocuments({ isActive: true, isVerified: true });
    const pendingVerification = await ChannelPartner.countDocuments({ isActive: true, isVerified: false });

    const totalEarnings = await ChannelPartner.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalEarnings' } } },
    ]);

    const totalPayout = await ChannelPartner.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalPayout' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPartners,
        verifiedPartners,
        pendingVerification,
        totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
        totalPayout: totalPayout.length > 0 ? totalPayout[0].total : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
