/**
 * src/controllers/SystemMonitorController.js
 * Full system metrics API controller.
 */

const systemMonitorService = require('../services/SystemMonitorService')

class SystemMonitorController {

  // GET /api/monitor/metrics — full real-time snapshot
  async getMetrics(req, res) {
    try {
      const metrics = await systemMonitorService.getFullMetrics()
      res.json({ success: true, data: metrics })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // GET /api/monitor/status — agent running status
  async getStatus(req, res) {
    try {
      res.json({ success: true, data: systemMonitorService.getStatus() })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // POST /api/monitor/start
  async start(req, res) {
    try {
      const { interval_ms, thresholds } = req.body
      const status = await systemMonitorService.start({ interval_ms, thresholds })
      res.json({ success: true, message: 'System monitor started.', data: status })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  // POST /api/monitor/stop
  async stop(req, res) {
    try {
      const status = systemMonitorService.stop()
      res.json({ success: true, message: 'System monitor stopped.', data: status })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}

module.exports = new SystemMonitorController()
