/**
 * src/patterns/chain/PriorityHandler.js
 *
 * ═══════════════════════════════════════════════════════
 *  CHAIN STEP 3 — PRIORITY RESOLUTION
 * ═══════════════════════════════════════════════════════
 *
 * Receives all matched rules from RuleMatchHandler.
 * Sorts them by priority (1 = highest, 10 = lowest).
 * Selects ONE winning rule for execution.
 *
 * Always passes to ActionHandler with context.matchedRule set.
 */

const BaseHandler = require('./BaseHandler');

class PriorityHandler extends BaseHandler {
  constructor() {
    super('PriorityHandler');
  }

  async handle(context) {
    console.log(`[Chain] Step 3 → ${this.name} resolving priority from ${context.matchedRules.length} matched rule(s)`);

    const rules = context.matchedRules;

    if (!rules || rules.length === 0) {
      return this.reject(context, 'No matched rules to prioritize');
    }

    // Sort by priority ascending (1 = highest priority)
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);

    // Winner is the first rule (lowest priority number = highest importance)
    const winner = sorted[0];

    console.log(`[Chain] ✓ Priority winner → "${winner.name}" (priority: ${winner.priority})`);

    if (sorted.length > 1) {
      const others = sorted.slice(1).map(r => `"${r.name}"(p${r.priority})`).join(', ');
      console.log(`[Chain]   Skipped lower priority rules: ${others}`);
    }

    // Attach the single winning rule to context
    context.matchedRule  = winner;
    context.allMatched   = sorted;  // Keep full list for audit trail

    return this.passToNext(
      context,
      `Selected "${winner.name}" (priority ${winner.priority}) from ${rules.length} matched rule(s)`
    );
  }
}

module.exports = PriorityHandler;
