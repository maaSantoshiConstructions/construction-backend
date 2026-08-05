import asyncHandler from '../middleware/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import * as projectService from '../services/project.service.js';

export const getProjects = asyncHandler(async (req, res) => {
  const { projects, total } = await projectService.fetchAllProjects(req.query);
  sendPaginated(res, projects, total, req.query.page, req.query.limit);
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.fetchProjectBySlug(req.params.slug);

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  sendSuccess(res, project);
});

export const createProject = asyncHandler(async (req, res) => {
  const result = await projectService.createNewProject(req.body, req.user?._id);

  if (result.error === 'VALIDATION_ERROR') {
    return res.status(400).json({ success: false, message: result.message });
  }

  sendSuccess(res, result.project, null, 201);
});

export const updateProject = asyncHandler(async (req, res) => {
  const result = await projectService.updateProjectById(req.params.id, req.body);

  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ success: false, message: result.message });
  }

  if (result.error === 'VALIDATION_ERROR') {
    return res.status(400).json({ success: false, message: result.message });
  }

  sendSuccess(res, result.project);
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await projectService.softDeleteProjectById(req.params.id);

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  sendSuccess(res, null, 'Project deactivated successfully');
});

export const uploadProjectImages = asyncHandler(async (req, res) => {
  const result = await projectService.appendProjectImages(req.params.id, req.files);

  if (result.error === 'NOT_FOUND') {
    return res.status(404).json({ success: false, message: result.message });
  }

  if (result.error === 'NO_FILES') {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.status(200).json({ success: true, data: result.project });
});

export const getProjectStats = asyncHandler(async (req, res) => {
  const data = await projectService.fetchProjectPlotStats(req.params.id);
  res.status(200).json({
    success: true,
    data,
  });
});
