import FAQ from '../models/FAQ.js';
import APIFeatures from '../utils/apiFeatures.js';

export const getFAQs = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.category) query.category = req.query.category;

    const features = new APIFeatures(FAQ.find(query), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const faqs = await features.query.sort('order');
    const total = await FAQ.countDocuments(query);

    res.status(200).json({
      success: true,
      count: faqs.length,
      total,
      data: faqs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFAQ = async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);

    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    res.status(200).json({ success: true, data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    res.status(200).json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
