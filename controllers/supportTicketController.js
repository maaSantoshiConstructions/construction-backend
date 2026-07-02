import SupportTicket from '../models/SupportTicket.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getTickets = async (req, res) => {
  try {
    const features = new APIFeatures(SupportTicket.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const tickets = await features.query
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email');

    const total = await SupportTicket.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email')
      .populate('conversation.sender', 'name role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTicket = async (req, res) => {
  try {
    const { subject, message, priority } = req.body;

    const ticket = await SupportTicket.create({
      customer: req.user._id,
      subject,
      message,
      priority,
      conversation: [
        {
          sender: req.user._id,
          message,
        },
      ],
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addReply = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          conversation: {
            sender: req.user._id,
            message,
          },
        },
      },
      { new: true }
    )
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .populate('conversation.sender', 'name role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const features = new APIFeatures(
      SupportTicket.find({ customer: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const tickets = await features.query
      .populate('assignedTo', 'name email');

    const total = await SupportTicket.countDocuments({ customer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const closeTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
