function layout(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #1e40af; font-size: 24px; margin: 0; }
    .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header"><h1>RepairDesk</h1></div>
      ${content}
    </div>
    <div class="footer">
      <p>This email was sent by RepairDesk. If you did not expect this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

function welcomeEmail({ name, verifyUrl }) {
  return {
    subject: 'Welcome to RepairDesk — Verify Your Email',
    html: layout(`
      <h2>Welcome, ${name}!</h2>
      <p>Thanks for signing up for RepairDesk. Please verify your email address to get started.</p>
      <p style="text-align:center"><a href="${verifyUrl}" class="btn">Verify Email</a></p>
      <p style="color:#6b7280;font-size:14px">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all;font-size:13px;color:#6b7280">${verifyUrl}</p>
    `),
  };
}

function passwordResetEmail({ name, resetUrl }) {
  return {
    subject: 'RepairDesk — Password Reset Request',
    html: layout(`
      <h2>Password Reset</h2>
      <p>Hi ${name}, we received a request to reset your password. Click the link below to set a new password.</p>
      <p style="text-align:center"><a href="${resetUrl}" class="btn">Reset Password</a></p>
      <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <p style="word-break:break-all;font-size:13px;color:#6b7280">${resetUrl}</p>
    `),
  };
}

function statusChangeEmail({ customerName, ticketNumber, storeName, status, trackingUrl }) {
  const label = status.replace(/_/g, ' ');
  return {
    subject: `Repair Update — Ticket #${ticketNumber} is now "${label}"`,
    html: layout(`
      <h2>Repair Status Update</h2>
      <p>Hi ${customerName},</p>
      <p>Your repair at <strong>${storeName}</strong> has been updated:</p>
      <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
        <p style="margin:0;color:#6b7280">Ticket #${ticketNumber}</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#1e40af">${label}</p>
      </div>
      <p style="text-align:center"><a href="${trackingUrl}" class="btn">Track Your Repair</a></p>
    `),
  };
}

function approvalNeededEmail({ customerName, ticketNumber, storeName, trackingUrl }) {
  return {
    subject: `Action Required — Approve Repair for Ticket #${ticketNumber}`,
    html: layout(`
      <h2>Approval Needed</h2>
      <p>Hi ${customerName},</p>
      <p>Your repair at <strong>${storeName}</strong> requires your approval before we can proceed.</p>
      <p style="text-align:center"><a href="${trackingUrl}" class="btn">Review & Approve</a></p>
    `),
  };
}

function invoiceEmail({ customerName, ticketNumber, storeName }) {
  return {
    subject: `Invoice for Repair — Ticket #${ticketNumber}`,
    html: layout(`
      <h2>Your Invoice</h2>
      <p>Hi ${customerName},</p>
      <p>Please find attached the invoice for your repair at <strong>${storeName}</strong> (Ticket #${ticketNumber}).</p>
      <p>Thank you for your business!</p>
    `),
  };
}

module.exports = {
  welcomeEmail,
  passwordResetEmail,
  statusChangeEmail,
  approvalNeededEmail,
  invoiceEmail,
};
