import Project from '../models/Project.js';

export const sanitizeProjectInput = (body) => {
  const data = { ...body };
  ['pricePerSqft', 'totalPlots', 'totalArea', 'possessionDate'].forEach((key) => {
    if (data[key] === null || data[key] === '' || data[key] === undefined) {
      delete data[key];
    }
  });
  return data;
};

export const validateDuplicateReraNumber = async (reraNumber, currentProjectId = null) => {
  if (!reraNumber || !reraNumber.trim()) return null;

  const reraTrimmed = reraNumber.trim();
  const query = {
    reraNumber: new RegExp('^' + reraTrimmed.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'),
    isActive: true,
  };
  if (currentProjectId) {
    query._id = { $ne: currentProjectId };
  }

  const existingRera = await Project.findOne(query);
  if (existingRera) {
    return `Duplicate Project: A project with RERA Number "${reraTrimmed}" already exists.`;
  }

  return null;
};

export const validateDuplicateNameAndLocation = async (name, location, city, currentProjectId = null) => {
  if (!name || !name.trim()) return null;

  const nameTrimmed = name.trim();
  const locAddress = location?.address || (typeof location === 'string' ? location : '');
  const locCity = location?.city || city || '';

  const query = {
    name: new RegExp('^' + nameTrimmed.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'),
    isActive: true,
  };
  if (currentProjectId) {
    query._id = { $ne: currentProjectId };
  }

  if (locAddress) {
    query['location.address'] = new RegExp('^' + locAddress.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
  }
  if (locCity) {
    query['location.city'] = new RegExp('^' + locCity.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
  }

  const existingNameLoc = await Project.findOne(query);
  if (existingNameLoc) {
    return `Duplicate Project: A project named "${nameTrimmed}" at this location already exists.`;
  }

  return null;
};
