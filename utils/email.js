import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html, from }) => {
  const isPlaceholder = 
    !process.env.EMAIL_USER || 
    process.env.EMAIL_USER.includes('your-email') || 
    !process.env.EMAIL_PASS || 
    process.env.EMAIL_PASS.includes('your-gmail-app-password') ||
    process.env.EMAIL_PASS.includes('your-app-password');

  // If credentials are not configured, perform a mock log to console.
  if (isPlaceholder) {
    console.log('\n=================== [MOCK EMAIL] ===================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${html.replace(/<[^>]*>/g, '')}`);
    console.log(`Link:    ${(html.match(/href="([^"]+)"/) || [])[1] || 'No Link'}`);
    console.log('====================================================\n');
    return { messageId: 'mock-id-123' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: from || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  return info;
};

export default sendEmail;
