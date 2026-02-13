const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    console.warn('SMTP not configured — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, html, attachments }) {
  try {
    const transport = getTransporter();

    if (!transport) {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }

    await transport.sendMail({
      from: process.env.SMTP_FROM || 'RepairDesk <noreply@repairdesk.com>',
      to,
      subject,
      html,
      attachments,
    });
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, err.message);
  }
}

module.exports = { sendEmail };
