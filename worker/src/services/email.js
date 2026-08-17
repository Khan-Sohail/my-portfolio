/**
 * Email notification service (transactional email via Resend REST API).
 * Provider-agnostic: talks to {RESEND_API_URL}/emails with a Bearer token.
 */

import { log } from '../logger.js';

const DEFAULT_API_URL = 'https://api.resend.com';

/**
 * Escape text for HTML email body.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the notification email (HTML + plain text).
 * @param {{ name: string, email: string, message: string }} submission
 * @returns {{ subject: string, html: string, text: string }}
 */
export function buildEmailContent(submission) {
  const timestamp = new Date().toISOString();
  const subject = `New Portfolio Contact — ${submission.name}`;

  const text = [
    'New message from the portfolio contact form.',
    '',
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    '',
    'Message:',
    submission.message,
    '',
    `Submitted: ${timestamp}`,
    'Source: Portfolio Contact Form',
    '',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2430;">
      <h2 style="color:#ff2d20;margin-bottom:4px;">New Portfolio Contact</h2>
      <p style="color:#5b6472;margin-top:0;">Message from the portfolio contact form</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;color:#5b6472;font-weight:bold;width:110px;">Name</td>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;">${escapeHtml(submission.name)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;color:#5b6472;font-weight:bold;">Email</td>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
            <a href="mailto:${escapeHtml(submission.email)}" style="color:#ff2d20;">${escapeHtml(submission.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;color:#5b6472;font-weight:bold;vertical-align:top;">Message</td>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(submission.message)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;color:#5b6472;font-weight:bold;">Submitted</td>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;">${timestamp}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;color:#5b6472;font-weight:bold;">Source</td>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;">Portfolio Contact Form</td>
        </tr>
      </table>
      <p style="color:#8f8f8f;font-size:12px;margin-top:24px;">Sent from the portfolio contact form of Sohail Khan.</p>
    </div>
  `;

  return { subject, html, text };
}

/**
 * Send the contact notification email via Resend.
 * @param {{ name: string, email: string, message: string }} submission
 * @param {object} env
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true } | { ok: false, status: number }>}
 */
export async function sendEmailNotification(submission, env, fetchImpl = fetch) {
  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_EMAIL;
  const from = env.MAIL_FROM;

  if (!apiKey || !to || !from) {
    log('error', 'Email configuration incomplete (RESEND_API_KEY / CONTACT_EMAIL / MAIL_FROM).');
    return { ok: false, status: 0 };
  }

  const { subject, html, text } = buildEmailContent(submission);
  const baseUrl = (env.RESEND_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

  try {
    const response = await fetchImpl(`${baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!response.ok) {
      log('warn', 'Email notification rejected by provider.', {
        status: response.status,
      });
      return { ok: false, status: response.status };
    }

    log('info', 'Email notification sent.', { to });
    return { ok: true, status: response.status };
  } catch (err) {
    log('error', 'Email notification failed (network/exception).', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, status: 0 };
  }
}