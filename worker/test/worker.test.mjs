import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateSubmission, normalizeString } from '../src/validation.js';
import { buildEmailContent } from '../src/services/email.js';
import { buildWhatsAppPayload } from '../src/services/whatsapp.js';
import { handleContactRequest, createMemoryLimiter } from '../src/index.js';

const VALID = { name: 'Alice', email: 'alice@example.com', message: 'Hello there' };

function env(overrides = {}) {
  return {
    CONTACT_EMAIL: 'ksohail.sk32@gmail.com',
    MAIL_FROM: 'Portfolio <onboarding@resend.dev>',
    RESEND_API_KEY: 're_test_key',
    WHATSAPP_PHONE_NUMBER_ID: '123456789',
    WHATSAPP_ACCESS_TOKEN: 'EAAGtest',
    WHATSAPP_RECIPIENT_NUMBER: '919967832161',
    CONTACT_RATE_LIMITER: createMemoryLimiter({ limit: 5, periodMs: 60_000 }),
    ...overrides,
  };
}

function request(body, { method = 'POST', origin = 'https://khan-sohail.github.io' } = {}) {
  return new Request('https://contact.example.com/api/contact', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

/** Mock provider server that records calls and returns scripted responses. */
function mockFetch(handlers) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    const handler = handlers[String(url)] || handlers.default;
    if (!handler) throw new Error(`No handler for ${url}`);
    return handler(url, init);
  };
  impl.calls = calls;
  return impl;
}

const okProvider = mockFetch({
  'https://api.resend.com/emails': () => new Response(JSON.stringify({ id: 'mail_1' }), { status: 200 }),
  'https://graph.facebook.com/v23.0/123456789/messages': () =>
    new Response(JSON.stringify({ messages: [{ id: 'wamid_1' }] }), { status: 200 }),
});

// ---------------------------------------------------------------- validation

test('validation: accepts a valid submission', () => {
  const result = validateSubmission(VALID);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.name, 'Alice');
    assert.equal(result.email, 'alice@example.com');
    assert.equal(result.message, 'Hello there');
  }
});

