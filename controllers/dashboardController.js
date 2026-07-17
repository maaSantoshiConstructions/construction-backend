import Project from '../models/Project.js';
import Plot from '../models/Plot.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Lead from '../models/Lead.js';
import SiteVisit from '../models/SiteVisit.js';
import Customer from '../models/Customer.js';
import Notification from '../models/Notification.js';
import Referral from '../models/Referral.js';
import ChannelPartner from '../models/ChannelPartner.js';
import ConstructionUpdate from '../models/ConstructionUpdate.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ isActive: true });
    const totalPlots = await Plot.countDocuments({ isActive: true });
    const availablePlots = await Plot.countDocuments({ isActive: true, status: 'available' });
    const soldPlots = await Plot.countDocuments({ isActive: true, status: 'sold' });
    const reservedPlots = await Plot.countDocuments({ isActive: true, status: 'reserved' });

    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed', isActive: true } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalLeads = await Lead.countDocuments({ isActive: true });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlySales = await Booking.aggregate([
      {
        $match: {
          isActive: true,
          bookingDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$bookingDate' },
            month: { $month: '$bookingDate' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          revenue: 1,
        },
      },
    ]);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const siteVisitsThisMonth = await SiteVisit.countDocuments({
      isActive: true,
      preferredDate: { $gte: startOfMonth },
    });

    const pendingBookings = await Booking.countDocuments({
      isActive: true,
      status: { $in: ['token', 'partial'] },
    });

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalPlots,
        availablePlots,
        soldPlots,
        reservedPlots,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        totalLeads,
        monthlySales,
        siteVisitsThisMonth,
        pendingBookings,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesDashboard = async (req, res) => {
  try {
    const assignedLeads = await Lead.countDocuments({
      assignedTo: req.user._id,
      isActive: true,
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const siteVisitsThisWeek = await SiteVisit.countDocuments({
      salesExecutive: req.user._id,
      preferredDate: { $gte: startOfWeek },
      isActive: true,
    });

    const upcomingVisits = await SiteVisit.find({
      salesExecutive: req.user._id,
      preferredDate: { $gte: now },
      status: { $in: ['pending', 'confirmed'] },
      isActive: true,
    })
      .sort('preferredDate')
      .limit(10)
      .populate('customer', 'name phone')
      .populate('project', 'name slug');

    const totalAssignedLeads = await Lead.countDocuments({
      assignedTo: req.user._id,
      isActive: true,
    });
    const convertedLeads = await Lead.countDocuments({
      assignedTo: req.user._id,
      status: 'booking_done',
      isActive: true,
    });
    const conversionRate = totalAssignedLeads > 0
      ? Math.round((convertedLeads / totalAssignedLeads) * 100 * 100) / 100
      : 0;

    const recentActivity = await Lead.find({
      assignedTo: req.user._id,
      isActive: true,
    })
      .sort('-updatedAt')
      .limit(5)
      .select('name status updatedAt');

    res.status(200).json({
      success: true,
      data: {
        assignedLeads,
        siteVisitsThisWeek,
        upcomingVisits,
        conversionRate,
        recentActivity,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerDashboard = async (req, res) => {
  try {
    const myProperties = await Booking.countDocuments({
      customer: req.user._id,
      isActive: true,
      status: { $ne: 'cancelled' },
    });

    const upcomingBookings = await Booking.find({
      customer: req.user._id,
      isActive: true,
      status: { $in: ['token', 'partial'] },
    }).populate('project', 'name slug');

    const customerRecord = await Customer.findOne({ user: req.user._id });

    const referralEarnings = await Referral.aggregate([
      { $match: { referrer: req.user._id, isActive: true } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]);

    const recentUpdates = await ConstructionUpdate.find({ isActive: true })
      .sort('-date')
      .limit(5)
      .populate('project', 'name slug');

    if (customerRecord?.plot) {
      const plotUpdates = await ConstructionUpdate.find({
        plot: customerRecord.plot,
        isActive: true,
      })
        .sort('-date')
        .limit(5)
        .populate('project', 'name slug');

      const seenIds = new Set(recentUpdates.map((u) => u._id.toString()));
      plotUpdates.forEach((u) => {
        if (!seenIds.has(u._id.toString())) {
          recentUpdates.push(u);
          seenIds.add(u._id.toString());
        }
      });
    }

    const notifications = await Notification.find({
      recipient: req.user._id,
      isActive: true,
    })
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        myProperties,
        upcomingPayments: upcomingBookings,
        totalPaid: customerRecord?.totalPaid || 0,
        referralEarnings: referralEarnings.length > 0 ? referralEarnings[0].total : 0,
        recentUpdates,
        notifications,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
