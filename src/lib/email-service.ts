import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
}

export interface MagicLinkEmailData {
  to: string;
  magicLink: string;
  appName?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  
  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: config.auth,
      // For MailHog, disable authentication requirements
      ...(config.host === 'localhost' && {
        auth: undefined,
        tls: {
          rejectUnauthorized: false
        }
      })
    });
  }

  /**
   * Send a magic link verification email
   */
  async sendMagicLinkEmail(data: MagicLinkEmailData): Promise<void> {
    const { to, magicLink, appName = 'gatherKids' } = data;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complete Your Registration - ${appName}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              text-align: center; 
              padding: 20px 0; 
              border-bottom: 3px solid #2563eb; 
              margin-bottom: 30px; 
            }
            .logo { 
              font-size: 32px; 
              font-weight: bold; 
              color: #2563eb; 
            }
            .content { 
              padding: 20px 0; 
            }
            .button { 
              display: inline-block; 
              background-color: #2563eb; 
              color: white; 
              text-decoration: none; 
              padding: 12px 30px; 
              border-radius: 6px; 
              font-weight: 600; 
              margin: 20px 0; 
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              font-size: 14px; 
              color: #6b7280; 
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              color: #92400e;
              padding: 12px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${appName}</div>
            <h1 style="margin: 10px 0 0 0; color: #1f2937;">Complete Your Registration</h1>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            
            <p>You're just one step away from completing your family registration with ${appName}. Click the button below to verify your email address and continue:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" class="button">Complete Registration</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">
              ${magicLink}
            </p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This magic link will expire in 1 hour and can only be used once. If you didn't request this registration, you can safely ignore this email.
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Welcome to the ${appName} family!</p>
          </div>
          
          <div class="footer">
            <p>
              This email was sent to ${to} because you started a registration process with ${appName}. 
              If you didn't request this, please ignore this email.
            </p>
            <p style="margin-top: 10px;">
              Magic links expire after 1 hour for your security.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Complete Your Registration - ${appName}

Hi there!

You're just one step away from completing your family registration with ${appName}. 

Click this link to verify your email address and continue:
${magicLink}

⚠️ Security Notice: This magic link will expire in 1 hour and can only be used once. If you didn't request this registration, you can safely ignore this email.

If you have any questions or need assistance, please contact our support team.

Welcome to the ${appName} family!

---
This email was sent to ${to} because you started a registration process with ${appName}. 
If you didn't request this, please ignore this email.
Magic links expire after 1 hour for your security.
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${appName}" <noreply@gatherkids.local>`,
        to: to,
        subject: `Complete your ${appName} registration`,
        text: textContent,
        html: htmlContent,
      });

      console.log('Magic link email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send magic link email:', error);
      throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Factory function to create email service with environment configuration
export function createEmailService(): EmailService {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
  };

  // Add authentication if provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  return new EmailService(config);
}