/**
 * src/middleware/roleMiddleware.js
 * Role-based access control — admin only routes.
 */

const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({
        error: `Access denied. Required role: "${requiredRole}". Your role: "${req.user.role}".`,
      });
    }
    next();
  };
};

module.exports = roleMiddleware;