test('validation: rejects missing name', () => {
  const result = validateSubmission({ email: 'a@b.co', message: 'hi' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.name);
});

test('validation: rejects missing email', () => {
  const result = validateSubmission({ name: 'A', message: 'hi' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.email);
});

test('validation: rejects invalid email format', () => {
  const result = validateSubmission({ name: 'A', email: 'not-an-email', message: 'hi' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.email);
});

test('validation: rejects missing message', () => {
  const result = validateSubmission({ name: 'A', email: 'a@b.co' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.message);
});

test('validation: rejects message longer than 5000 chars', () => {
  const result = validateSubmission({ name: 'A', email: 'a@b.co', message: 'x'.repeat(5001) });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.message);
});

test('validation: accepts message of exactly 5000 chars', () => {
  const result = validateSubmission({ name: 'A', email: 'a@b.co', message: 'x'.repeat(5000) });
  assert.equal(result.ok, true);
});

test('validation: rejects name longer than 100 chars', () => {
  const result = validateSubmission({ name: 'A'.repeat(101), email: 'a@b.co', message: 'hi' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.name);
});

test('validation: rejects non-object payloads', () => {
  assert.equal(validateSubmission(null).ok, false);
  assert.equal(validateSubmission('hello').ok, false);
  assert.equal(validateSubmission([1, 2]).ok, false);
});

test('validation: strips control characters and trims', () => {
  assert.equal(normalizeString('  a\u0000b  '), 'ab');
});

// ------------------------------------------------------------ email content

test('email content: contains name, email, message, timestamp, source', () => {
  const { subject, html, text } = buildEmailContent(VALID);
  assert.equal(subject, 'New Portfolio Contact — Alice');
  assert.ok(text.includes('Alice'));
  assert.ok(text.includes('alice@example.com'));
  assert.ok(text.includes('Hello there'));
  assert.ok(text.includes('Source: Portfolio Contact Form'));
  assert.ok(html.includes('Alice') && html.includes('mailto:alice@example.com'));
});

test('email content: escapes HTML in user input', () => {
  const { html } = buildEmailContent({ ...VALID, name: '<b>Alice</b>', message: '<script>x</script>' });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

// -------------------------------------------------------- whatsapp payload

test('whatsapp payload: template message with 3 body parameters', () => {
  const payload = buildWhatsAppPayload(VALID, env());
  assert.equal(payload.type, 'template');
  assert.equal(payload.to, '919967832161');
  assert.equal(payload.template.name, 'portfolio_contact_notification');
  assert.equal(payload.template.language.code, 'en_US');
  const params = payload.template.components[0].parameters.map((p) => p.text);
  assert.deepEqual(params, ['Alice', 'alice@example.com', 'Hello there']);
});

// ------------------------------------------------------------- request flow

test('flow: valid submission notifies both channels and returns success', async () => {
  const fetchImpl = mockFetch({
    'https://api.resend.com/emails': () => new Response(JSON.stringify({ id: 'm1' }), { status: 200 }),
    'https://graph.facebook.com/v23.0/123456789/messages': () =>
      new Response(JSON.stringify({ messages: [{ id: 'w1' }] }), { status: 200 }),
  });
  const response = await handleContactRequest(request(VALID), env(), fetchImpl);
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.success, true);
  const callPaths = fetchImpl.calls.map((c) => c.url);
  assert.ok(callPaths.some((u) => u.includes('/emails')));
  assert.ok(callPaths.some((u) => u.includes('/messages')));
});

test('flow: invalid email returns 400 and sends nothing', async () => {
  const fetchImpl = mockFetch({
    default: () => new Response('{}', { status: 500 }),
  });
  const response = await handleContactRequest(request({ name: 'A', email: 'nope', message: 'hi' }), env());
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.success, false);
  assert.ok(data.errors.email);
  assert.equal(fetchImpl.calls.length, 0);
});

test('flow: honeypot field silently accepted without notifying anyone', async () => {
  const fetchImpl = mockFetch({
    default: () => new Response('{}', { status: 500 }),
  });
  const response = await handleContactRequest(
    request({ ...VALID, company: 'spam-bot' }),
    env()
  );
  assert.equal(response.status, 201);
  assert.equal(fetchImpl.calls.length, 0);
});

test('flow: email failure does not fail the submission', async () => {
  const response = await handleContactRequest(
    request(VALID),
    { ...env(), RESEND_API_KEY: '' }
  );
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.success, true);
});

test('flow: whatsapp failure does not fail the submission', async () => {
  const response = await handleContactRequest(
    request(VALID),
    { ...env(), WHATSAPP_ACCESS_TOKEN: '' }
  );
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.success, true);
});

test('flow: provider errors are never exposed to the visitor', async () => {
  const response = await handleContactRequest(
    request(VALID),
    { ...env(), RESEND_API_KEY: '', WHATSAPP_ACCESS_TOKEN: '' }
  );
  const text = await response.text();
  assert.ok(!text.includes('Bearer'));
  assert.ok(!text.includes('EAAG'));
  assert.ok(!text.includes('re_test_key'));
  assert.ok(!text.includes('stack'));
});

test('flow: method other than POST is rejected', async () => {
  const response = await handleContactRequest(request({}, { method: 'GET' }), env());
  assert.equal(response.status, 405);
});

test('flow: unexpected origin is rejected with 403', async () => {
  const response = await handleContactRequest(
    request(VALID, { origin: 'https://evil.example.com' }),
    env()
  );
  assert.equal(response.status, 403);
});

test('flow: missing origin is allowed (same-origin/non-browser clients)', async () => {
  const response = await handleContactRequest(request(VALID, { origin: null }), env());
  assert.equal(response.status, 201);
});

test('flow: invalid JSON returns 400', async () => {
  const req = new Request('https://contact.example.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  const response = await handleContactRequest(req, env());
  assert.equal(response.status, 400);
});

test('flow: OPTIONS preflight returns CORS headers', async () => {
  const response = await handleContactRequest(request({}, { method: 'OPTIONS' }), env());
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://khan-sohail.github.io');
});

test('flow: rate limiter blocks the 6th request in a window', async () => {
  const limiter = createMemoryLimiter({ limit: 5, periodMs: 60_000 });
  const results = [];
  for (let i = 0; i < 6; i += 1) {
    const { success } = await limiter.limit({ key: '1.2.3.4' });
    results.push(success);
  }
  assert.deepEqual(results, [true, true, true, true, true, false]);
});

test('flow: rate limit resets in a new window', async () => {
  const limiter = createMemoryLimiter({ limit: 2, periodMs: 1 });
  await limiter.limit({ key: 'a' });
  await limiter.limit({ key: 'a' });
  await new Promise((r) => setTimeout(r, 5));
  const { success } = await limiter.limit({ key: 'a' });
  assert.equal(success, true);
});

test('flow: missing email config returns 201 with generic message', async () => {
  const fetchImpl = mockFetch({
    'https://graph.facebook.com/v23.0/123456789/messages': () =>
      new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 }),
  });
  const response = await handleContactRequest(
    request(VALID),
    { ...env(), CONTACT_EMAIL: '' },
    fetchImpl
  );
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.ok(!data.message.includes('CONTACT_EMAIL'));
  assert.ok(!data.message.includes('boom'));
});

test('flow: non-contact path returns 404', async () => {
  const request404 = new Request('https://contact.example.com/other', { method: 'POST' });
  const handler = (await import('../src/index.js')).default;
  const response = await handler.fetch(request404, env());
  assert.equal(response.status, 404);
});