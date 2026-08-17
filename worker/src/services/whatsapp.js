/**
 * WhatsApp notification service (official WhatsApp Business Cloud API).
 *
 * Business-initiated outbound messages outside the 24-hour customer window
 * MUST use a pre-approved message template (Meta requirement). This service
 * sends the `portfolio_contact_notification` template. The template must be
 * created and approved in Meta Business Manager with this exact body:
 *
 *   New Portfolio Contact
 *   Name: {{1}}
 *   Email: {{2}}
 *   Message: {{3}}
 *   Source: Portfolio Website
 */

import { log } from '../logger.js';

const DEFAULT_GRAPH_URL = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v23.0';
const DEFAULT_TEMPLATE_NAME = 'portfolio_contact_notification';
const DEFAULT_TEMPLATE_LANGUAGE = 'en_US';

/**
 * Build the template message payload for the Graph API.
 * @param {{ name: string, email: string, message: string }} submission
 * @param {object} env
 * @returns {Record<string, unknown>}
 */
export function buildWhatsAppPayload(submission, env) {
  const templateName = env.WHATSAPP_TEMPLATE_NAME || DEFAULT_TEMPLATE_NAME;
  const languageCode = env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE;

  return {
    messaging_product: 'whatsapp',
    to: env.WHATSAPP_RECIPIENT_NUMBER,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: submission.name },
            { type: 'text', text: submission.email },
            { type: 'text', text: submission.message },
          ],
        },
      ],
    },
  };
}

/**
 * Send the WhatsApp notification via the Meta Graph API.
 * @param {{ name: string, email: string, message: string }} submission
 * @param {object} env
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true } | { ok: false, status: number }>}
 */
export async function sendWhatsAppNotification(submission, env, fetchImpl = fetch) {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const recipient = env.WHATSAPP_RECIPIENT_NUMBER;

  if (!phoneNumberId || !accessToken || !recipient) {
    log(
      'error',
      'WhatsApp configuration incomplete (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_RECIPIENT_NUMBER).'
    );
    return { ok: false, status: 0 };
  }

  const graphUrl = (env.WHATSAPP_GRAPH_URL || DEFAULT_GRAPH_URL).replace(/\/$/, '');
  const apiVersion = env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
  const endpoint = `${graphUrl}/${apiVersion}/${phoneNumberId}/messages`;

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildWhatsAppPayload(submission, env)),
    });

    if (!response.ok) {
      log('warn', 'WhatsApp notification rejected by provider.', {
        status: response.status,
      });
      return { ok: false, status: response.status };
    }

    log('info', 'WhatsApp notification sent.', { to: recipient });
    return { ok: true, status: response.status };
  } catch (err) {
    log('error', 'WhatsApp notification failed (network/exception).', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, status: 0 };
  }
}