/**
 * src/patterns/factories/StrategyFactory.js
 *
 * ═══════════════════════════════════════════════════════
 *  DESIGN PATTERN: FACTORY
 * ═══════════════════════════════════════════════════════
 *
 * Creates the correct strategy instance based on action type.
 * The rest of the system NEVER calls "new AlertStrategy()" directly.
 * It always asks the factory: StrategyFactory.create('send_alert')
 *
 * Adding a new action type = add one line here + one new strategy file.
 * Zero changes anywhere else in the codebase.
 */

const AlertStrategy        = require('../strategies/AlertStrategy');
const LogIssueStrategy     = require('../strategies/LogIssueStrategy');
const StateChangeStrategy  = require('../strategies/StateChangeStrategy');
const NotificationStrategy = require('../strategies/NotificationStrategy');
const BlockUserStrategy    = require('../strategies/BlockUserStrategy');

class StrategyFactory {
  /**
   * Strategy registry — maps action type strings to strategy classes.
   * Add new strategies here and nowhere else.
   */
  static _registry = {
    'send_alert':       AlertStrategy,
    'log_issue':        LogIssueStrategy,
    'change_state':     StateChangeStrategy,
    'send_notification':NotificationStrategy,
    'block_user':       BlockUserStrategy,
  };

  /**
   * create(actionType)
   *
   * Returns an instance of the correct strategy.
   * Throws an error if the action type is not registered.
   *
   * @param  {string} actionType - must match a key in _registry
   * @return {ActionStrategy}    - a concrete strategy instance
   */
  static create(actionType) {
    const StrategyClass = StrategyFactory._registry[actionType];

    if (!StrategyClass) {
      throw new Error(
        `StrategyFactory: unknown action type "${actionType}". ` +
        `Registered types: ${Object.keys(StrategyFactory._registry).join(', ')}`
      );
    }

    console.log(`[StrategyFactory] Creating → ${StrategyClass.name} for type: "${actionType}"`);
    return new StrategyClass();
  }

  /**
   * getRegisteredTypes()
   * Returns all registered action types.
   * Used for validation and API responses.
   */
  static getRegisteredTypes() {
    return Object.keys(StrategyFactory._registry);
  }

  /**
   * register(actionType, StrategyClass)
   * Dynamically register a new strategy at runtime.
   * Allows extending the system without modifying this file.
   */
  static register(actionType, StrategyClass) {
    StrategyFactory._registry[actionType] = StrategyClass;
    console.log(`[StrategyFactory] Registered new strategy → "${actionType}"`);
  }
}

module.exports = StrategyFactory;
