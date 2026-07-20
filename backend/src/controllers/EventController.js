/**
 * src/controllers/EventController.js
 * Manages events and triggers the Rule Engine pipeline.
 */

const EventModel        = require('../models/EventModel');
const ruleEngineService = require('../services/RuleEngineService');
const eventBus          = require('../patterns/EventBus');

class EventController {

  // GET /api/events
  async getAll(req, res) {
    try {
      const { type, status, source, from, to, limit = 50, page = 1 } = req.query;
      const offset = (page - 1) * limit;

      const [events, total] = await Promise.all([
        EventModel.findAll({ type, status, source, from, to, limit: +limit, offset }),
        EventModel.countAll({ type, status, from, to }),
      ]);

      res.json({
        data:       events,
        pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/events/stats
  async getStats(req, res) {
    try {
      const stats = await EventModel.getStats();
      res.json({ data: stats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/events/:id
  async getOne(req, res) {
    try {
      const event = await EventModel.findById(+req.params.id);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      res.json({ data: event });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/events
  async create(req, res) {
    try {
      const { type, title, payload = {} } = req.body;

      // Save event to database
      const event = await EventModel.create({
        user_id: req.user.id,
        type,
        title,
        payload,
        source: 'manual',
      });

      // Emit to EventBus → RuleEngine processes it automatically
      eventBus.emit(type, event);

      // Also process directly and return result
      const result = await ruleEngineService.processEventDirectly(event);

      res.status(201).json({
        message: 'Event created and processed through pipeline.',
        data:    event,
        pipeline: {
          outcome:     result.outcome,
          duration_ms: result.duration_ms,
          trace:       result.trace,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/events/:id/status
  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ['pending', 'processing', 'resolved', 'ignored'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` });
      }
      const event = await EventModel.updateStatus(+req.params.id, status);
      res.json({ message: 'Event status updated.', data: event });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/events/:id
  async delete(req, res) {
    try {
      await EventModel.delete(+req.params.id);
      res.json({ message: 'Event deleted successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new EventController();
