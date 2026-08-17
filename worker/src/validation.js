/**
 * Contact form submission validation (pure functions, no environment access).
 */

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Trim and normalize a submitted string field.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

/**
 * Validate a contact submission payload.
 * @param {unknown} body
 * @returns {{ ok: true, name: string, email: string, message: string } |
 *           { ok: false, errors: Record<string, string> }}
 */
export function validateSubmission(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: { form: 'Invalid request payload.' } };
  }

  const raw = /** @type {Record<string, unknown>} */ (body);
  const name = normalizeString(raw.name);
  const email = normalizeString(raw.email);
  const message = normalizeString(raw.message);

  const errors = {};

  if (!name) {
    errors.name = 'Please enter your name.';
  } else if (name.length > MAX_NAME) {
    errors.name = `Name must be ${MAX_NAME} characters or fewer.`;
  }

  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (email.length > MAX_EMAIL) {
    errors.email = `Email must be ${MAX_EMAIL} characters or fewer.`;
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!message) {
    errors.message = 'Please enter a message.';
  } else if (message.length > MAX_MESSAGE) {
    errors.message = `Message must be ${MAX_MESSAGE} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, name, email, message };
}