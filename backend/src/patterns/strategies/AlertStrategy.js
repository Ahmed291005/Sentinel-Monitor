/**
 * src/patterns/strategies/AlertStrategy.js
 *
 * ═══════════════════════════════════════════════════════
 *  STRATEGY: SEND ALERT
 * ═══════════════════════════════════════════════════════
 *
 * Executed when action type = 'send_alert'
 * Creates a critical alert record and broadcasts to EventBus
 * so the frontend dashboard receives it in real time.
 */

const ActionStrategy = require('./ActionStrategy');
const eventBus       = require('../EventBus');

class AlertStrategy extends ActionStrategy {
  constructor() {
    super('AlertStrategy');
  }

  async execute({ event, rule, config }) {
    console.log(`[Strategy] AlertStrategy → firing alert for event: "${event.title}"`);

    try {
      const alertPayload = {
        alertId:   `ALERT-${Date.now()}`,
        severity:  config.severity  || 'high',
        channel:   config.channel   || 'dashboard',
        eventId:   event.id,
        eventType: event.type,
        eventTitle:event.title,
        ruleName:  rule.name,
        message:   `[${(config.severity || 'HIGH').toUpperCase()}] ${event.title} — Rule "${rule.name}" triggered`,
        timestamp: new Date().toISOString(),
        sound:     config.sound || false,
      };

      // Broadcast alert to all connected clients via EventBus
      eventBus.emit('alert:new', alertPayload);

      console.log(`[Strategy] ✓ Alert sent → severity: "${alertPayload.severity}" | channel: "${alertPayload.channel}"`);

      return this.success(
        `Alert sent → severity: ${alertPayload.severity}`,
        alertPayload
      );

    } catch (err) {
      console.error(`[Strategy] AlertStrategy failed: ${err.message}`);
      return this.failure('Failed to send alert', err);
    }
  }
}

module.exports = AlertStrategy;
