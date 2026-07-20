/**
 * src/patterns/chain/ActionHandler.js
 *
 * ═══════════════════════════════════════════════════════
 *  CHAIN STEP 4 — ACTION EXECUTION (Terminal Handler)
 * ═══════════════════════════════════════════════════════
 *
 * Final handler in the pipeline.
 * Receives the winning rule from PriorityHandler.
 * Uses StrategyFactory to get the correct action strategy.
 * Executes the strategy and writes the full result to decision_logs.
 *
 * This handler always terminates the chain — nothing comes after it.
 */

const BaseHandler      = require('./BaseHandler');
const StrategyFactory  = require('../factories/StrategyFactory');
const DecisionLogModel = require('../../models/DecisionLogModel');
const RuleModel        = require('../../models/RuleModel');
const EventModel       = require('../../models/EventModel');

class ActionHandler extends BaseHandler {
  constructor() {
    super('ActionHandler');
  }

  async handle(context) {
    console.log(`[Chain] Step 4 → ${this.name} executing action for rule: "${context.matchedRule?.name}"`);

    const { event, matchedRule } = context;

    try {
      // ── Get the correct strategy via Factory Pattern ───────────────────────
      const strategy = StrategyFactory.create(matchedRule.action_type);

      // ── Parse action config ────────────────────────────────────────────────
      let actionConfig = {};
      try {
        actionConfig = typeof matchedRule.action_config === 'string'
          ? JSON.parse(matchedRule.action_config)
          : (matchedRule.action_config || {});
      } catch {
        actionConfig = {};
      }

      // ── Execute the strategy ───────────────────────────────────────────────
      const actionResult = await strategy.execute({
        event,
        rule:   matchedRule,
        config: actionConfig,
      });

      console.log(`[Chain] ✓ Action executed → strategy: "${matchedRule.action_type}"`);

      // ── Update rule execution count ────────────────────────────────────────
      await RuleModel.incrementExecCount(matchedRule.id);

      // ── Update event status to resolved ───────────────────────────────────
      await EventModel.updateStatus(event.id, 'resolved');

      // ── Add final trace entry ──────────────────────────────────────────────
      this.addTrace(
        context,
        'executed',
        `Strategy "${matchedRule.action_type}" executed successfully → ${actionResult.message}`
      );

      context.actionResult = actionResult;
      context.outcome      = 'executed';

    } catch (err) {
      console.error(`[Chain] ✗ ActionHandler error → ${err.message}`);
      this.addTrace(context, 'error', `Action execution failed: ${err.message}`);
      context.outcome = 'failed';
      context.error   = err.message;

      // Mark event as processing (not resolved) on failure
      await EventModel.updateStatus(event.id, 'processing');
    }

    // ── Write decision log (always — success or failure) ───────────────────
    try {
      const log = await DecisionLogModel.create({
        event_id:     event.id,
        rule_id:      context.matchedRule?.id     || null,
        action_id:    context.matchedRule?.action_id || null,
        triggered_by: event.user_id               || null,
        outcome:      context.outcome,
        chain_trace:  context.trace,
        duration_ms:  context.duration_ms,
      });

      context.decisionLogId = log.id;
      console.log(`[Chain] ✓ Decision log written → ID: ${log.id} | outcome: "${context.outcome}"`);
    } catch (logErr) {
      console.error(`[Chain] ✗ Failed to write decision log: ${logErr.message}`);
    }

    return context;
  }
}

module.exports = ActionHandler;
