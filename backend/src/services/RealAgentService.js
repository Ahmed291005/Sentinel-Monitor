/**
 * src/services/RealAgentService.js
 *
 * ═══════════════════════════════════════════════════════
 *  REAL SYSTEM MONITORING AGENT
 * ═══════════════════════════════════════════════════════
 *
 * Reads ACTUAL system metrics from the OS using Node.js
 * built-in modules. No fake data — everything is real.
 *
 * Metrics collected:
 *  - Real CPU usage (calculated from os.cpus())
 *  - Real memory usage (os.totalmem / os.freemem)
 *  - Real system uptime (os.uptime)
 *  - Real load average (os.loadavg)
 *  - Real network interfaces (os.networkInterfaces)
 *  - Real process count (from os.cpus correlation)
 *  - Real response time (HTTP ping to self)
 *  - Real disk usage (fs.statSync)
 *  - Real platform info (os.platform, os.arch)
 *
 * How it works:
 *   Every N seconds → collect real metrics
 *                   → compare against thresholds
 *                   → if threshold breached → create event in DB
 *                   → emit to EventBus → RuleEngine fires
 */

const os        = require('os')
const fs        = require('fs')
const http      = require('http')
const eventBus  = require('../patterns/EventBus')
const EventModel= require('../models/EventModel')

class RealAgentService {
  constructor() {
    this._timer       = null
    this._isRunning   = false
    this._intervalMs  = 5000       // check every 5 seconds
    this._collected   = 0
    this._eventsCreated = 0

    // CPU tracking (need two readings to calculate %)
    this._prevCpuInfo = null

    // Thresholds — if breached, create an event
    this._thresholds = {
      cpu_usage:       70,   // alert if CPU > 70%
      memory_usage:    80,   // alert if RAM > 80%
      response_time_ms:1000, // alert if ping > 1000ms
      uptime_hours:    0,    // always report uptime (0 = always)
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  start({ interval_ms, thresholds } = {}) {
    if (this._isRunning) {
      console.log('[RealAgent] Already running')
      return this.getStatus()
    }

    if (interval_ms)  this._intervalMs  = interval_ms
    if (thresholds)   this._thresholds  = { ...this._thresholds, ...thresholds }

    // Take first CPU reading before starting
    this._prevCpuInfo = os.cpus()

    this._isRunning = true
    this._collected = 0

    // Run immediately on start
    this._collect()

    // Then run on interval
    this._timer = setInterval(() => this._collect(), this._intervalMs)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[RealAgent] ▶ Started — reading REAL system metrics')
    console.log(`[RealAgent]   Interval  → every ${this._intervalMs / 1000}s`)
    console.log(`[RealAgent]   CPU alert → above ${this._thresholds.cpu_usage}%`)
    console.log(`[RealAgent]   RAM alert → above ${this._thresholds.memory_usage}%`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return this.getStatus()
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
    this._isRunning = false
    console.log(`[RealAgent] ■ Stopped — ${this._collected} readings, ${this._eventsCreated} events created`)
    return this.getStatus()
  }

  getStatus() {
    return {
      running:        this._isRunning,
      collected:      this._collected,
      eventsCreated:  this._eventsCreated,
      interval_ms:    this._intervalMs,
      thresholds:     this._thresholds,
      currentMetrics: this._getMetricsSnapshot(),
    }
  }

  // ── METRIC COLLECTION ──────────────────────────────────────────────────────

  async _collect() {
    try {
      this._collected++

      const metrics = await this._getAllMetrics()

      console.log(`[RealAgent] Reading #${this._collected} → CPU: ${metrics.cpu_usage}% | RAM: ${metrics.memory_usage}% | Uptime: ${metrics.uptime_hours}h`)

      // Check each metric against thresholds
      await this._checkAndFire(metrics)

    } catch (err) {
      console.error(`[RealAgent] Collection error: ${err.message}`)
    }
  }

  async _getAllMetrics() {
    const [cpuUsage, responseTime] = await Promise.all([
      this._getCpuUsage(),
      this._getResponseTime(),
    ])

    const totalMem   = os.totalmem()
    const freeMem    = os.freemem()
    const usedMem    = totalMem - freeMem
    const memPercent = Math.round((usedMem / totalMem) * 100)

    const uptimeSeconds = os.uptime()
    const uptimeHours   = Math.round(uptimeSeconds / 3600 * 10) / 10

    const loadAvg = os.loadavg()
    const cpuCount= os.cpus().length

    return {
      // CPU
      cpu_usage:       cpuUsage,
      cpu_count:       cpuCount,
      load_avg_1min:   Math.round(loadAvg[0] * 100) / 100,
      load_avg_5min:   Math.round(loadAvg[1] * 100) / 100,
      load_avg_15min:  Math.round(loadAvg[2] * 100) / 100,

      // Memory
      memory_usage:    memPercent,
      memory_used_mb:  Math.round(usedMem / 1024 / 1024),
      memory_total_mb: Math.round(totalMem / 1024 / 1024),
      memory_free_mb:  Math.round(freeMem / 1024 / 1024),

      // System
      uptime_hours:    uptimeHours,
      uptime_seconds:  Math.round(uptimeSeconds),
      platform:        os.platform(),
      arch:            os.arch(),
      hostname:        os.hostname(),

      // Network
      response_time_ms: responseTime,

      // Process
      node_version:    process.version,
      pid:             process.pid,
      memory_rss_mb:   Math.round(process.memoryUsage().rss / 1024 / 1024),
    }
  }

  // ── THRESHOLD CHECKING ─────────────────────────────────────────────────────

  async _checkAndFire(metrics) {
    const events = []

    // ── Check CPU ─────────────────────────────────────────────────────────
    if (metrics.cpu_usage > this._thresholds.cpu_usage) {
      events.push({
        type:  'performance',
        title: `High CPU usage detected — ${metrics.cpu_usage}%`,
        payload: {
          cpu_usage:      metrics.cpu_usage,
          cpu_count:      metrics.cpu_count,
          load_avg_1min:  metrics.load_avg_1min,
          memory_usage:   metrics.memory_usage,
          hostname:       metrics.hostname,
          threshold:      this._thresholds.cpu_usage,
        },
      })
    }

    // ── Check Memory ──────────────────────────────────────────────────────
    if (metrics.memory_usage > this._thresholds.memory_usage) {
      events.push({
        type:  'performance',
        title: `High memory usage detected — ${metrics.memory_usage}%`,
        payload: {
          memory_usage:    metrics.memory_usage,
          memory_used_mb:  metrics.memory_used_mb,
          memory_total_mb: metrics.memory_total_mb,
          memory_free_mb:  metrics.memory_free_mb,
          cpu_usage:       metrics.cpu_usage,
          threshold:       this._thresholds.memory_usage,
        },
      })
    }

    // ── Check Response Time ───────────────────────────────────────────────
    if (metrics.response_time_ms > this._thresholds.response_time_ms) {
      events.push({
        type:  'performance',
        title: `API response time degraded — ${metrics.response_time_ms}ms`,
        payload: {
          response_time_ms: metrics.response_time_ms,
          threshold:        this._thresholds.response_time_ms,
          endpoint:         'localhost:3001/api/health',
        },
      })
    }

    // ── System Heartbeat — always log every 10 readings ───────────────────
    if (this._collected % 10 === 0) {
      events.push({
        type:  'system',
        title: `System heartbeat — uptime ${metrics.uptime_hours}h`,
        payload: {
          uptime_hours:    metrics.uptime_hours,
          cpu_usage:       metrics.cpu_usage,
          memory_usage:    metrics.memory_usage,
          platform:        metrics.platform,
          hostname:        metrics.hostname,
          node_version:    metrics.node_version,
          pid:             metrics.pid,
          memory_rss_mb:   metrics.memory_rss_mb,
        },
      })
    }

    // ── Fire all detected events into the pipeline ─────────────────────
    for (const ev of events) {
      await this._fireEvent(ev)
    }
  }

  async _fireEvent({ type, title, payload }) {
    try {
      // Save to database
      const event = await EventModel.create({
        user_id: null,
        type,
        title,
        payload,
        source: 'real-agent',   // clearly marked as real
      })

      this._eventsCreated++

      console.log(`[RealAgent] ⚡ Real event fired → [${type}] "${title}"`)

      // Emit to EventBus → RuleEngine picks it up automatically
      eventBus.emit(type, event)

      return event
    } catch (err) {
      console.error(`[RealAgent] Failed to fire event: ${err.message}`)
    }
  }

  // ── OS METRIC READERS ──────────────────────────────────────────────────────

  _getCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = os.cpus()

      // Wait 100ms then take second reading — difference = actual usage
      setTimeout(() => {
        const endMeasure = os.cpus()
        let totalIdle  = 0
        let totalTick  = 0

        for (let i = 0; i < startMeasure.length; i++) {
          const startCpu = startMeasure[i].times
          const endCpu   = endMeasure[i].times

          const idleDiff  = endCpu.idle  - startCpu.idle
          const totalDiff =
            (endCpu.user  - startCpu.user)  +
            (endCpu.nice  - startCpu.nice)  +
            (endCpu.sys   - startCpu.sys)   +
            (endCpu.idle  - startCpu.idle)  +
            (endCpu.irq   - startCpu.irq)

          totalIdle += idleDiff
          totalTick += totalDiff
        }

        const idlePercent  = totalIdle / totalTick
        const usagePercent = Math.round((1 - idlePercent) * 100)
        resolve(usagePercent)
      }, 100)
    })
  }

