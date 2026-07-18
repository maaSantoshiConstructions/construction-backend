import Lead from '../../models/Lead.js';
import SiteVisit from '../../models/SiteVisit.js';

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
