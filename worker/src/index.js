/**
 * Contact form API — Cloudflare Worker.
 *
 * Accepts POST /api/contact from the portfolio contact form, validates the
 * payload server-side, then notifies the site owner via Email (Resend) and
 * WhatsApp (Meta Cloud API). Both channels are independent: a failure in one
 * never turns a valid submission into a user-facing failure.
 *
 * All secrets (RESEND_API_KEY, WHATSAPP_ACCESS_TOKEN) live in Worker secrets /
 * environment variables — never in client code.
 */

import { validateSubmission } from './validation.js';
import { sendEmailNotification } from './services/email.js';
import { sendWhatsAppNotification } from './services/whatsapp.js';
import { log } from './logger.js';

const DEFAULT_ALLOWED_ORIGIN = 'https://khan-sohail.github.io';

/**
 * In-memory fallback rate limiter (used when the native Workers rate limiting
 * binding is unavailable, e.g. local dev / tests).
 */
export function createMemoryLimiter({ limit, periodMs }) {
  const hits = new Map();
  return {
    async limit({ key }) {
      const now = Date.now();
      const windowStart = now - (now % periodMs);
      const entry = hits.get(key);
      if (!entry || entry.windowStart !== windowStart) {
        hits.set(key, { windowStart, count: 1 });
        return { success: true };
      }
      entry.count += 1;
      return { success: entry.count <= limit };
    },
  };
}

const memoryLimiter = createMemoryLimiter({ limit: 5, periodMs: 60_000 });

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function corsHeaders(env) {
  const allowedOrigin = env.CONTACT_ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Handle a contact submission request.
 * @param {Request} request
 * @param {object} env
 * @param {typeof fetch} [fetchImpl] fetch implementation for tests
 * @returns {Promise<Response>}
 */
export async function handleContactRequest(request, env, fetchImpl = fetch) {
  const cors = corsHeaders(env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed.' }, 405, cors);
  }

  const origin = request.headers.get('Origin');
  const allowedOrigin = env.CONTACT_ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  if (origin && origin !== allowedOrigin) {
    log('warn', 'Contact request rejected: unexpected origin.', { origin });
    return json({ success: false, message: 'Forbidden.' }, 403, cors);
  }

  const ip = clientIp(request);
  const limiter = env.CONTACT_RATE_LIMITER || memoryLimiter;
  const { success: withinLimit } = await limiter.limit({ key: ip });
  if (!withinLimit) {
    log('warn', 'Contact request rejected: rate limit exceeded.', { ip });
    return json(
      { success: false, message: 'Too many requests. Please try again later.' },
      429,
      cors
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: 'Invalid JSON body.' }, 400, cors);
  }

  const honeypot = body.company;
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    log('info', 'Contact request dropped (honeypot triggered).', { ip });
    return json({ success: true, message: 'Your message has been sent successfully.' }, 201, cors);
  }

  const validation = validateSubmission(body);
  if (!validation.ok) {
    log('info', 'Contact request rejected: validation failed.', { ip, errors: validation.errors });
    return json(
      { success: false, message: 'Please check the form fields.', errors: validation.errors },
      400,
      cors
    );
  }

  const submission = {
    name: validation.name,
    email: validation.email,
    message: validation.message,
  };

  log('info', 'Contact submission received.', { ip, email: submission.email });

  const [emailResult, whatsAppResult] = await Promise.all([
    sendEmailNotification(submission, env, fetchImpl),
    sendWhatsAppNotification(submission, env, fetchImpl),
  ]);

  if (!emailResult.ok) {
    log('error', 'Email notification failed; submission still accepted.', {
      status: emailResult.status,
    });
  }
  if (!whatsAppResult.ok) {
    log('error', 'WhatsApp notification failed; submission still accepted.', {
      status: whatsAppResult.status,
    });
  }

  return json(
    { success: true, message: 'Message sent successfully. I will get back to you soon.' },
    201,
    cors
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') {
      return json({ success: false, message: 'Not found.' }, 404, corsHeaders(env));
    }
    return handleContactRequest(request, env);
  },
};