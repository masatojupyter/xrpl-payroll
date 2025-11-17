import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
};

// Basic email configuration
const mailConfig = {
  from: process.env.EMAIL_FROM || 'noreply@xrpl-payroll.com',
  fromName: 'XRPL Payroll',
};

/**
 * Send email function
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content
 * @param text Text content (optional)
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `${mailConfig.fromName} <${mailConfig.from}>`,
      to,
      subject,
      html,
      text: text || '',
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send email verification email
 * @param to Recipient email address
 * @param token Verification token
 * @param username Username
 */
export async function sendVerificationEmail({
  to,
  token,
  username,
}: {
  to: string;
  token: string;
  username: string;
}) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/set-password?token=${token}`;
  
  const subject = 'Verify Your Email Address and Set Password';
  const html = getVerificationEmailTemplate(username, verificationUrl);
  const text = `
Hello ${username},

Thank you for registering with Payroll XRP.

Please click the link below to verify your email address:
${verificationUrl}

This link is valid for 24 hours.

Best regards,
Payroll XRP Team
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * Send password reset email
 * @param to Recipient email address
 * @param token Reset token
 * @param username Username
 */
export async function sendPasswordResetEmail({
  to,
  token,
  username,
}: {
  to: string;
  token: string;
  username: string;
}) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
  
  const subject = 'Password Reset Request';
  const html = getPasswordResetEmailTemplate(username, resetUrl);
  const text = `
Hello ${username},

We received a request to reset your password.

Please click the link below to set a new password:
${resetUrl}

This link is valid for 1 hour.

If you did not request this, please ignore this email.

Best regards,
Payroll XRP Team
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * Send employee invitation email
 * @param to Recipient email address
 * @param token Invitation token
 * @param employeeName Employee name
 * @param organizationName Organization name
 */
export async function sendEmployeeInvitationEmail({
  to,
  token,
  employeeName,
  organizationName,
}: {
  to: string;
  token: string;
  employeeName: string;
  organizationName: string;
}) {
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/set-password?token=${token}`;
  
  const subject = 'Invitation to Employee Account';
  const html = getEmployeeInvitationEmailTemplate(employeeName, organizationName, invitationUrl);
  const text = `
Hello ${employeeName},

You have been invited to join ${organizationName}'s employee account.

Please click the link below to set your password and activate your account:
${invitationUrl}

This link is valid for 24 hours.

Best regards,
${organizationName}
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * Send welcome email
 * @param to Recipient email address
 * @param username Username
 */
export async function sendWelcomeEmail({
  to,
  username,
}: {
  to: string;
  username: string;
}) {
  const subject = 'Welcome to Payroll XRP';
  const html = getWelcomeEmailTemplate(username);
  const text = `
Hello ${username},

Welcome to Payroll XRP!

Your email address has been verified. You now have access to all features.

If you have any questions, please feel free to contact us.

Best regards,
Payroll XRP Team
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * HTML template for email verification
 */
function getVerificationEmailTemplate(username: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email Address</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      margin: 20px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payroll XRP</h1>
    </div>
    <div class="content">
      <h2>Verify Your Email Address</h2>
      <p>Hello, <strong>${username}</strong></p>
      <p>Thank you for registering with Payroll XRP.</p>
      <p>Please click the button below to verify your email address:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #666;">
        ${verificationUrl}
      </p>
      <p style="margin-top: 20px; font-size: 14px; color: #999;">
        Note: This link is valid for 24 hours.
      </p>
    </div>
    <div class="footer">
      <p>If you did not request this email, please ignore it.</p>
      <p>&copy; 2025 Payroll XRP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * HTML template for password reset
 */
function getPasswordResetEmailTemplate(username: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      margin: 20px 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payroll XRP</h1>
    </div>
    <div class="content">
      <h2>Password Reset Request</h2>
      <p>Hello, <strong>${username}</strong></p>
      <p>We received a request to reset your password.</p>
      <p>Please click the button below to set a new password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #666;">
        ${resetUrl}
      </p>
      <div class="warning">
        <p style="margin: 0; font-size: 14px;">
          <strong>Important:</strong> This link is valid for 1 hour only. If you did not request this, please ignore this email.
        </p>
      </div>
    </div>
    <div class="footer">
      <p>For security, we recommend changing your password regularly.</p>
      <p>&copy; 2025 Payroll XRP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * HTML template for employee invitation
 */
function getEmployeeInvitationEmailTemplate(
  employeeName: string,
  organizationName: string,
  invitationUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Employee Account</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      margin: 20px 0;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .info-box {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${organizationName}</h1>
    </div>
    <div class="content">
      <h2>Invitation to Employee Account</h2>
      <p>Hello, <strong>${employeeName}</strong></p>
      <p>You have been registered as an employee in ${organizationName}'s payroll management system.</p>
      <p>Please click the button below to set your password and activate your account:</p>
      <div style="text-align: center;">
        <a href="${invitationUrl}" class="button">Activate Account</a>
      </div>
      <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #666;">
        ${invitationUrl}
      </p>
      <div class="info-box">
        <p style="margin: 0; font-size: 14px;">
          <strong>Please note:</strong>
        </p>
        <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px;">
          <li>This link is valid for 24 hours</li>
          <li>After setting your password, you can log in to the system</li>
          <li>You will have access to payroll information and attendance management features</li>
        </ul>
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #999;">
        Note: If you did not expect this email, please ignore it.
      </p>
    </div>
    <div class="footer">
      <p>This email was sent from ${organizationName}.</p>
      <p>&copy; 2025 Payroll XRP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * HTML template for welcome email
 */
function getWelcomeEmailTemplate(username: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Payroll XRP</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
      font-size: 16px;
    }
    .feature-list {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .feature-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .feature-list li {
      margin: 10px 0;
      font-size: 16px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payroll XRP</h1>
    </div>
    <div class="content">
      <h2>Welcome!</h2>
      <p>Hello, <strong>${username}</strong></p>
      <p>Welcome to Payroll XRP! Your email address has been verified.</p>
      <p>You now have access to all features.</p>
      
      <div class="feature-list">
        <h3 style="margin-top: 0;">Key Features:</h3>
        <ul>
          <li>Secure XRP Ledger-based payroll management</li>
          <li>Payroll payments using XRP</li>
          <li>Transparent transaction records</li>
          <li>Real-time payroll processing</li>
        </ul>
      </div>
      
      <p>If you have any questions or need support, please feel free to contact us.</p>
      <p>Thank you for choosing Payroll XRP.</p>
    </div>
    <div class="footer">
      <p>For support, please contact support@xrpl-payroll.com</p>
      <p>&copy; 2025 Payroll XRP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
