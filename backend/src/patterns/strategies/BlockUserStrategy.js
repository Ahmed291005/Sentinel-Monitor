/**
 * src/patterns/strategies/BlockUserStrategy.js
 *
 * ═══════════════════════════════════════════════════════
 *  STRATEGY: BLOCK USER
 * ═══════════════════════════════════════════════════════
 *
 * Executed when action type = 'block_user'
 * Temporarily blocks a user account on suspicious activity.
 * e.g. 5+ failed logins, unauthorized access attempts.
 */

const ActionStrategy = require('./ActionStrategy');
const eventBus       = require('../EventBus');

class BlockUserStrategy extends ActionStrategy {
  constructor() {
    super('BlockUserStrategy');
  }

  async execute({ event, rule, config }) {
    console.log(`[Strategy] BlockUserStrategy → blocking user for: "${event.title}"`);

    try {
      const blockRecord = {
        blockId:         `BLOCK-${Date.now()}`,
        targetUserId:    event.payload?.user_id || event.user_id || null,
        targetIp:        event.payload?.ip       || null,
        duration_minutes:config.duration_minutes || 30,
        notifyAdmin:     config.notify_admin     || true,
        eventId:         event.id,
        eventType:       event.type,
        eventTitle:      event.title,
        ruleName:        rule.name,
        message:         `User blocked for ${config.duration_minutes || 30} minutes due to: "${event.title}"`,
        blockedUntil:    new Date(Date.now() + (config.duration_minutes || 30) * 60000).toISOString(),
        timestamp:       new Date().toISOString(),
      };

      // Emit block event to EventBus
      eventBus.emit('user:blocked', blockRecord);

      // Also send admin notification if configured
      if (blockRecord.notifyAdmin) {
        eventBus.emit('notification:new', {
          notifId:    `NOTIF-${Date.now()}`,
          recipients: ['admin'],
          priority:   'high',
          subject:    `Security: User Blocked`,
          body:       blockRecord.message,
          timestamp:  new Date().toISOString(),
          read:       false,
        });
      }

      console.log(`[Strategy] ✓ User blocked → duration: ${blockRecord.duration_minutes} minutes`);

      return this.success(
        `User blocked for ${blockRecord.duration_minutes} minutes`,
        blockRecord
      );

    } catch (err) {
      console.error(`[Strategy] BlockUserStrategy failed: ${err.message}`);
      return this.failure('Failed to block user', err);
    }
  }
}

module.exports = BlockUserStrategy;
