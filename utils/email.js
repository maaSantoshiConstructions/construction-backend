import nodemailer from 'nodemailer';

/**
 * Send email using Nodemailer
 * @param {Object} options - { to, subject, html, text, from, attachments }
 */
const sendEmail = async ({ to, subject, html, text, from, attachments }) => {
  const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  const rawPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';
  const emailPass = rawPass.replace(/\s+/g, ''); // strip any accidental whitespace from Gmail App Passwords

  const isPlaceholder = 
    !emailUser || 
    emailUser.includes('your-email') || 
    !emailPass || 
    emailPass.includes('your-gmail-app-password') ||
    emailPass.includes('your-app-password');

  // If credentials are not configured, perform a mock log to console.
  if (isPlaceholder) {
    console.log('\n=================== [MOCK EMAIL] ===================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${(html || text || '').replace(/<[^>]*>/g, '')}`);
    console.log('====================================================\n');
    return { messageId: 'mock-id-123' };
  }

  let transporterConfig;
  if (process.env.EMAIL_HOST) {
    transporterConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };
  } else {
    transporterConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };
  }

  const transporter = nodemailer.createTransport(transporterConfig);

  const defaultFrom = process.env.EMAIL_FROM || `"Maa Santoshi Constructions" <${emailUser}>`;

  const mailOptions = {
    from: from || defaultFrom,
    to,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[Nodemailer] Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

export default sendEmail;
