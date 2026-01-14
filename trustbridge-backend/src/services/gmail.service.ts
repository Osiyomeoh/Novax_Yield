import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private transporter: nodemailer.Transporter;
  private resend: Resend | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Check if Resend API key is configured
   */
  private hasResend(): boolean {
    return !!this.configService.get<string>('RESEND_API_KEY');
  }

  /**
   * Send email via Resend API (works on Render since it uses HTTP)
   */
  private async sendViaResend(to: string, subject: string, html: string, text: string, fromEmail: string): Promise<boolean> {
    if (!this.resend) {
      throw new Error('Resend client not initialized');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `TrustBridge <${fromEmail}>`, // Proper from name format
        to: to,
        replyTo: fromEmail, // Add reply-to for better deliverability
        subject: subject,
        html: html,
        text: text,
        // Add headers to reduce spam score and mark as transactional
        headers: {
          'X-Entity-Ref-ID': `verification-${Date.now()}`, // Transactional identifier
          'X-Transaction-Type': 'verification', // Mark as transactional email
          'List-Unsubscribe': `<${this.configService.get<string>('FRONTEND_URL', 'https://www.tbafrica.xyz')}/unsubscribe>`, // Reduce spam score
          'Precedence': 'bulk', // Helps email clients identify transactional emails
          'Auto-Submitted': 'auto-generated', // Marks as automated transactional email
        },
        // Add tags for better tracking and categorization
        tags: [
          {
            name: 'category',
            value: 'transactional'
          },
          {
            name: 'type',
            value: 'verification'
          }
        ],
      });

      if (error) {
        throw new Error(`Resend API error: ${JSON.stringify(error)}`);
      }

      this.logger.log(`✅ Email sent via Resend to ${to}: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Resend API error:`, error);
      throw error;
    }
  }

  private initializeTransporter() {
    // Check if we're on Render (which blocks SMTP connections)
    const isRender = process.env.RENDER || process.env.RENDER_EXTERNAL_URL || false;
    
    // Initialize Resend if API key is configured
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('✅ Resend client initialized');
      
      // If on Render, use Resend (HTTP API works on Render)
      if (isRender) {
        this.logger.log('✅ Render detected with Resend API - using Resend for email (HTTP API, works on Render)');
        this.transporter = null; // We'll use Resend API instead
        return;
      }
      // If not on Render, Resend will be preferred but SMTP is still available as fallback
    }
    
    // If on Render without Resend, use console logging only
    if (isRender) {
      this.logger.warn('🚨 Render detected - SMTP connections are blocked. Using console logging only.');
      this.logger.warn('💡 To enable email on Render, set RESEND_API_KEY environment variable');
      this.transporter = null;
      return;
    }
    
    // Priority: cPanel SMTP > Gmail > Console logging
    
    // Try cPanel SMTP first (recommended for cloud platforms, but not Render)
    const cpanelHost = this.configService.get<string>('CPANEL_SMTP_HOST');
    const cpanelPort = this.configService.get<string>('CPANEL_SMTP_PORT');
    const cpanelUser = this.configService.get<string>('CPANEL_SMTP_USER');
    const cpanelPassword = this.configService.get<string>('CPANEL_SMTP_PASSWORD');
    const cpanelFromEmail = this.configService.get<string>('CPANEL_SMTP_FROM_EMAIL');
    
    if (cpanelHost && cpanelUser && cpanelPassword) {
      const port = parseInt(cpanelPort || '587', 10);
      const isSecure = port === 465;
      
      this.logger.log('Initializing cPanel SMTP transporter:', {
        host: cpanelHost,
        port: port,
        secure: isSecure,
        user: cpanelUser ? `${cpanelUser.substring(0, 3)}***` : 'NOT_SET',
      });
      
      const cpanelConfig = {
        host: cpanelHost,
        port: port,
        secure: isSecure, // true for 465, false for other ports
        auth: {
          user: cpanelUser,
          pass: cpanelPassword,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
        connectionTimeout: 20000, // 20 seconds for cloud platforms
        greetingTimeout: 20000,
        socketTimeout: 20000,
        // Add pool settings for better connection management
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
      };
      
      this.transporter = nodemailer.createTransport(cpanelConfig);
      this.logger.log('cPanel SMTP transporter initialized (connection will be verified on first send)');
      return;
    }
    
    // Fallback to Gmail SMTP (works locally, may timeout on Render)
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');
    
    if (gmailUser && gmailPassword && gmailUser !== 'your-gmail@gmail.com' && gmailPassword !== 'your-16-character-app-password') {
      this.logger.log('Initializing Gmail SMTP transporter:', {
        user: `${gmailUser.substring(0, 3)}***@gmail.com`,
      });
      
      const gmailConfig = {
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword, // Use App Password, not regular password
        },
        // Add timeout settings to prevent hanging (works locally but may timeout on cloud platforms)
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
      };

      this.transporter = nodemailer.createTransport(gmailConfig);
      this.logger.log('Gmail SMTP transporter initialized (connection will be verified on first send)');
      return;
    }
    
    // No SMTP configured - use console logging
    this.logger.warn('No SMTP credentials configured (cPanel or Gmail). Using console logging for email verification.');
    this.logger.warn('To enable email: Set CPANEL_SMTP_* or GMAIL_* environment variables');
    this.transporter = null;
  }

  async sendVerificationEmail(to: string, verificationCode: string, userName: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001')}/auth/verify-email?code=${verificationCode}`;
    
    // Always log to console as a fallback (for Render logs)
    this.logger.warn('='.repeat(80));
    this.logger.warn(`VERIFICATION EMAIL FOR: ${to}`);
    this.logger.warn(`USER: ${userName}`);
    this.logger.warn(`VERIFICATION CODE: ${verificationCode}`);
    this.logger.warn(`VERIFICATION URL: ${verificationUrl}`);
    this.logger.warn('='.repeat(80));
    
    // Get from email address (prioritize Resend, then cPanel, then Gmail, then default)
    const resendFromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
    const cpanelFromEmail = this.configService.get<string>('CPANEL_SMTP_FROM_EMAIL');
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const fromEmail = resendFromEmail || cpanelFromEmail || gmailUser || 'noreply@tbafrica.xyz';
    
    const subject = 'Your TrustBridge verification code: ' + verificationCode;
    const html = this.getVerificationEmailTemplate(userName, verificationUrl, verificationCode);
    const text = this.getVerificationEmailText(userName, verificationUrl, verificationCode);
    
    // Check if Resend is configured (preferred for Render since it uses HTTP API)
    if (this.resend && this.hasResend()) {
      // Use Resend API (works on Render since it uses HTTP)
      // Wait for Resend to complete (it's fast, uses HTTP API)
      try {
        await this.sendViaResend(to, subject, html, text, fromEmail);
        this.logger.log(`✅ Verification email sent via Resend to ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send verification email via Resend to ${to}:`, error);
        // Email is already logged to console above, but return false so caller knows it failed
        return false;
      }
    }
    
    // If no transporter, return immediately (console logging is enough)
    if (!this.transporter) {
      this.logger.warn('No email service configured - using console logging only');
      return true;
    }
    
    // Use SMTP (only works if not on Render)
    const mailOptions = {
      from: {
        name: 'TrustBridge',
        address: fromEmail,
      },
      to: to,
      subject: subject,
      html: html,
      text: text,
    };

    // Send email asynchronously (fire and forget) - don't block the request
    // This prevents timeouts on cloud platforms where SMTP connections can be slow
    this.sendEmailAsync(mailOptions, to).catch((error) => {
      this.logger.error(`Failed to send verification email to ${to} (async):`, error);
      // Error already logged, but email is still logged to console above
    });
    
    // Return immediately - email is being sent in background
    return true;
  }

  /**
   * Send email asynchronously without blocking the request
   * This prevents timeout issues on cloud platforms
   */
  private async sendEmailAsync(mailOptions: any, recipientEmail: string): Promise<void> {
    try {
      // Add timeout wrapper to prevent hanging (especially on cloud platforms)
      const sendMailPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 25 seconds - likely network/firewall issue on hosting platform')), 25000)
      );

      const result = await Promise.race([sendMailPromise, timeoutPromise]);
      this.logger.log(`✅ Verification email sent successfully to ${recipientEmail}: ${(result as any).messageId}`);
    } catch (error) {
      // Log error but don't throw - email is already logged to console
      this.logger.error(`❌ Failed to send verification email to ${recipientEmail}:`, error);
      throw error; // Re-throw for caller to handle if needed
    }
  }

  async sendEmail(to: string | string[], subject: string, htmlContent: string, textContent?: string): Promise<boolean> {
    try {
      const recipients = Array.isArray(to) ? to : [to];
      
      // Get from email address (prioritize cPanel, then Gmail, then default)
      const cpanelFromEmail = this.configService.get<string>('CPANEL_SMTP_FROM_EMAIL');
      const gmailUser = this.configService.get<string>('GMAIL_USER');
      const fromEmail = cpanelFromEmail || gmailUser || 'noreply@tbafrica.xyz';
      
      const mailOptions = {
        from: {
          name: 'TrustBridge',
          address: fromEmail,
        },
        to: recipients,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${recipients.join(', ')}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  private getVerificationEmailTemplate(userName: string, verificationUrl: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Verify Your TrustBridge Account</title>
        <style>
          /* Reset styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            opacity: 0.3;
          }
          
          .logo-container {
            position: relative;
            z-index: 1;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            background: #ffffff;
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          
          .logo-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #000000, #1a1a1a);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            font-weight: bold;
          }
          
          .brand-name {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.5px;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
            line-height: 1.3;
          }
          
          .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          
          .verification-section {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          
          .verification-label {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
          }
          
          .code {
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            color: #ffffff;
            padding: 24px 32px;
            border-radius: 12px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: inline-block;
            min-width: 200px;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            color: #ffffff;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
          }
          
          .button:hover {
            background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          }
          
          .warning {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            color: #92400e;
            padding: 20px;
            border-radius: 12px;
            margin: 30px 0;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .warning-icon {
            font-size: 18px;
            margin-right: 8px;
          }
          
          .features {
            margin: 30px 0;
          }
          
          .features-title {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 16px;
          }
          
          .features-list {
            list-style: none;
            padding: 0;
          }
          
          .features-list li {
            padding: 8px 0;
            color: #4a5568;
            font-size: 15px;
            display: flex;
            align-items: center;
          }
          
          .features-list li::before {
            content: '✓';
            background: #000000;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
          }
          
          .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          
          .footer-text {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
          }
          
          .footer-link {
            color: #000000;
            text-decoration: none;
            font-weight: 500;
          }
          
          .footer-link:hover {
            text-decoration: underline;
          }
          
          .copyright {
            color: #9ca3af;
            font-size: 12px;
            margin-top: 16px;
          }
          
          /* Responsive styles */
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .email-container {
              border-radius: 12px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .brand-name {
              font-size: 28px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .greeting {
              font-size: 22px;
            }
            
            .code {
              font-size: 28px;
              letter-spacing: 6px;
              padding: 20px 24px;
            }
            
            .verification-section {
              padding: 20px;
            }
          }
          
          @media (max-width: 480px) {
            .code {
              font-size: 24px;
              letter-spacing: 4px;
              padding: 16px 20px;
            }
            
            .button {
              padding: 14px 24px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo-container">
              <div class="logo">
                <div class="logo-icon">🌍</div>
              </div>
              <div class="brand-name">TrustBridge</div>
              <div class="tagline">Universal Asset Protocol for Africa</div>
            </div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${userName},</div>
            
            <div class="message">
              Please use the verification code below to verify your email address and complete your account setup.
            </div>
            
            <div class="verification-section">
              <div class="verification-label">Your Verification Code</div>
              <div class="code">${code}</div>
              <div style="margin-top: 20px;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
            </div>
            
            <div class="warning">
              <span class="warning-icon">⏰</span>
              <strong>Important:</strong> This code expires in 10 minutes. If you didn't request this code, please ignore this email or contact support.
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              This email was sent by <a href="https://trustbridge.africa" class="footer-link">TrustBridge</a>
            </div>
            <div class="footer-text">
              If you have any questions, please contact our support team.
            </div>
            <div class="copyright">
              © 2024 TrustBridge. All rights reserved. | Building Africa's Financial Future
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getVerificationEmailText(userName: string, verificationUrl: string, code: string): string {
    return `
Hello ${userName},

Please use the verification code below to verify your email address and complete your account setup.

Verification Code: ${code}

Or click this link to verify: ${verificationUrl}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email or contact our support team.

Best regards,
TrustBridge Team
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}
