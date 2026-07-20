/**
 * src/patterns/strategies/LogIssueStrategy.js
 *
 * ═══════════════════════════════════════════════════════
 *  STRATEGY: LOG ISSUE
 * ═══════════════════════════════════════════════════════
 *
 * Executed when action type = 'log_issue'
 * Creates a structured issue log entry with full context.
 * Useful for non-critical events that need tracking.
 */

const ActionStrategy = require('./ActionStrategy');
const eventBus       = require('../EventBus');

class LogIssueStrategy extends ActionStrategy {
  constructor() {
    super('LogIssueStrategy');
  }

  async execute({ event, rule, config }) {
    console.log(`[Strategy] LogIssueStrategy → logging issue for: "${event.title}"`);

    try {
      const issueLog = {
        issueId:   `ISSUE-${Date.now()}`,
        severity:  config.severity || 'medium',
        tag:       config.tag      || event.type,
        eventId:   event.id,
        eventType: event.type,
        eventTitle:event.title,
        ruleName:  rule.name,
        payload:   event.payload,
        message:   `Issue logged: "${event.title}" triggered rule "${rule.name}"`,
        timestamp: new Date().toISOString(),
      };

      // Emit to EventBus so dashboard log feed updates
      eventBus.emit('issue:logged', issueLog);

      console.log(`[Strategy] ✓ Issue logged → ID: ${issueLog.issueId} | severity: "${issueLog.severity}"`);

      return this.success(
        `Issue logged → ID: ${issueLog.issueId}`,
        issueLog
      );

    } catch (err) {
      console.error(`[Strategy] LogIssueStrategy failed: ${err.message}`);
      return this.failure('Failed to log issue', err);
    }
  }
}

module.exports = LogIssueStrategy;
