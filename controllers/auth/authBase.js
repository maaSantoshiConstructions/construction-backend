import User from '../../models/User.js';
import { generateToken, generateRefreshToken, verifyToken } from '../../utils/generateToken.js';
import sendEmail from '../../utils/email.js';

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'customer',
      isVerified: true,
    });

    const token = user.getSignedJwtToken();

    // Send welcome email asynchronously via Nodemailer
    sendEmail({
      to: user.email,
      subject: 'Welcome to Maa Santoshi Constructions!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #c29b38; margin-bottom: 16px;">Welcome to Maa Santoshi Constructions!</h2>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Thank you for registering with Maa Santoshi Constructions. We are excited to assist you in finding your ideal property.</p>
          <p>You can now explore premium plots, track construction updates, and schedule site visits directly from your dashboard.</p>
          <br/>
          <p style="color: #666; font-size: 14px;">Best regards,<br/><strong>Maa Santoshi Constructions Team</strong></p>
        </div>
      `,
    }).catch((emailErr) => console.error('Welcome email delivery failed:', emailErr.message));

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = user.getSignedJwtToken();
    const refreshToken = user.getRefreshToken();

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findOne({ _id: decoded.id, refreshToken: token });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: { token: newToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save();

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
