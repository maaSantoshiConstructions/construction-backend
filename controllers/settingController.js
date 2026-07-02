import Setting from '../models/Setting.js';

const PUBLIC_KEYS = ['website_name', 'website_tagline', 'seo_title', 'seo_description', 'seo_keywords', 'social_facebook', 'social_instagram', 'social_youtube', 'social_linkedin', 'contact_email', 'contact_phone', 'contact_address', 'office_hours'];

export const getSettings = async (req, res) => {
  try {
    let query = { isActive: true };

    const isAdmin = req.user && ['super_admin', 'company_admin'].includes(req.user.role);

    if (!isAdmin) {
      query.key = { $in: PUBLIC_KEYS };
    }

    if (req.query.group) {
      query.group = req.query.group;
    }

    const settings = await Setting.find(query).sort('key');

    res.status(200).json({
      success: true,
      count: settings.length,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key, isActive: true });

    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    const isAdmin = req.user && ['super_admin', 'company_admin'].includes(req.user.role);

    if (!isAdmin && !PUBLIC_KEYS.includes(setting.key)) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value, group: req.body.group || 'general' },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.find({
      key: { $in: PUBLIC_KEYS },
      isActive: true,
    });

    const formatted = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
