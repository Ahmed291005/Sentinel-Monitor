/**
 * src/controllers/AgentController.js
 * Controls the Real System Monitoring Agent.
 */

const realAgentService = require('../services/RealAgentService')

class AgentController {

  // GET /api/agent/status
  async status(req, res) {
    try {
      const status = realAgentService.getStatus()
      res.json({ success: true, data: status })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // POST /api/agent/start
  async start(req, res) {
    try {
      const { interval_ms, thresholds } = req.body
      const status = realAgentService.start({ interval_ms, thresholds })
      res.json({
        success: true,
        message: 'Real agent started — reading actual OS metrics',
        data:    status,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // POST /api/agent/stop
  async stop(req, res) {
    try {
      const status = realAgentService.stop()
      res.json({ success: true, message: 'Real agent stopped.', data: status })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // GET /api/agent/metrics
  // Returns a live snapshot of current real system metrics
  async metrics(req, res) {
    try {
      const os      = require('os')
      const totalMem = os.totalmem()
      const freeMem  = os.freemem()
      const loadAvg  = os.loadavg()
      const cpus     = os.cpus()

      res.json({
        success: true,
        data: {
          timestamp:       new Date().toISOString(),
          source:          'real-os',
          hostname:        os.hostname(),
          platform:        os.platform(),
          arch:            os.arch(),
          cpu: {
            count:         cpus.length,
            model:         cpus[0]?.model || 'Unknown',
            load_avg_1min: Math.round(loadAvg[0] * 100) / 100,
            load_avg_5min: Math.round(loadAvg[1] * 100) / 100,
          },
          memory: {
            total_gb:  Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10,
            free_gb:   Math.round(freeMem  / 1024 / 1024 / 1024 * 10) / 10,
            used_pct:  Math.round(((totalMem - freeMem) / totalMem) * 100),
          },
          system: {
            uptime_hours:  Math.round(os.uptime() / 3600 * 10) / 10,
            node_version:  process.version,
            pid:           process.pid,
            memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          },
        },
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}

module.exports = new AgentController()
