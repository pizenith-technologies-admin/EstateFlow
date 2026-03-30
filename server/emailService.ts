// Email notification service using SendGrid integration
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not set - email notifications will be disabled");
}

const mailService = new MailService();
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  mailService.setApiKey(sendgridApiKey);
}

/** Login link base for client-facing emails (welcome, etc.) */
function publicWebAppUrl(): string {
  const u = process.env.PUBLIC_APP_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "http://localhost:5000";
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('Email would have been sent:', params.subject);
    return true; // Return success for development without API key
  }

  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Real estate email templates
export interface TourReminderEmailData {
  agentName: string;
  clientName: string;
  propertyAddress: string;
  tourDate: string;
  tourTime: string;
  agentPhone?: string;
  notes?: string;
}

export interface ShowingConfirmationEmailData {
  clientName: string;
  agentName: string;
  propertyAddress: string;
  showingDate: string;
  showingTime: string;
  agentContact: string;
}

export function generateTourReminderEmail(data: TourReminderEmailData) {
  const subject = `Reminder: Property Tour Tomorrow - ${data.propertyAddress}`;
  
  const text = `Hi ${data.agentName},

This is a friendly reminder about your scheduled property tour tomorrow:

Property: ${data.propertyAddress}
Date: ${data.tourDate}
Time: ${data.tourTime}
Client: ${data.clientName}
${data.agentPhone ? `Contact: ${data.agentPhone}` : ''}

${data.notes ? `Notes: ${data.notes}` : ''}

Please ensure you arrive 15 minutes early to prepare the property and have all necessary materials ready.

Best regards,
Estate Vista Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🏠 Tour Reminder</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Don't forget about your upcoming property tour</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${data.agentName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          This is a friendly reminder about your scheduled property tour tomorrow:
        </p>
        
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <div style="display: grid; gap: 12px;">
            <div><strong style="color: #111827;">Property:</strong> <span style="color: #374151;">${data.propertyAddress}</span></div>
            <div><strong style="color: #111827;">Date:</strong> <span style="color: #374151;">${data.tourDate}</span></div>
            <div><strong style="color: #111827;">Time:</strong> <span style="color: #374151;">${data.tourTime}</span></div>
            <div><strong style="color: #111827;">Client:</strong> <span style="color: #374151;">${data.clientName}</span></div>
            ${data.agentPhone ? `<div><strong style="color: #111827;">Contact:</strong> <span style="color: #374151;">${data.agentPhone}</span></div>` : ''}
          </div>
        </div>
        
        ${data.notes ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
            <strong style="color: #92400e;">Notes:</strong>
            <p style="color: #92400e; margin: 8px 0 0 0;">${data.notes}</p>
          </div>
        ` : ''}
        
        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #047857; margin: 0; font-weight: 500;">💡 Pro Tip:</p>
          <p style="color: #047857; margin: 8px 0 0 0;">Please arrive 15 minutes early to prepare the property and have all necessary materials ready.</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          Best regards,<br>
          <strong>Estate Vista Team</strong>
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export function generateShowingConfirmationEmail(data: ShowingConfirmationEmailData) {
  const subject = `Showing Confirmed - ${data.propertyAddress}`;
  
  const text = `Hi ${data.clientName},

Your property showing has been confirmed!

Property: ${data.propertyAddress}
Date: ${data.showingDate}
Time: ${data.showingTime}
Agent: ${data.agentName}
Contact: ${data.agentContact}

Your agent will meet you at the property. Please arrive on time and bring a valid ID.

If you have any questions or need to reschedule, please contact your agent directly.

Best regards,
Estate Vista Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Showing Confirmed</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Your property viewing is all set</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${data.clientName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Your property showing has been confirmed! Here are the details:
        </p>
        
        <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <div style="display: grid; gap: 12px;">
            <div><strong style="color: #111827;">Property:</strong> <span style="color: #374151;">${data.propertyAddress}</span></div>
            <div><strong style="color: #111827;">Date:</strong> <span style="color: #374151;">${data.showingDate}</span></div>
            <div><strong style="color: #111827;">Time:</strong> <span style="color: #374151;">${data.showingTime}</span></div>
            <div><strong style="color: #111827;">Agent:</strong> <span style="color: #374151;">${data.agentName}</span></div>
            <div><strong style="color: #111827;">Contact:</strong> <span style="color: #374151;">${data.agentContact}</span></div>
          </div>
        </div>
        
        <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #1d4ed8; margin: 0; font-weight: 500;">📋 Important:</p>
          <p style="color: #1d4ed8; margin: 8px 0 0 0;">Your agent will meet you at the property. Please arrive on time and bring a valid ID.</p>
        </div>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          If you have any questions or need to reschedule, please contact your agent directly.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          Best regards,<br>
          <strong>Estate Vista Team</strong>
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

// Schedule change notification
export interface ScheduleChangeEmailData {
  recipientName: string;
  propertyAddress: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  agentName: string;
  agentContact: string;
  reason?: string;
}

export interface ClientWelcomeEmailData {
  clientName: string;
  email: string;
  password: string;
  agentName: string;
  agentEmail: string;
}

export function generateClientWelcomeEmail(data: ClientWelcomeEmailData) {
  const subject = `Welcome to Estate Vista - Your Account is Ready`;
  
  const text = `Hi ${data.clientName},

Welcome to Estate Vista! Your agent ${data.agentName} has created an account for you.

Here are your login credentials:

Email: ${data.email}
Password: ${data.password}

You can now log in to Estate Vista at ${publicWebAppUrl()} to:
- View properties your agent is showing you
- Rate and provide feedback on properties
- Access documents and important information
- View your tour history and shortlisted properties

For security, we recommend changing your password after your first login.

If you have any questions, please contact your agent:
${data.agentName} (${data.agentEmail})

Welcome aboard!

Best regards,
Estate Vista Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">👋 Welcome to Estate Vista</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Your account is ready to use</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${data.clientName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Welcome to <strong>Estate Vista</strong>! Your agent <strong>${data.agentName}</strong> has created an account for you to streamline your property search.
        </p>
        
        <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <p style="color: #1d4ed8; margin: 0 0 12px 0; font-weight: 600;">📝 Your Login Credentials</p>
          <div style="background: white; border-radius: 6px; padding: 16px; margin-top: 8px;">
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 13px; text-transform: uppercase; font-weight: 600;">Email</span>
              <p style="color: #111827; font-size: 15px; margin: 4px 0 0 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${data.email}</p>
            </div>
            <div>
              <span style="color: #6b7280; font-size: 13px; text-transform: uppercase; font-weight: 600;">Password</span>
              <p style="color: #111827; font-size: 15px; margin: 4px 0 0 0; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${data.password}</p>
            </div>
          </div>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #047857; margin: 0; font-weight: 500;">✨ What You Can Do Now</p>
          <ul style="color: #047857; margin: 12px 0 0 16px; padding: 0;">
            <li style="margin-bottom: 6px;">View properties your agent is showing you</li>
            <li style="margin-bottom: 6px;">Rate and provide feedback on properties</li>
            <li style="margin-bottom: 6px;">Access documents and important information</li>
            <li style="margin-bottom: 6px;">View your tour history and shortlisted properties</li>
          </ul>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #92400e; margin: 0; font-weight: 500;">🔐 Security Tip</p>
          <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px;">We recommend changing your password after your first login for security.</p>
        </div>
        
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
          <strong>Questions?</strong> Contact your agent directly:
        </p>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          <strong>${data.agentName}</strong><br>
          ${data.agentEmail}
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Best regards,<br>
          <strong>Estate Vista Team</strong>
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export function generateScheduleChangeEmail(data: ScheduleChangeEmailData) {
  const subject = `Schedule Change - ${data.propertyAddress}`;
  
  const text = `Hi ${data.recipientName},

There has been a change to your property showing schedule:

Property: ${data.propertyAddress}

Original Schedule:
Date: ${data.originalDate}
Time: ${data.originalTime}

NEW Schedule:
Date: ${data.newDate}
Time: ${data.newTime}

Agent: ${data.agentName}
Contact: ${data.agentContact}

${data.reason ? `Reason: ${data.reason}` : ''}

Please confirm your availability for the new time. We apologize for any inconvenience.

Best regards,
Estate Vista Team`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🔄 Schedule Change</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Your showing time has been updated</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${data.recipientName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          There has been a change to your property showing schedule:
        </p>
        
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 16px 0;">
          <div><strong style="color: #111827;">Property:</strong> <span style="color: #374151;">${data.propertyAddress}</span></div>
        </div>
        
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 0 0 8px 0;">
          <p style="color: #dc2626; margin: 0; font-weight: 500;">❌ Original Schedule:</p>
          <div style="color: #dc2626; margin: 8px 0 0 0;">
            <div>Date: ${data.originalDate}</div>
            <div>Time: ${data.originalTime}</div>
          </div>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #047857; margin: 0; font-weight: 500;">✅ NEW Schedule:</p>
          <div style="color: #047857; margin: 8px 0 0 0;">
            <div><strong>Date: ${data.newDate}</strong></div>
            <div><strong>Time: ${data.newTime}</strong></div>
          </div>
        </div>
        
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
          <div><strong style="color: #111827;">Agent:</strong> <span style="color: #374151;">${data.agentName}</span></div>
          <div style="margin-top: 8px;"><strong style="color: #111827;">Contact:</strong> <span style="color: #374151;">${data.agentContact}</span></div>
        </div>
        
        ${data.reason ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
            <strong style="color: #92400e;">Reason:</strong>
            <p style="color: #92400e; margin: 8px 0 0 0;">${data.reason}</p>
          </div>
        ` : ''}
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Please confirm your availability for the new time. We apologize for any inconvenience.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
          Best regards,<br>
          <strong>Estate Vista Team</strong>
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}