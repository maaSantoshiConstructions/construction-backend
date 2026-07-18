import Booking from '../../models/Booking.js';
import Customer from '../../models/Customer.js';
import Referral from '../../models/Referral.js';
import ConstructionUpdate from '../../models/ConstructionUpdate.js';
import Notification from '../../models/Notification.js';

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
