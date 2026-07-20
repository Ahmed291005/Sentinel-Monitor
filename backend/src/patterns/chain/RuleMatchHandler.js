/**
 * src/patterns/chain/RuleMatchHandler.js
 *
 * ═══════════════════════════════════════════════════════
 *  CHAIN STEP 2 — RULE MATCHING
 * ═══════════════════════════════════════════════════════
 *
 * Queries the database for all enabled rules matching this event type.
 * Evaluates each rule's condition against the event payload.
 * Attaches all matched rules to the context for PriorityHandler.
 *
 * Passes  → at least one rule matched
 * Rejects → no rules matched (logs outcome as 'no_rule_match')
 */

const BaseHandler = require('./BaseHandler');
const RuleModel   = require('../../models/RuleModel');

class RuleMatchHandler extends BaseHandler {
  constructor() {
    super('RuleMatchHandler');
  }

  async handle(context) {
    console.log(`[Chain] Step 2 → ${this.name} matching rules for type: "${context.event.type}"`);

    // Fetch all enabled rules for this event type from the database
    const candidates = await RuleModel.findMatchingRules(context.event.type);

    if (!candidates || candidates.length === 0) {
      return this.reject(
        context,
        `No enabled rules found for event type: "${context.event.type}"`
      );
    }

    console.log(`[Chain] RuleMatchHandler → ${candidates.length} candidate rule(s) found`);

    // Evaluate each rule's condition against the event payload
    const matched = [];

    for (const rule of candidates) {
      const result = this._evaluateCondition(rule, context.event.payload);
      if (result.passed) {
        matched.push(rule);
        console.log(`[Chain] ✓ Rule matched → "${rule.name}" (priority: ${rule.priority})`);
      } else {
        console.log(`[Chain] ✗ Rule skipped → "${rule.name}" (${result.reason})`);
      }
    }

    if (matched.length === 0) {
      return this.reject(
        context,
        `No rules matched the event payload conditions`
      );
    }

    // Attach matched rules to context for PriorityHandler
    context.matchedRules = matched;

    return this.passToNext(
      context,
      `${matched.length} rule(s) matched out of ${candidates.length} candidates`
    );
  }

  /**
   * _evaluateCondition(rule, payload)
   *
   * Evaluates IF condition_field [operator] condition_value
   * against the actual event payload.
   *
   * Supported operators: > >= < <= == != contains
   */
  _evaluateCondition(rule, payload) {
    const { condition_field, condition_op, condition_value } = rule;

    // Get the actual value from the payload
    const actualValue = payload[condition_field];

    if (actualValue === undefined || actualValue === null) {
      return {
        passed: false,
        reason: `Field "${condition_field}" not found in payload`,
      };
    }

    const actual    = isNaN(actualValue) ? String(actualValue) : Number(actualValue);
    const threshold = isNaN(condition_value) ? String(condition_value) : Number(condition_value);

    let passed = false;

    switch (condition_op) {
      case '>':        passed = actual >   threshold; break;
      case '>=':       passed = actual >=  threshold; break;
      case '<':        passed = actual <   threshold; break;
      case '<=':       passed = actual <=  threshold; break;
      case '==':       passed = String(actual) === String(threshold); break;
      case '!=':       passed = String(actual) !== String(threshold); break;
      case 'contains': passed = String(actual).toLowerCase()
                                  .includes(String(threshold).toLowerCase()); break;
      default:
        return { passed: false, reason: `Unknown operator: "${condition_op}"` };
    }

    return {
      passed,
      reason: passed
        ? `${condition_field} ${condition_op} ${condition_value} → ${actual} ${condition_op} ${threshold} = true`
        : `${condition_field} ${condition_op} ${condition_value} → ${actual} ${condition_op} ${threshold} = false`,
    };
  }
}

module.exports = RuleMatchHandler;
