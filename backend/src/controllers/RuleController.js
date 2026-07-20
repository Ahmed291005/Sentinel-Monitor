/**
 * src/controllers/RuleController.js
 * Full CRUD for rules + toggle + test sandbox.
 */

const RuleModel         = require('../models/RuleModel');
const ruleEngineService = require('../services/RuleEngineService');

class RuleController {

  // GET /api/rules
  async getAll(req, res) {
    try {
      const { event_type, enabled, limit = 100, page = 1 } = req.query;
      const offset = (page - 1) * limit;
      const enabledBool = enabled === undefined ? undefined : enabled === 'true';

      const [rules, counts] = await Promise.all([
        RuleModel.findAll({ event_type, enabled: enabledBool, limit: +limit, offset }),
        RuleModel.count(),
      ]);

      res.json({ data: rules, stats: counts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/rules/:id
  async getOne(req, res) {
    try {
      const rule = await RuleModel.findById(+req.params.id);
      if (!rule) return res.status(404).json({ error: 'Rule not found.' });
      res.json({ data: rule });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/rules
  async create(req, res) {
    try {
      const { name, description, event_type, condition_field,
              condition_op, condition_value, action_id, priority } = req.body;

      const rule = await RuleModel.create({
        created_by: req.user.id,
        name, description, event_type,
        condition_field, condition_op, condition_value,
        action_id, priority,
      });

      res.status(201).json({ message: 'Rule created successfully.', data: rule });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/rules/:id
  async update(req, res) {
    try {
      const rule = await RuleModel.findById(+req.params.id);
      if (!rule) return res.status(404).json({ error: 'Rule not found.' });

      const updated = await RuleModel.update(+req.params.id, req.body);
      res.json({ message: 'Rule updated successfully.', data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/rules/:id/toggle
  async toggle(req, res) {
    try {
      const rule = await RuleModel.findById(+req.params.id);
      if (!rule) return res.status(404).json({ error: 'Rule not found.' });

      const updated = await RuleModel.toggle(+req.params.id, !rule.enabled);
      res.json({
        message: `Rule "${updated.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`,
        data:    updated,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/rules/:id/test
  async test(req, res) {
    try {
      const rule = await RuleModel.findById(+req.params.id);
      if (!rule) return res.status(404).json({ error: 'Rule not found.' });

      const { payload = {} } = req.body;

      // Build a mock event for testing
      const mockEvent = {
        id:      0,
        type:    rule.event_type,
        title:   'Rule Test Event',
        payload,
        user_id: req.user.id,
        status:  'pending',
        source:  'test',
      };

      // Run through engine without saving to DB
      const result = await ruleEngineService.processEventDirectly(mockEvent);

      res.json({
        message:  'Rule test complete.',
        matched:  result.outcome === 'executed',
        outcome:  result.outcome,
        trace:    result.trace,
        rule:     rule.name,
        payload,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/rules/:id
  async delete(req, res) {
    try {
      const rule = await RuleModel.findById(+req.params.id);
      if (!rule) return res.status(404).json({ error: 'Rule not found.' });

      await RuleModel.delete(+req.params.id);
      res.json({ message: `Rule "${rule.name}" deleted successfully.` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new RuleController();
