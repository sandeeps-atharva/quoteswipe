import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Email types
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email function
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('Email not configured. Set SMTP_USER and SMTP_PASS environment variables.');
      return { success: false, error: 'Email service not configured' };
    }

    await transporter.sendMail({
      from: `"QuoteSwipe" <${process.env.SMTP_FROM || emailConfig.auth.user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

// Send bulk emails with rate limiting
export async function sendBulkEmails(
  emails: EmailOptions[],
  onProgress?: (sent: number, failed: number, total: number) => void
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < emails.length; i++) {
    const result = await sendEmail(emails[i]);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${emails[i].to}: ${result.error}`);
    }

    // Rate limiting: wait 100ms between emails to avoid spam filters
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Progress callback
    if (onProgress) {
      onProgress(sent, failed, emails.length);
    }
  }

  return { sent, failed, errors };
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      return false;
    }
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

