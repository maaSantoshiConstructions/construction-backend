/**
 * Standard Mongoose Population Configurations
 * Consolidates populate parameters across controllers.
 */

export const POPULATE_CUSTOMER_BASIC = {
  path: 'customer',
  select: 'name email phone',
};

export const POPULATE_CUSTOMER_FULL = {
  path: 'customer',
  select: 'name email phone address city state avatar',
};

export const POPULATE_PLOT_BASIC = {
  path: 'plot',
  select: 'plotNumber size facing price',
};

export const POPULATE_PLOT_FULL = {
  path: 'plot',
  select: 'plotNumber size facing price ratePerSqYd roadWidth corner coordinates status',
};

export const POPULATE_PROJECT_BASIC = {
  path: 'project',
  select: 'name slug',
};

export const POPULATE_PROJECT_FULL = {
  path: 'project',
  select: 'name slug type location',
};

export const POPULATE_STAFF_BASIC = (field) => ({
  path: field,
  select: 'name email phone',
});
