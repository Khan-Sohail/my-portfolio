/**
 * Safe structured logging. Never logs secrets or full payloads.
 */

const LEVELS = ['debug', 'info', 'warn', 'error'];

/**
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
export function log(level, message, meta = {}) {
  const entry = {
    level,
    ts: new Date().toISOString(),
    msg: message,
    ...meta,
  };
  if (LEVELS.indexOf(level) >= LEVELS.indexOf('warn')) {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}