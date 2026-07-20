/**
 * src/controllers/SimulationController.js
 * Start/stop simulation, fire single events.
 */

const simulationService = require('../services/SimulationService');
const ruleEngineService = require('../services/RuleEngineService');

class SimulationController {

  // POST /api/simulation/start
  async start(req, res) {
    try {
      const { interval_ms, types } = req.body;
      const status = simulationService.start({ interval_ms, types });
      res.json({ message: 'Simulation started.', data: status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/simulation/stop
  async stop(req, res) {
    try {
      const status = simulationService.stop();
      res.json({ message: 'Simulation stopped.', data: status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/simulation/status
  async status(req, res) {
    try {
      res.json({
        data: {
          simulation:  simulationService.getStatus(),
          ruleEngine:  ruleEngineService.getStatus(),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/simulation/fire
  async fire(req, res) {
    try {
      const { type } = req.body;
      const event = await simulationService.fireOne(type);
      res.json({ message: 'Event fired through pipeline.', data: event });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new SimulationController();
