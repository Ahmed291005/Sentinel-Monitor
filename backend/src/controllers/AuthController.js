/**
 * src/controllers/AuthController.js
 * Handles register, login, logout, me.
 */

const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const UserModel   = require('../models/UserModel');

class AuthController {

  // POST /api/auth/register
  async register(req, res) {
    try {
      const { username, email, password, role = 'user' } = req.body;

      // Check duplicates
      const existingEmail    = await UserModel.findByEmail(email);
      const existingUsername = await UserModel.findByUsername(username);
      if (existingEmail)    return res.status(409).json({ error: 'Email already registered.' });
      if (existingUsername) return res.status(409).json({ error: 'Username already taken.' });

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create user (only admin can create other admins)
      const assignedRole = (req.user?.role === 'admin' && role === 'admin') ? 'admin' : 'user';
      const user = await UserModel.create({ username, email, password_hash, role: assignedRole });

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({ message: 'Account created successfully.', token, user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      const user = await UserModel.findByUsername(username);
      if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

      await UserModel.updateLastLogin(user.id);

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const { password_hash, ...safeUser } = user;
      res.json({ message: 'Login successful.', token, user: safeUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    res.json({ message: 'Logged out successfully.' });
  }

  // GET /api/auth/me
  async me(req, res) {
    const { password_hash, ...safeUser } = req.user;
    res.json({ user: safeUser });
  }
}

module.exports = new AuthController();
