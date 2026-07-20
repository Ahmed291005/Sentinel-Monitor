/**
 * src/patterns/EventBus.js
 *
 * ═══════════════════════════════════════════════════════
 *  DESIGN PATTERN: OBSERVER (Subject)
 * ═══════════════════════════════════════════════════════
 *
 * The EventBus is the SUBJECT in the Observer pattern.
 * Any part of the system can EMIT events into the bus.
 * Any part of the system can SUBSCRIBE to listen for events.
 *
 * Flow:
 *   Event created → EventBus.emit() → RuleEngineService notified
 *                                   → Chain of Responsibility starts
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this._subscriptions = new Map();
    console.log('[EventBus] Initialized — Observer Pattern active');
  }

  /**
   * subscribe(eventType, handler, label)
   * Register an observer for a specific event type.
   */
  subscribe(eventType, handler, label = 'anonymous') {
    this.on(eventType, handler);
    if (!this._subscriptions.has(eventType)) {
      this._subscriptions.set(eventType, []);
    }
    this._subscriptions.get(eventType).push(label);
    console.log(`[EventBus] ✓ Subscribed → "${label}" listening on "${eventType}"`);
  }

  /**
   * unsubscribe(eventType, handler)
   * Remove a specific observer.
   */
  unsubscribe(eventType, handler) {
    this.removeListener(eventType, handler);
  }

  /**
   * emit(eventType, payload)
   * Fire an event — all subscribers are notified automatically.
   */
  emit(eventType, payload) {
    const count = this.listenerCount(eventType) + this.listenerCount('all');
    console.log(`[EventBus] ⚡ Emitted → type:"${eventType}" | notifying ${count} observer(s)`);
    super.emit(eventType, payload);
    if (eventType !== 'all') super.emit('all', payload);
    return this;
  }

  getStats() {
    const types = ['system', 'user', 'security', 'performance', 'all'];
    const stats = {};
    types.forEach(t => { stats[t] = this.listenerCount(t); });
    return stats;
  }
}

// Singleton — one EventBus shared across the entire app
const eventBus = new EventBus();
module.exports = eventBus;
