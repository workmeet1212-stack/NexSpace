import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);
const FROM = env.EMAIL_FROM;

interface OTPEmailParams {
  email: string;
  name: string;
  otp: string;
  purpose: 'email_verify' | 'password_reset';
}

interface InviteEmailParams {
  email: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}

interface TaskAssignedEmailParams {
  email: string;
  assigneeName: string;
  taskTitle: string;
  taskId: string;
  projectName: string;
  taskUrl: string;
}

export const sendOTPEmail = async ({
  email,
  name,
  otp,
  purpose,
}: OTPEmailParams): Promise<void> => {
  const subjects: Record<string, string> = {
    email_verify: 'Verify your NexSpace account',
    password_reset: 'Reset your NexSpace password',
  };

  const purposeText = purpose === 'email_verify'
    ? 'Welcome to NexSpace! Please verify your email address to get started.'
    : 'Reset your password using the verification code below.';

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: subjects[purpose] || 'NexSpace OTP',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">
        NexSpace
      </h1>
    </div>
    <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">
      Hi ${name}!
    </h2>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      ${purposeText}
    </p>
    <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">
        Your verification code
      </p>
      <h1 style="color: #111827; font-size: 48px; letter-spacing: 8px; margin: 0; font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 600;">
        ${otp}
      </h1>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0;">
        Expires in 10 minutes
      </p>
    </div>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
      If you didn't request this code, please ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This email was sent by NexSpace. If you have questions, please contact our support team.
    </p>
  </div>
</body>
</html>`,
  });
};

export const sendInviteEmail = async ({
  email,
  inviterName,
  workspaceName,
  inviteUrl,
}: InviteEmailParams): Promise<void> => {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${inviterName} invited you to join ${workspaceName} on NexSpace`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">
        NexSpace
      </h1>
    </div>
    <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">
      You're invited!
    </h2>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on NexSpace.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 14px; text-align: center;">
      This invitation will expire in 7 days.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This email was sent by NexSpace. If you didn't expect this invitation, you can ignore this email.
    </p>
  </div>
</body>
</html>`,
  });
};

export const sendTaskAssignedEmail = async ({
  email,
  assigneeName,
  taskTitle,
  taskId,
  projectName,
  taskUrl,
}: TaskAssignedEmailParams): Promise<void> => {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `You've been assigned to: ${taskTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">
        NexSpace
      </h1>
    </div>
    <h2 style="color: #111827; font-size: 22px; margin-bottom: 8px;">
      Hi ${assigneeName}!
    </h2>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      You've been assigned to a new task.
    </p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #6366f1;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; font-family: 'SF Mono', monospace;">
        ${taskId}
      </p>
      <h3 style="color: #111827; font-size: 18px; margin: 0 0 8px;">
        ${taskTitle}
      </h3>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        Project: ${projectName}
      </p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${taskUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Task
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      You're receiving this because you're a member of this project.
    </p>
  </div>
</body>
</html>`,
  });
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Welcome to NexSpace!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0; font-weight: 700;">
        NexSpace
      </h1>
    </div>
    <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">
      Welcome aboard, ${name}!
    </h2>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Thanks for joining NexSpace. We're excited to have you on board! NexSpace is your AI-powered project management platform.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${env.CLIENT_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Go to Dashboard
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      This email was sent by NexSpace.
    </p>
  </div>
</body>
</html>`,
  });
};
