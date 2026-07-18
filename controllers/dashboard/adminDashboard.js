import Project from '../../models/Project.js';
import Plot from '../../models/Plot.js';
import Booking from '../../models/Booking.js';
import Payment from '../../models/Payment.js';
import Lead from '../../models/Lead.js';
import SiteVisit from '../../models/SiteVisit.js';

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
