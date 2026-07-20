/**
 * src/controllers/UserController.js
 * Admin user management.
 */

const UserModel = require('../models/UserModel');

class UserController {

  // GET /api/users
  async getAll(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;
      const offset = (page - 1) * limit;
      const [users, total] = await Promise.all([
        UserModel.findAll({ limit: +limit, offset }),
        UserModel.count(),
      ]);
      res.json({ data: users, pagination: { total, page: +page, limit: +limit } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/users/:id
  async getOne(req, res) {
    try {
      const user = await UserModel.findById(+req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      res.json({ data: user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/users/:id/role
  async updateRole(req, res) {
    try {
      if (+req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role.' });
      }
      const { role } = req.body;
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "admin" or "user".' });
      }
      const updated = await UserModel.updateRole(+req.params.id, role);
      res.json({ message: `User role updated to "${role}".`, data: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/users/:id
  async delete(req, res) {
    try {
      if (+req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account.' });
      }
      await UserModel.delete(+req.params.id);
      res.json({ message: 'User deleted successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new UserController();
