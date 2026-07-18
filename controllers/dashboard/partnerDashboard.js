import ChannelPartner from '../../models/ChannelPartner.js';
import Referral from '../../models/Referral.js';
import Lead from '../../models/Lead.js';

export const getPartnerDashboard = async (req, res) => {
  try {
    let partner = await ChannelPartner.findOne({ user: req.user._id });

    if (!partner) {
      if (req.user.role === 'channel_partner') {
        partner = await ChannelPartner.create({
          user: req.user._id,
          companyName: `${req.user.name} Co.`,
          address: req.user.address || '',
          city: req.user.city || '',
          state: req.user.state || '',
        });
      } else {
        return res.status(404).json({ success: false, message: 'Partner profile not found' });
      }
    }

    const referrals = await Referral.countDocuments({
      referrer: req.user._id,
      isActive: true,
    });

    const leadsGenerated = await Lead.countDocuments({
      assignedTo: req.user._id,
      source: 'referral',
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        totalCommission: partner.totalEarnings || 0,
        pendingCommission: (partner.totalEarnings || 0) - (partner.totalPayout || 0),
        totalReferrals: referrals,
        leadsGenerated,
        partnerDetails: {
          companyName: partner.companyName,
          commissionRate: partner.commissionRate,
          referralCode: partner.referralCode,
          isVerified: partner.isVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
