const nodemailer = require('nodemailer');

// Create transporter - using Gmail as default, but can be configured via env vars
const createTransporter = () => {
  // For development, use a test account or configure via env vars
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Default: Use Gmail with app password
  // Set SMTP_USER and SMTP_PASS in .env for Gmail
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback: Use ethereal email for testing (doesn't actually send)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
};

const sendInviteEmail = async (email, inviteToken, budgetName) => {
  const transporter = createTransporter();
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteUrl = `${baseUrl}?invite=${inviteToken}`;

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@budgettracker.com'
  const fromName = process.env.SMTP_FROM_NAME || 'Budget Tracker'
  
  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    replyTo: process.env.SMTP_REPLY_TO || fromAddress,
    to: email,
    subject: `You've been invited to join ${budgetName}`,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'List-Unsubscribe': '<mailto:' + fromAddress + '>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    },
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e293b; margin: 0;">Budget Tracker</h1>
        </div>
        <h2 style="color: #1e293b;">You've been invited!</h2>
        <p style="color: #374151; line-height: 1.6;">You've been invited to join <strong>${budgetName}</strong> on Budget Tracker.</p>
        <p style="color: #374151; line-height: 1.6;">Click the button below to create your account and join:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #475569; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invite & Create Account
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${inviteUrl}" style="color: #475569;">${inviteUrl}</a>
        </p>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This invite will expire in 7 days. If you didn't expect this invite, you can safely ignore this email.
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin-top: 10px; margin-bottom: 0;">
            This email was sent from ${fromAddress}. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `
You've been invited to join ${budgetName} on Budget Tracker.

Click this link to create your account and join:
${inviteUrl}

This invite will expire in 7 days.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invite email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending invite email:', error);
    throw error;
  }
};

module.exports = { sendInviteEmail };
