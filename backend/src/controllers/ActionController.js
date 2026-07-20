/**
 * src/controllers/ActionController.js
 * Action catalog management.
 */

const ActionModel      = require('../models/ActionModel');
const StrategyFactory  = require('../patterns/factories/StrategyFactory');

class ActionController {

  // GET /api/actions
  async getAll(req, res) {
    try {
      const actions = await ActionModel.findAll();
      res.json({
        data:             actions,
        registeredTypes:  StrategyFactory.getRegisteredTypes(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/actions/:id
  async getOne(req, res) {
    try {
      const action = await ActionModel.findById(+req.params.id);
      if (!action) return res.status(404).json({ error: 'Action not found.' });
      res.json({ data: action });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/actions
  async create(req, res) {
    try {
      const { name, type, config = {}, description } = req.body;
      const action = await ActionModel.create({ name, type, config, description });
      res.status(201).json({ message: 'Action created.', data: action });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/actions/:id
  async update(req, res) {
    try {
      const action = await ActionModel.findById(+req.params.id);
      if (!action) return res.status(404).json({ error: 'Action not found.' });
      const updated = await ActionModel.update(+req.params.id, req.body);
      res.json({ message: 'Action updated.', data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/actions/:id
  async delete(req, res) {
    try {
      await ActionModel.delete(+req.params.id);
      res.json({ message: 'Action deleted.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ActionController();
