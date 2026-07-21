import Lead from '../models/Lead.js';
import APIFeatures from '../utils/apiFeatures.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/email.js';
import path from 'path';
import fs from 'fs';

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
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #c29b38; margin-bottom: 16px;">Inquiry Received</h2>
            <p>Dear <strong>${lead.name}</strong>,</p>
            <p>Thank you for contacting Maa Santoshi Constructions. We have received your request regarding <strong>${lead.notes || lead.requirement || 'our property projects'}</strong>.</p>
            <p>Our sales executive will get in touch with you shortly.</p>
            <br/>
            <p style="color: #666; font-size: 14px;">Best regards,<br/><strong>Maa Santoshi Constructions Team</strong></p>
          </div>
        `,
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

      documentHtml = `
        <div style="margin: 20px 0; padding: 18px; background-color: #fffdf5; border: 1px solid #e9d5a1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px; font-weight: bold; color: #c29b38;">📌 Attached Document</div>
            <div>
              <h4 style="margin: 4px 0 0 0; color: #1e293b; font-size: 15px; font-weight: 600;">${req.file.originalname}</h4>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">File attached directly to this email message.</p>
            </div>
          </div>
        </div>
      `;
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

      documentHtml = `
        <div style="margin: 20px 0; padding: 18px; background-color: #fffdf5; border: 1px solid #e9d5a1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px; font-weight: bold; color: #c29b38;">📌 Attached Document</div>
            <div>
              <h4 style="margin: 4px 0 0 0; color: #1e293b; font-size: 15px; font-weight: 600;">${docTitle}</h4>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">File attached directly to this email message.</p>
            </div>
          </div>
        </div>
      `;
    }

    // Send email via Nodemailer
    await sendEmail({
      to: lead.email,
      subject: subject || 'Follow-up from Maa Santoshi Constructions',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #c29b38; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #c29b38; margin: 0; font-size: 22px;">Maa Santoshi Constructions</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Premium Real Estate & Plotted Developments</p>
          </div>

          <p>Dear <strong>${lead.name}</strong>,</p>

          <div style="margin: 16px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #c29b38; border-radius: 4px; line-height: 1.6;">
            ${message}
          </div>

          ${documentHtml}

          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">Best regards,<br/><strong style="color: #1e293b;">Maa Santoshi Constructions Team</strong></p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Phone: +91 98765 43210 | Email: support@maasantoshiconstructions.com</p>
          </div>
        </div>
      `,
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



