/**
 * src/services/RuleEngineService.js
 *
 * ═══════════════════════════════════════════════════════
 *  THE BRAIN — Wires all 4 design patterns together
 * ═══════════════════════════════════════════════════════
 *
 * This service is the central intelligence of Sentinel.
 *
 * It uses ALL FOUR design patterns:
 *   1. OBSERVER     → subscribes to EventBus (gets notified on every event)
 *   2. FACTORY      → calls HandlerFactory.buildPipeline() to create the chain
 *   3. CHAIN OF RESP→ runs event through the 4-handler pipeline
 *   4. STRATEGY     → ActionHandler uses StrategyFactory to pick the right action
 *
 * Flow when an event fires:
 *   EventBus.emit('security', event)
 *     → RuleEngineService.handleEvent(event)        [Observer]
 *         → HandlerFactory.buildPipeline()           [Factory]
 *             → ValidationHandler.handle(context)    [Chain Step 1]
 *                 → RuleMatchHandler.handle(context)  [Chain Step 2]
 *                     → PriorityHandler.handle(context)[Chain Step 3]
 *                         → ActionHandler.handle(context)[Chain Step 4]
 *                             → StrategyFactory.create() [Factory]
 *                                 → strategy.execute()   [Strategy]
 */

const eventBus      = require('../patterns/EventBus');
const HandlerFactory= require('../patterns/factories/HandlerFactory');
const DecisionLogModel = require('../models/DecisionLogModel');
const EventModel    = require('../models/EventModel');

class RuleEngineService {
  constructor() {
    this._isRunning   = false;
    this._processed   = 0;
    this._failed      = 0;
    this._startedAt   = null;

    // Bind handler so we can unsubscribe later
    this._boundHandler = this.handleEvent.bind(this);
  }

  /**
   * start()
   * Subscribe to ALL event types on the EventBus.
   * Called once when the Express app starts.
   */
  start() {
    if (this._isRunning) {
      console.log('[RuleEngine] Already running — skipping start()');
      return;
    }

    const eventTypes = ['system', 'user', 'security', 'performance'];

    // ── OBSERVER PATTERN: subscribe to every event type ───────────────────
    eventTypes.forEach(type => {
      eventBus.subscribe(type, this._boundHandler, 'RuleEngineService');
    });

    this._isRunning = true;
    this._startedAt = new Date();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[RuleEngine] ✓ Started — listening on all event types');
    console.log('[RuleEngine]   system | user | security | performance');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * stop()
   * Unsubscribe from EventBus. Stops processing new events.
   */
  stop() {
    const eventTypes = ['system', 'user', 'security', 'performance'];
    eventTypes.forEach(type => {
      eventBus.unsubscribe(type, this._boundHandler);
    });
    this._isRunning = false;
    console.log('[RuleEngine] Stopped — unsubscribed from all event types');
  }

  /**
   * handleEvent(event)
   *
   * Called automatically by EventBus when any event is emitted.
   * This is the Observer callback — the entry point of the pipeline.
   *
   * @param {object} event - the event object from the database
   */
  async handleEvent(event) {
    const startTime = Date.now();

    console.log('\n' + '═'.repeat(50));
    console.log(`[RuleEngine] Processing event ID: ${event.id} | Type: "${event.type}"`);
    console.log(`[RuleEngine] Title: "${event.title}"`);
    console.log('═'.repeat(50));

    // ── Build context object passed through entire chain ───────────────────
    const context = {
      event,
      matchedRules: [],
      matchedRule:  null,
      actionResult: null,
      trace:        [],        // Audit trail — each handler adds a step
      outcome:      null,
      error:        null,
      stopped:      null,
      duration_ms:  null,
    };

    try {
      // ── FACTORY PATTERN: build the chain pipeline ──────────────────────
      const pipeline = HandlerFactory.buildPipeline();

      // ── CHAIN OF RESPONSIBILITY: run event through all handlers ────────
      const result = await pipeline.handle(context);

      // Record how long the pipeline took
      result.duration_ms = Date.now() - startTime;

      this._processed++;

      console.log(`[RuleEngine] ✓ Pipeline complete → outcome: "${result.outcome}" | duration: ${result.duration_ms}ms`);
      console.log('═'.repeat(50) + '\n');

      return result;

    } catch (err) {
      this._failed++;
      const duration_ms = Date.now() - startTime;

      console.error(`[RuleEngine] ✗ Pipeline error → ${err.message}`);

      // Write a failed decision log even on unexpected errors
      try {
        await DecisionLogModel.create({
          event_id:     event.id,
          rule_id:      null,
          action_id:    null,
          triggered_by: event.user_id || null,
          outcome:      'failed',
          chain_trace:  context.trace,
          duration_ms,
        });
        await EventModel.updateStatus(event.id, 'processing');
      } catch (logErr) {
        console.error(`[RuleEngine] Failed to write error log: ${logErr.message}`);
      }

      return { ...context, outcome: 'failed', error: err.message, duration_ms };
    }
  }

  /**
   * processEventDirectly(event)
   *
   * Manually push an event through the pipeline without going via EventBus.
   * Used by the REST API when events are created via POST /api/events.
   *
   * @param  {object} event - full event object from database
   * @return {object}       - pipeline result with trace and outcome
   */
  async processEventDirectly(event) {
    return await this.handleEvent(event);
  }

  /**
   * getStatus()
   * Returns current engine status for the dashboard.
   */
  getStatus() {
    return {
      running:     this._isRunning,
      processed:   this._processed,
      failed:      this._failed,
      startedAt:   this._startedAt,
      uptime_ms:   this._startedAt
                     ? Date.now() - this._startedAt.getTime()
                     : 0,
      subscriptions: eventBus.getStats(),
    };
  }
}

// Singleton — one RuleEngineService shared across the app
const ruleEngineService = new RuleEngineService();
module.exports = ruleEngineService;
