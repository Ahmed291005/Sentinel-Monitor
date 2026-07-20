/**
 * src/patterns/chain/ValidationHandler.js
 *
 * ═══════════════════════════════════════════════════════
 *  CHAIN STEP 1 — VALIDATION
 * ═══════════════════════════════════════════════════════
 *
 * First handler in the pipeline.
 * Validates the event has all required fields and valid values.
 * Rejects malformed events before they touch the rule engine.
 *
 * Passes  → event is valid, continue to RuleMatchHandler
 * Rejects → event is malformed, stop chain immediately
 */

const BaseHandler = require('./BaseHandler');

const VALID_TYPES = ['system', 'user', 'security', 'performance'];

class ValidationHandler extends BaseHandler {
  constructor() {
    super('ValidationHandler');
  }

  async handle(context) {
    console.log(`[Chain] Step 1 → ${this.name} processing event ID: ${context.event?.id}`);

    const { event } = context;

    // ── Check 1: event object exists ─────────────────────────────────────────
    if (!event) {
      return this.reject(context, 'Event object is null or undefined');
    }

    // ── Check 2: required fields present ─────────────────────────────────────
    const required = ['id', 'type', 'title'];
    for (const field of required) {
      if (!event[field]) {
        return this.reject(context, `Missing required field: "${field}"`);
      }
    }

    // ── Check 3: event type is valid ──────────────────────────────────────────
    if (!VALID_TYPES.includes(event.type)) {
      return this.reject(
        context,
        `Invalid event type: "${event.type}". Must be one of: ${VALID_TYPES.join(', ')}`
      );
    }

    // ── Check 4: payload is valid JSON (if it's a string) ────────────────────
    if (typeof event.payload === 'string') {
      try {
        event.payload = JSON.parse(event.payload);
      } catch {
        return this.reject(context, 'Event payload is not valid JSON');
      }
    }

    // ── All checks passed ─────────────────────────────────────────────────────
    return this.passToNext(
      context,
      `Event valid — type: "${event.type}", title: "${event.title}"`
    );
  }
}

module.exports = ValidationHandler;
