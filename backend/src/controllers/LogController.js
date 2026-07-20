/**
 * src/controllers/LogController.js
 * Decision logs and audit trail.
 */

const DecisionLogModel = require('../models/DecisionLogModel');

class LogController {

  // GET /api/logs
  async getAll(req, res) {
    try {
      const { event_id, rule_id, outcome, from, to, limit = 50, page = 1 } = req.query;
      const offset = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        DecisionLogModel.findAll({ event_id, rule_id, outcome, from, to, limit: +limit, offset }),
        DecisionLogModel.countAll({ outcome }),
      ]);

      res.json({
        data:       logs,
        pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/logs/stats
  async getStats(req, res) {
    try {
      const stats = await DecisionLogModel.getStats();
      res.json({ data: stats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/logs/:id
  async getOne(req, res) {
    try {
      const log = await DecisionLogModel.findById(+req.params.id);
      if (!log) return res.status(404).json({ error: 'Log entry not found.' });
      res.json({ data: log });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new LogController();
