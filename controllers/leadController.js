import asyncHandler from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/responseHandler.js';
import * as leadService from '../services/leadService.js';

export const getLeads = asyncHandler(async (req, res) => {
  const { leads, total } = await leadService.fetchAllLeads(req.query);
  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    data: leads,
  });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await leadService.fetchLeadById(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  sendSuccess(res, lead);
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await leadService.createNewLead(req.body, req.user?._id);
  res.status(201).json({ success: true, data: lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateExistingLead(
    req.params.id,
    req.body,
    req.user?._id
  );

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  sendSuccess(res, lead);
});

export const assignLead = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const lead = await leadService.assignLeadToUser(req.params.id, assignedTo);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  res.status(200).json({ success: true, data: lead });
});

export const getMyLeads = asyncHandler(async (req, res) => {
  const { leads, total } = await leadService.fetchMyLeads(req.user._id, req.query);
  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    data: leads,
  });
});

export const getLeadStats = asyncHandler(async (req, res) => {
  const data = await leadService.fetchLeadStats();
  res.status(200).json({
    success: true,
    data,
  });
});

export const addNote = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'Note text is required' });
  }

  const lead = await leadService.addNoteToLead(req.params.id, text, req.user?._id);
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  res.status(200).json({ success: true, data: lead });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await leadService.softDeleteLead(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  sendSuccess(res, null, 'Lead deleted successfully');
});

export const sendLeadEmail = asyncHandler(async (req, res) => {
  const { subject, message, presetFile } = req.body;
  const result = await leadService.sendLeadEmailService(req.params.id, {
    subject,
    message,
    presetFile,
    file: req.file,
  });

  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ success: false, message: result.message });
  }

  if (result.error === 'NO_EMAIL') {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.status(200).json({
    success: true,
    message: `Email successfully sent to ${result.lead.email}`,
    data: result.lead,
  });
});
