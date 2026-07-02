import PropertyValuation from '../models/PropertyValuation.js';
import APIFeatures from '../utils/apiFeatures.js';

const RATES = {
  plot: 2800,
  villa: 4200,
  apartment: 3500,
  commercial: 5200,
};

function calculateValue(landArea, propertyType) {
  const rate = RATES[propertyType] || 3000;
  const baseValue = landArea * rate;
  const variance = 0.85 + Math.random() * 0.3;
  const estimatedValue = Math.round(baseValue * variance);
  const confidence = Math.round((70 + Math.random() * 25) * 10) / 10;
  return { estimatedValue, confidence };
}

export const createValuation = async (req, res) => {
  try {
    const { name, phone, email, propertyAddress, propertyType, landArea } = req.body;

    if (!name || !phone || !propertyAddress) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and property address are required',
      });
    }

    let estimatedValue, confidence;

    if (landArea && landArea > 0) {
      const calc = calculateValue(landArea, propertyType);
      estimatedValue = calc.estimatedValue;
      confidence = calc.confidence;
    }

    const valuation = await PropertyValuation.create({
      name,
      phone,
      email,
      propertyAddress,
      propertyType,
      landArea,
      estimatedValue,
      confidence,
    });

    res.status(201).json({ success: true, data: valuation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getValuations = async (req, res) => {
  try {
    const features = new APIFeatures(PropertyValuation.find({ isActive: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const valuations = await features.query;
    const total = await PropertyValuation.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: valuations.length,
      total,
      data: valuations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getValuation = async (req, res) => {
  try {
    const valuation = await PropertyValuation.findById(req.params.id);

    if (!valuation) {
      return res.status(404).json({ success: false, message: 'Valuation not found' });
    }

    res.status(200).json({ success: true, data: valuation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'contacted', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const valuation = await PropertyValuation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!valuation) {
      return res.status(404).json({ success: false, message: 'Valuation not found' });
    }

    res.status(200).json({ success: true, data: valuation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
