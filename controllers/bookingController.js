import Booking from '../models/Booking.js';
import Plot from '../models/Plot.js';
import Customer from '../models/Customer.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getBookings = async (req, res) => {
  try {
    const features = new APIFeatures(Booking.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing')
      .populate('project', 'name slug')
      .populate('salesExecutive', 'name email')
      .populate('channelPartner', 'name email');

    const total = await Booking.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing price coordinates')
      .populate('project', 'name slug type')
      .populate('salesExecutive', 'name email')
      .populate('channelPartner', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { plot: plotId, customer, salesExecutive, channelPartner, tokenAmount, totalAmount, paymentPlan } = req.body;

    const plot = await Plot.findById(plotId);
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    if (plot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Plot is not available for booking' });
    }

    const booking = await Booking.create({
      customer: customer || req.user._id,
      plot: plotId,
      project: plot.project,
      salesExecutive,
      channelPartner,
      tokenAmount,
      totalAmount,
      paymentPlan,
    });

    plot.status = 'reserved';
    plot.booking = booking._id;
    await plot.save();

    await Customer.findOneAndUpdate(
      { user: customer || req.user._id },
      {
        user: customer || req.user._id,
        project: plot.project,
        plot: plotId,
        booking: booking._id,
        $inc: { totalPaid: tokenAmount || 0 },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name email phone')
      .populate('plot', 'plotNumber size facing')
      .populate('project', 'name slug');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    booking.isActive = false;
    await booking.save();

    await Plot.findByIdAndUpdate(booking.plot, {
      status: 'available',
      booking: null,
    });

    res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const features = new APIFeatures(
      Booking.find({ customer: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query
      .populate('plot', 'plotNumber size facing price')
      .populate('project', 'name slug type location');

    const total = await Booking.countDocuments({ customer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $project: { status: '$_id', count: 1, totalAmount: 1, _id: 0 } },
    ]);

    const totalBookings = await Booking.countDocuments({ isActive: true });
    const totalRevenue = await Booking.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalBookings,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
