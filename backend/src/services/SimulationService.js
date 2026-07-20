/**
 * src/services/SimulationService.js
 *
 * Generates random synthetic events and feeds them into
 * the EventBus to trigger the full pipeline automatically.
 *
 * Used for: demo mode, stress testing, live dashboard demo.
 * Start via: POST /api/simulation/start
 */

const eventBus       = require('../patterns/EventBus');
const EventModel     = require('../models/EventModel');
const RuleEngineService = require('./RuleEngineService');

// Pool of realistic event templates per type
const EVENT_TEMPLATES = {
  performance: [
    { title: 'CPU spike detected',       payload: () => ({ cpu_usage: rand(85,99),  memory_usage: rand(50,80) }) },
    { title: 'Memory pressure high',     payload: () => ({ memory_usage: rand(80,95), swap_usage: rand(30,60) }) },
    { title: 'Response time degraded',   payload: () => ({ response_time_ms: rand(1500,5000), endpoint: '/api/events' }) },
    { title: 'Disk I/O saturation',      payload: () => ({ disk_usage: rand(85,99), read_ms: rand(200,800) }) },
    { title: 'Network throughput drop',  payload: () => ({ throughput_mbps: rand(1,10), packet_loss: rand(5,20) }) },
  ],
  security: [
    { title: 'Failed login flood',       payload: () => ({ failed_attempts: rand(4,10), ip: randomIp() }) },
    { title: 'Unauthorized API access',  payload: () => ({ severity: 'high', endpoint: '/api/admin', ip: randomIp() }) },
    { title: 'Port scan detected',       payload: () => ({ severity: 'high', source_ip: randomIp(), ports_scanned: rand(100,1000) }) },
    { title: 'SQL injection attempt',    payload: () => ({ severity: 'high', endpoint: '/api/users', pattern: 'OR 1=1' }) },
    { title: 'Brute force detected',     payload: () => ({ failed_attempts: rand(6,15), ip: randomIp() }) },
  ],
  system: [
    { title: 'Service went offline',     payload: () => ({ service: pick(['auth-service','payment-service','email-service']), service_status: 'down' }) },
    { title: 'DB connection pool full',  payload: () => ({ pool_size: 10, active: 10, waiting: rand(10,50) }) },
    { title: 'Scheduled job failed',     payload: () => ({ job: pick(['backup','cleanup','report']), error: 'timeout' }) },
    { title: 'Certificate expiring',     payload: () => ({ domain: 'sentinel.io', days_remaining: rand(1,7) }) },
    { title: 'Config file changed',      payload: () => ({ file: '/etc/sentinel/config.json', changed_by: 'system' }) },
  ],
  user: [
    { title: 'Bulk data export',         payload: () => ({ user_id: rand(1,100), records: rand(10000,100000) }) },
    { title: 'Admin role assigned',      payload: () => ({ target_user_id: rand(1,50), action: 'role_change' }) },
    { title: 'Mass account deletion',    payload: () => ({ count: rand(10,50), initiated_by: rand(1,5) }) },
    { title: 'API key generated',        payload: () => ({ user_id: rand(1,100), scope: 'full_access' }) },
    { title: 'Password reset flood',     payload: () => ({ requests: rand(5,20), email_domain: 'unknown.com' }) },
  ],
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIp() {
  return `${rand(1,255)}.${rand(0,255)}.${rand(0,255)}.${rand(1,254)}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class SimulationService {
  constructor() {
    this._timer      = null;
    this._isRunning  = false;
    this._generated  = 0;
    this._intervalMs = parseInt(process.env.SIM_DEFAULT_INTERVAL_MS) || 4000;
    this._types      = ['system', 'user', 'security', 'performance'];
  }

  /**
   * start(options)
   * Begin generating random events on a timer.
   */
  start({ interval_ms, types } = {}) {
    if (this._isRunning) {
      console.log('[Simulation] Already running');
      return this.getStatus();
    }

    this._intervalMs = interval_ms || this._intervalMs;
    this._types      = types       || this._types;
    this._isRunning  = true;
    this._generated  = 0;

    this._timer = setInterval(async () => {
      await this._generateEvent();
    }, this._intervalMs);

    console.log(`[Simulation] ▶ Started → interval: ${this._intervalMs}ms | types: ${this._types.join(', ')}`);
    return this.getStatus();
  }

  /**
   * stop()
   * Stop the simulation timer.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._isRunning = false;
    console.log(`[Simulation] ■ Stopped → ${this._generated} events generated`);
    return this.getStatus();
  }

  /**
   * fireOne(type)
   * Generate a single synthetic event immediately on demand.
   */
  async fireOne(type) {
    const eventType = type || pick(this._types);
    return await this._generateEvent(eventType);
  }

  /**
   * _generateEvent()
   * Internal: creates a random event in the DB and emits it to EventBus.
   */
  async _generateEvent(forceType = null) {
    try {
      const type      = forceType || pick(this._types);
      const templates = EVENT_TEMPLATES[type];
      const template  = pick(templates);
      const payload   = template.payload();

      // Save event to database first
      const event = await EventModel.create({
        user_id: null,
        type,
        title:   template.title,
        payload,
        source:  'simulator',
      });

      this._generated++;

      console.log(`[Simulation] ⚡ Generated event #${this._generated} → [${type}] "${template.title}"`);

      // ── OBSERVER PATTERN: Emit into EventBus → RuleEngine picks it up ──
      eventBus.emit(type, event);

      return event;

    } catch (err) {
      console.error(`[Simulation] Failed to generate event: ${err.message}`);
    }
  }

  getStatus() {
    return {
      running:     this._isRunning,
      generated:   this._generated,
      interval_ms: this._intervalMs,
      types:       this._types,
    };
  }
}

// Singleton
const simulationService = new SimulationService();
module.exports = simulationService;
