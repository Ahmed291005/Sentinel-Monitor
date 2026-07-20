/**
 * src/middleware/authMiddleware.js
 * Verifies JWT token on every protected route.
 */

const jwt         = require('jsonwebtoken');
const UserModel   = require('../models/UserModel');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB (checks if user still exists)
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
