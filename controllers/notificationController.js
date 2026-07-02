import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user._id, isActive: true })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: req.user._id, isActive: true });
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false, isActive: true },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isActive: true,
    });

    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { recipient, title, message, type, link } = req.body;

    if (recipient === 'all') {
      const users = await User.find({ isActive: true }).select('_id');
      const notifications = users.map((user) => ({
        recipient: user._id,
        title,
        message,
        type,
        link,
      }));
      await Notification.insertMany(notifications);

      return res.status(201).json({
        success: true,
        message: `Notification sent to ${users.length} users`,
      });
    }

    const notification = await Notification.create({
      recipient,
      title,
      message,
      type,
      link,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
