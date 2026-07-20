/**
 * src/patterns/strategies/NotificationStrategy.js
 *
 * ═══════════════════════════════════════════════════════
 *  STRATEGY: SEND NOTIFICATION
 * ═══════════════════════════════════════════════════════
 *
 * Executed when action type = 'send_notification'
 * Sends an in-app notification to specified recipients.
 * Extensible to email/Slack via config.
 */

const ActionStrategy = require('./ActionStrategy');
const eventBus       = require('../EventBus');

class NotificationStrategy extends ActionStrategy {
  constructor() {
    super('NotificationStrategy');
  }

  async execute({ event, rule, config }) {
    console.log(`[Strategy] NotificationStrategy → notifying recipients for: "${event.title}"`);

    try {
      const notification = {
        notifId:    `NOTIF-${Date.now()}`,
        recipients: config.recipients || ['admin'],
        priority:   config.priority   || 'normal',
        eventId:    event.id,
        eventType:  event.type,
        eventTitle: event.title,
        ruleName:   rule.name,
        subject:    `Sentinel Alert: ${event.title}`,
        body:       `Rule "${rule.name}" was triggered by a ${event.type} event.\n\nEvent: ${event.title}\nTime: ${new Date().toISOString()}`,
        timestamp:  new Date().toISOString(),
        read:       false,
      };

      // Emit notification to EventBus — frontend picks this up
      eventBus.emit('notification:new', notification);

      console.log(`[Strategy] ✓ Notification sent → recipients: ${notification.recipients.join(', ')}`);

      return this.success(
        `Notification sent to: ${notification.recipients.join(', ')}`,
        notification
      );

    } catch (err) {
      console.error(`[Strategy] NotificationStrategy failed: ${err.message}`);
      return this.failure('Failed to send notification', err);
    }
  }
}

module.exports = NotificationStrategy;