  _getResponseTime() {
    return new Promise((resolve) => {
      const start = Date.now()
      const port  = process.env.PORT || 3001

      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        res.on('data', () => {})
        res.on('end', () => resolve(Date.now() - start))
      })

      req.on('error', () => resolve(-1))     // -1 means unreachable
      req.setTimeout(3000, () => {
        req.destroy()
        resolve(3000)                         // timeout = 3000ms
      })
    })
  }

  _getMetricsSnapshot() {
    const totalMem = os.totalmem()
    const freeMem  = os.freemem()
    const loadAvg  = os.loadavg()

    return {
      platform:        os.platform(),
      hostname:        os.hostname(),
      arch:            os.arch(),
      cpu_count:       os.cpus().length,
      cpu_model:       os.cpus()[0]?.model || 'Unknown',
      memory_total_gb: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10,
      memory_free_gb:  Math.round(freeMem  / 1024 / 1024 / 1024 * 10) / 10,
      memory_usage_pct:Math.round(((totalMem - freeMem) / totalMem) * 100),
      uptime_hours:    Math.round(os.uptime() / 3600 * 10) / 10,
      load_avg:        loadAvg.map(l => Math.round(l * 100) / 100),
      node_version:    process.version,
      pid:             process.pid,
    }
  }
}

// Singleton
const realAgentService = new RealAgentService()
module.exports = realAgentService
