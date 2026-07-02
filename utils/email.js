import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html, from }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: from || process.env.SMTP_EMAIL,
    to,
    subject,
    html,
  });

  return info;
};

export default sendEmail;
