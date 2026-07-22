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

    // Calculate revenue from Payments or Bookings
    const paymentRev = await Payment.aggregate([
      { $match: { isActive: true, status: { $ne: 'failed' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const bookingRev = await Booking.aggregate([
      { $match: { isActive: true, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]);

    const revAmount = (paymentRev.length > 0 && paymentRev[0].total > 0)
      ? paymentRev[0].total
      : (bookingRev.length > 0 ? bookingRev[0].total : 0);

    const totalLeads = await Lead.countDocuments({ isActive: true });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const siteVisitsThisMonth = await SiteVisit.countDocuments({
      isActive: true,
      preferredDate: { $gte: startOfMonth },
    });

    const pendingBookings = await Booking.countDocuments({
      isActive: true,
      status: { $in: ['token', 'partial'] },
    });

    // 1. Fetch 5 Recent Leads
    const recentLeads = await Lead.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedTo', 'name email')
      .populate('project', 'name slug');

    // 2. Fetch 5 Recent Bookings
    const recentBookings = await Booking.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber price')
      .populate('project', 'name slug');

    // 3. Monthly Sales / Revenue for the last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesMap = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlySalesMap.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        month: monthNames[d.getMonth()],
        amount: 0,
        count: 0
      });
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const paymentMonthly = await Payment.aggregate([
      {
        $match: {
          isActive: true,
          status: { $ne: 'failed' },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    paymentMonthly.forEach(p => {
      const target = monthlySalesMap.find(m => m.year === p._id.year && m.monthIndex === p._id.month - 1);
      if (target) {
        target.amount = p.amount;
        target.count = p.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalPlots,
        availablePlots,
        soldPlots,
        reservedPlots,
        revenue: revAmount,
        totalRevenue: revAmount,
        totalLeads,
        siteVisitsThisMonth,
        pendingBookings,
        recentLeads,
        recentBookings,
        monthlySales: monthlySalesMap,
      },
    });
  } catch (error) {
    console.error('getAdminDashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
