/**
 * src/patterns/factories/HandlerFactory.js
 *
 * ═══════════════════════════════════════════════════════
 *  DESIGN PATTERN: FACTORY
 * ═══════════════════════════════════════════════════════
 *
 * Builds and chains all 4 handlers in the correct order.
 * Returns the HEAD of the chain ready to call handle().
 *
 * The RuleEngineService calls:
 *   const chain = HandlerFactory.buildPipeline();
 *   await chain.handle(context);
 *
 * This is the only place where handler order is defined.
 * Changing the pipeline order = changing ONE line here.
 */

const ValidationHandler = require('../chain/ValidationHandler');
const RuleMatchHandler  = require('../chain/RuleMatchHandler');
const PriorityHandler   = require('../chain/PriorityHandler');
const ActionHandler     = require('../chain/ActionHandler');

class HandlerFactory {
  /**
   * buildPipeline()
   *
   * Creates all handlers and chains them in order:
   *   Validation → RuleMatch → Priority → Action
   *
   * Returns the first handler (head of chain).
   * Calling head.handle(context) automatically runs all 4 steps.
   */
  static buildPipeline() {
    // Create instances
    const validation = new ValidationHandler();
    const ruleMatch  = new RuleMatchHandler();
    const priority   = new PriorityHandler();
    const action     = new ActionHandler();

    // Chain them in order using setNext()
    validation
      .setNext(ruleMatch)
      .setNext(priority)
      .setNext(action);

    console.log('[HandlerFactory] Pipeline built → Validation → RuleMatch → Priority → Action');

    // Return the head of the chain
    return validation;
  }
}

module.exports = HandlerFactory;
