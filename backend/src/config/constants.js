/**
 * src/config/constants.js
 * All system-wide constants in one place.
 * Never hardcode these values anywhere else.
 */

module.exports = {
  // Event types
  EVENT_TYPES: ['system', 'user', 'security', 'performance'],

  // Event statuses
  EVENT_STATUS: ['pending', 'processing', 'resolved', 'ignored'],

  // Rule condition operators
  OPERATORS: ['>', '>=', '<', '<=', '==', '!=', 'contains'],

  // Action types (must match DB CHECK constraint)
  ACTION_TYPES: [
    'send_alert',
    'log_issue',
    'change_state',
    'send_notification',
    'block_user',
  ],

  // Pipeline outcomes
  OUTCOMES: ['executed', 'skipped', 'failed', 'no_rule_match'],

  // Pagination defaults
  DEFAULT_LIMIT:  50,
  MAX_LIMIT:      200,

  // JWT
  TOKEN_PREFIX: 'Bearer ',

  // Simulation
  MIN_INTERVAL_MS:     1000,
  MAX_INTERVAL_MS:  60000,
  DEFAULT_INTERVAL_MS:  4000,
}
