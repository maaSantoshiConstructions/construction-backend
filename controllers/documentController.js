import Document from '../models/Document.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getDocuments = async (req, res) => {
  try {
    const features = new APIFeatures(Document.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const documents = await features.query
      .populate('customer', 'name email')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber')
      .populate('booking', 'bookingId')
      .populate('verifiedBy', 'name');

    const total = await Document.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: documents.length,
      total,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber')
      .populate('booking', 'bookingId')
      .populate('verifiedBy', 'name');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const { title, type, project, plot, booking, customer, description } = req.body;

    const fileUrl = req.file ? (req.file.path || req.file.location) : undefined;

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const document = await Document.create({
      title,
      type,
      fileUrl,
      project,
      plot,
      booking,
      customer: customer || req.user._id,
      description,
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        isVerified: true,
        verifiedBy: req.user._id,
      },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email')
      .populate('verifiedBy', 'name');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDocuments = async (req, res) => {
  try {
    const features = new APIFeatures(
      Document.find({ customer: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const documents = await features.query
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber')
      .populate('booking', 'bookingId');

    const total = await Document.countDocuments({ customer: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: documents.length,
      total,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
