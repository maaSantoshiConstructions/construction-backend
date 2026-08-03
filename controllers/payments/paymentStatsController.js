import Payment from '../../models/Payment.js';

// ─── GET /payments/stats ──────────────────────────────────────────────────────
export const getPaymentStats = async (req, res) => {
  try {
    const byType = await Payment.aggregate([
      { $match: { transactionStatus: 'success', isActive: true } },
      { $group: { _id: '$paymentType', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { paymentType: '$_id', total: 1, count: 1, _id: 0 } },
    ]);

    const byStatus = await Payment.aggregate([
      { $group: { _id: '$transactionStatus', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { transactionStatus: '$_id', total: 1, count: 1, _id: 0 } },
    ]);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { transactionStatus: 'success', isActive: true } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $project: { year: '$_id.year', month: '$_id.month', revenue: 1, count: 1, _id: 0 } },
    ]);

    res.status(200).json({
      success: true,
      data: { byType, byStatus, monthlyRevenue },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
