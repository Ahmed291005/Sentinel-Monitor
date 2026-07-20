/**
 * src/patterns/strategies/ActionStrategy.js
 *
 * ═══════════════════════════════════════════════════════
 *  DESIGN PATTERN: STRATEGY (Abstract Interface)
 * ═══════════════════════════════════════════════════════
 *
 * Defines the contract all concrete strategies must follow.
 * Every action strategy MUST implement execute(context).
 *
 * This enforces the Strategy pattern — the ActionHandler
 * calls strategy.execute() without knowing which strategy it is.
 */

class ActionStrategy {
  constructor(name) {
    if (new.target === ActionStrategy) {
      throw new Error('ActionStrategy is abstract — cannot instantiate directly. Use a concrete strategy.');
    }
    this.name = name;
  }

  /**
   * execute(context)
   *
   * @param {object} context
   * @param {object} context.event   - the event that triggered this action
   * @param {object} context.rule    - the rule that matched
   * @param {object} context.config  - the action config JSON from DB
   *
   * @returns {object} { success: boolean, message: string, data: object }
   */
  async execute(context) {
    throw new Error(`Strategy "${this.name}" must implement execute(context)`);
  }

  /**
   * success(message, data)
   * Standardized success response for all strategies.
   */
  success(message, data = {}) {
    return { success: true, strategy: this.name, message, data };
  }

  /**
   * failure(message, error)
   * Standardized failure response for all strategies.
   */
  failure(message, error = null) {
    return { success: false, strategy: this.name, message, error: error?.message || error };
  }
}

module.exports = ActionStrategy;
