import Gallery from '../models/Gallery.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getGalleryItems = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.type) query.type = req.query.type;
    if (req.query.category) query.category = req.query.category;
    if (req.query.project) query.project = req.query.project;

    const features = new APIFeatures(Gallery.find(query), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const items = await features.query.populate('project', 'name slug');
    const total = await Gallery.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id).populate('project', 'name slug');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGalleryItem = async (req, res) => {
  try {
    const mediaUrl = req.file ? req.file.path || req.file.location : req.body.url;
    const thumbnail = req.files?.thumbnail ? req.files.thumbnail[0].path || req.files.thumbnail[0].location : undefined;

    const item = await Gallery.create({
      ...req.body,
      url: mediaUrl,
      thumbnail,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGalleryItem = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.url = req.file.path || req.file.location;
    }

    const item = await Gallery.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    res.status(200).json({ success: true, message: 'Gallery item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
