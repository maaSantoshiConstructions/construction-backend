import Lead from '../models/Lead.js';
import User from '../models/User.js';
import APIFeatures from '../utils/apiFeatures.js';
import sendEmail from '../utils/email.js';
import path from 'path';
import fs from 'fs';
import {
  getInquiryEmailHtml,
  getFollowupEmailHtml,
  getAttachmentCardHtml,
} from '../utils/leadEmailTemplates.js';

export const getLeads = async (req, res) => {
  try {
    // Auto-sync registered customer users to leads if missing
    try {
      const customers = await User.find({ role: 'customer', isActive: true });
      for (const cust of customers) {
        const query = [];
        if (cust.email) query.push({ email: cust.email });
        if (cust.phone) query.push({ phone: cust.phone });
        if (query.length > 0) {
          const exists = await Lead.findOne({ $or: query });
          if (!exists) {
            await Lead.create({
              name: cust.name,
              email: cust.email,
              phone: cust.phone || undefined,
              source: 'website_register',
              status: 'new',
            });
          }
        }
      }
    } catch (syncErr) {
      console.error('Customer lead sync warning:', syncErr.message);
    }

    const filter = { isActive: true };
    const features = new APIFeatures(Lead.find(filter), req.query)
      .search(['name', 'email', 'phone'])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const leads = await features.query;
    const total = await Lead.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: leads.length,
      total,
      data: leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const leadData = { ...req.body };
    const lead = await Lead.create(leadData);

    // Send confirmation email asynchronously via Nodemailer
    if (lead.email) {
      sendEmail({
        to: lead.email,
        subject: 'Thank you for your inquiry - Maa Santoshi Constructions',
        html: getInquiryEmailHtml({
          leadName: lead.name,
          requirement: lead.requirement || 'Plot Inquiry',
        }),
      }).catch((emailErr) => console.error('Inquiry confirmation email delivery failed:', emailErr.message));
    }

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyLeads = async (req, res) => {
  try {
    const features = new APIFeatures(
      Lead.find({ isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const leads = await features.query;
    const total = await Lead.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      count: leads.length,
      total,
      data: leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLeadStats = async (req, res) => {
  try {
    const stats = await Lead.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);

    const totalLeads = await Lead.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalLeads,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendLeadEmail = async (req, res) => {
  try {
    const { subject, message, presetFile } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!lead.email) {
      return res.status(400).json({ success: false, message: `Lead ${lead.name} does not have an email address.` });
    }

    const attachments = [];
    let documentHtml = '';

    if (req.file) {
      attachments.push({
        filename: req.file.originalname,
        path: req.file.path,
        contentType: req.file.mimetype,
      });
      documentHtml = getAttachmentCardHtml(req.file.originalname);
    } else if (presetFile && presetFile !== 'none') {
      let fileName = 'Project_Brochure_Maa_Santoshi.pdf';
      let docTitle = 'Project Brochure & Pricing Plan.pdf';

      if (presetFile === 'summary') {
        fileName = 'Property_Summary_Payment_Plan.pdf';
        docTitle = 'Property Summary & Site Visit Overview.pdf';
      }

      const filePath = path.join(process.cwd(), 'backend', 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        attachments.push({
          filename: docTitle,
          path: filePath,
          contentType: 'application/pdf',
        });
      }

      documentHtml = getAttachmentCardHtml(docTitle);
    }

    await sendEmail({
      to: lead.email,
      subject: subject || 'Follow-up from Maa Santoshi Constructions',
      html: getFollowupEmailHtml({
        leadName: lead.name,
        message,
        documentHtml,
      }),
      attachments,
    });

    res.status(200).json({
      success: true,
      message: `Email successfully sent to ${lead.email}`,
      data: lead,
    });
  } catch (error) {
    console.error('sendLeadEmail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
