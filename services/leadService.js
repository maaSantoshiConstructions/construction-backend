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

export const syncCustomerUsersToLeads = async () => {
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
};

export const fetchAllLeads = async (query, authUser) => {
  await syncCustomerUsersToLeads();

  const filter = { isActive: true };

  // If customer or channel partner requests leads without specifying explicit query, scope to their referrals
  if (authUser && (authUser.role === 'customer' || authUser.role === 'channel_partner') && !query?.all) {
    filter.referredBy = authUser._id;
  }

  const features = new APIFeatures(
    Lead.find(filter).populate('referredBy', 'name email phone referralCode role'),
    query
  )
    .search(['name', 'email', 'phone'])
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const leads = await features.query;
  const total = await Lead.countDocuments(filter);

  return { leads, total };
};

export const fetchLeadById = async (id) => {
  return await Lead.findById(id).populate('referredBy', 'name email phone referralCode role');
};

export const normalizeNotesInput = (notes, userId) => {
  if (!notes) return undefined;
  if (typeof notes === 'string') {
    return [{ text: notes, createdBy: userId }];
  }
  if (Array.isArray(notes)) {
    return notes.map((n) => (typeof n === 'string' ? { text: n, createdBy: userId } : n));
  }
  return notes;
};

export const createNewLead = async (leadData, authUser) => {
  const payload = { ...leadData };
  const userId = authUser?._id || authUser;

  if (payload.notes) {
    payload.notes = normalizeNotesInput(payload.notes, userId);
  }

  // Populate referrer fields if logged in user is submitting
  if (authUser && typeof authUser === 'object' && authUser._id) {
    payload.referredBy = payload.referredBy || authUser._id;
    payload.referralCode =
      payload.referralCode ||
      authUser.referralCode ||
      `REF-${authUser._id.toString().slice(-6).toUpperCase()}`;
    payload.referrerInfo = {
      name: authUser.name || payload.referrerInfo?.name || '',
      email: authUser.email || payload.referrerInfo?.email || '',
      phone: authUser.phone || payload.referrerInfo?.phone || '',
    };
  }

  const lead = await Lead.create(payload);

  if (lead.referredBy) {
    await lead.populate('referredBy', 'name email phone referralCode role');
  }

  if (lead.email) {
    sendEmail({
      to: lead.email,
      subject: 'Thank you for your inquiry - Maa Santoshi Constructions',
      html: getInquiryEmailHtml({
        leadName: lead.name,
        requirement: lead.requirement || 'Plot Inquiry',
      }),
    }).catch((emailErr) =>
      console.error('Inquiry confirmation email delivery failed:', emailErr.message)
    );
  }

  return lead;
};

export const updateExistingLead = async (id, updateData, userId) => {
  const payload = { ...updateData };
  if (payload.notes) {
    payload.notes = normalizeNotesInput(payload.notes, userId);
  }

  return await Lead.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const assignLeadToUser = async (id, assignedTo) => {
  return await Lead.findByIdAndUpdate(
    id,
    { assignedTo },
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name email');
};

export const fetchMyLeads = async (userId, query) => {
  const filter = { isActive: true, assignedTo: userId };
  const features = new APIFeatures(Lead.find(filter), query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const leads = await features.query;
  const total = await Lead.countDocuments(filter);

  return { leads, total };
};

export const fetchLeadStats = async () => {
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

  return { stats, totalLeads };
};

export const addNoteToLead = async (id, text, userId) => {
  const lead = await Lead.findById(id);
  if (!lead) return null;

  lead.notes.push({ text, createdBy: userId });
  await lead.save();
  return lead;
};

export const softDeleteLead = async (id) => {
  return await Lead.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

export const sendLeadEmailService = async (id, { subject, message, presetFile, file }) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    return { error: 'NOT_FOUND', message: 'Lead not found' };
  }

  if (!lead.email) {
    return { error: 'NO_EMAIL', message: `Lead ${lead.name} does not have an email address.` };
  }

  const attachments = [];
  let documentHtml = '';

  if (file) {
    attachments.push({
      filename: file.originalname,
      path: file.path,
      contentType: file.mimetype,
    });
    documentHtml = getAttachmentCardHtml(file.originalname);
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

  return { lead };
};
