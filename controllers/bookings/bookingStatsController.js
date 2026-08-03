import Booking from '../../models/Booking.js';

// ─── GET /bookings/stats ──────────────────────────────────────────────────────
export const getBookingStats = async (req, res) => {
  try {
    const byBookingStatus = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
        },
      },
      { $project: { bookingStatus: '$_id', count: 1, totalAmount: 1, paidAmount: 1, _id: 0 } },
    ]);

    const byPaymentStatus = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          paidAmount: { $sum: '$paidAmount' },
        },
      },
      { $project: { paymentStatus: '$_id', count: 1, paidAmount: 1, _id: 0 } },
    ]);

    const totalBookings = await Booking.countDocuments({ isActive: true });
    const revenueAgg = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
        },
      },
    ]);

    const revenue = revenueAgg[0] || { totalRevenue: 0, totalCollected: 0, totalOutstanding: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        byBookingStatus,
        byPaymentStatus,
        ...revenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
