/**
 * src/patterns/strategies/StateChangeStrategy.js
 *
 * ═══════════════════════════════════════════════════════
 *  STRATEGY: CHANGE STATE
 * ═══════════════════════════════════════════════════════
 *
 * Executed when action type = 'change_state'
 * Modifies the state of a system resource.
 * e.g. throttle a service, flag a resource, change a threshold.
 */

const ActionStrategy = require('./ActionStrategy');
const eventBus       = require('../EventBus');

class StateChangeStrategy extends ActionStrategy {
  constructor() {
    super('StateChangeStrategy');
  }

  async execute({ event, rule, config }) {
    console.log(`[Strategy] StateChangeStrategy → changing state for: "${event.title}"`);

    try {
      const stateChange = {
        changeId:  `STATE-${Date.now()}`,
        target:    config.target || 'system',
        newState:  config.state  || 'flagged',
        eventId:   event.id,
        eventType: event.type,
        eventTitle:event.title,
        ruleName:  rule.name,
        message:   `State changed: "${config.target}" → "${config.state}" triggered by rule "${rule.name}"`,
        timestamp: new Date().toISOString(),
        payload:   event.payload,
      };

      // Emit state change to EventBus for dashboard
      eventBus.emit('state:changed', stateChange);

      console.log(`[Strategy] ✓ State changed → target: "${stateChange.target}" | newState: "${stateChange.newState}"`);

      return this.success(
        `State changed → ${stateChange.target} is now "${stateChange.newState}"`,
        stateChange
      );

    } catch (err) {
      console.error(`[Strategy] StateChangeStrategy failed: ${err.message}`);
      return this.failure('Failed to change state', err);
    }
  }
}

module.exports = StateChangeStrategy;
