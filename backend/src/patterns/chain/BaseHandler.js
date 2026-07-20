/**
 * src/patterns/chain/BaseHandler.js
 *
 * ═══════════════════════════════════════════════════════
 *  DESIGN PATTERN: CHAIN OF RESPONSIBILITY (Abstract Base)
 * ═══════════════════════════════════════════════════════
 *
 * Every handler in the pipeline extends this class.
 * Defines the interface: setNext() and handle()
 *
 * Pipeline order:
 *   ValidationHandler → RuleMatchHandler → PriorityHandler → ActionHandler
 */

class BaseHandler {
  constructor(name) {
    this.name    = name;
    this._next   = null;
  }

  /**
   * setNext(handler)
   * Chain the next handler after this one.
   * Returns the next handler so we can chain: a.setNext(b).setNext(c)
   */
  setNext(handler) {
    this._next = handler;
    return handler;
  }

  /**
   * handle(context)
   * Process the event context.
   * If this handler passes, call this._next.handle(context).
   * If this handler rejects, stop the chain and return context with error.
   *
   * @param {object} context - shared object passed through the entire chain
   *   context.event       - the raw event from DB
   *   context.matchedRule - set by RuleMatchHandler
   *   context.action      - set by ActionHandler
   *   context.trace       - array of step logs (full audit trail)
   *   context.error       - set if chain stops early
   */
  async handle(context) {
    // Base implementation just passes to next
    if (this._next) {
      return await this._next.handle(context);
    }
    return context;
  }

  /**
   * addTrace(context, status, message)
   * Adds a step record to context.trace — builds the audit trail
   */
  addTrace(context, status, message) {
    context.trace.push({
      handler:   this.name,
      status,              // 'passed' | 'rejected' | 'executed' | 'error'
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * passToNext(context)
   * Mark this handler as passed and continue the chain.
   */
  async passToNext(context, message = 'Passed') {
    this.addTrace(context, 'passed', message);
    if (this._next) return await this._next.handle(context);
    return context;
  }

  /**
   * reject(context, reason)
   * Stop the chain here — mark as rejected with reason.
   */
  reject(context, reason) {
    this.addTrace(context, 'rejected', reason);
    context.error   = reason;
    context.stopped = this.name;
    return context;
  }
}

module.exports = BaseHandler;
