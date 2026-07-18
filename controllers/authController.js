import { register, login, logout, refreshToken } from './auth/authBase.js';
import { forgotPassword, resetPassword, updatePassword } from './auth/password.js';
import { verifyEmail, getMe, updateProfile } from './auth/profile.js';

export {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  getMe,
  updateProfile,
};
