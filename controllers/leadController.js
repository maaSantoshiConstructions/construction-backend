import Lead from '../models/Lead.js';
import APIFeatures from '../utils/apiFeatures.js';
import jwt from 'jsonwebtoken';
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
    const filter = { isActive: true };
    if (req.user.role === 'channel_partner') {
      filter.assignedTo = req.user._id;
    }

    const features = new APIFeatures(Lead.find(filter), req.query)
      .search(['name', 'email', 'phone'])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const leads = await features.query
      .populate('assignedTo', 'name email')
      .populate('project', 'name slug');

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
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('project', 'name slug')
      .populate('plot', 'plotNumber');

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

    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        leadData.assignedTo = decoded.id;
      } catch (err) {
        // Ignore token verify error for public contact form submissions
      }
    }

    const lead = await Lead.create(leadData);

    // Send confirmation email asynchronously via Nodemailer
    if (lead.email) {
      sendEmail({
        to: lead.email,
        subject: 'Thank you for your inquiry - Maa Santoshi Constructions',
        html: getInquiryEmailHtml({
          leadName: lead.name,
          requirement: lead.notes || lead.requirement,
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
    })
      .populate('assignedTo', 'name email')
      .populate('project', 'name slug');

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
    const { assignedTo } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

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
      Lead.find({ assignedTo: req.user._id, isActive: true }),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const leads = await features.query.populate('project', 'name slug');

    const total = await Lead.countDocuments({ assignedTo: req.user._id, isActive: true });

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
    const { note } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: note,
          conversationLog: {
            message: note,
            by: req.user._id,
            date: new Date(),
          },
        },
      },
      { new: true }
    );

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
    const { subject, message, channel, presetFile } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!lead.email) {
      return res.status(400).json({ success: false, message: `Lead ${lead.name} does not have an email address.` });
    }

    const attachments = [];
    let documentHtml = '';

    // 1. Manually uploaded file via Multer
    if (req.file) {
      attachments.push({
        filename: req.file.originalname,
        path: req.file.path,
        contentType: req.file.mimetype,
      });
      documentHtml = getAttachmentCardHtml(req.file.originalname);
    } 
    // 2. Preset document if selected
    else if (presetFile && presetFile !== 'none') {
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

    // Send email via Nodemailer
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

    const noteText = `[AI Follow-up: ${channel || 'Email'}] Sent: "${message}" ${attachments.length > 0 ? `(Attached: ${attachments[0].filename})` : ''}`;
    lead.notes.push(noteText);
    lead.conversationLog.push({
      message: noteText,
      by: req.user?._id,
      date: new Date(),
    });
    await lead.save();

    res.status(200).json({
      success: true,
      message: `Email successfully sent to ${lead.email}${attachments.length > 0 ? ` with attachment "${attachments[0].filename}"` : ''}`,
      attached: attachments.length > 0,
      attachedFileName: attachments.length > 0 ? attachments[0].filename : null,
      data: lead,
    });
  } catch (error) {
    console.error('sendLeadEmail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
