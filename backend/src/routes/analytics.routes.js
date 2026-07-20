/**
 * src/routes/analytics.routes.js
 *
 * All endpoints under /api/analytics
 * Each endpoint demonstrates a different DBMS lab concept.
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/AnalyticsController');
const auth       = require('../middleware/authMiddleware');

// Summary hero cards
router.get('/summary',           auth, controller.getSummary.bind(controller));

// Stored Procedure
router.get('/dashboard',         auth, controller.getDashboardStats.bind(controller));

// Views
router.get('/active-alerts',     auth, controller.getActiveAlerts.bind(controller));
router.get('/pipeline',          auth, controller.getPipelineSummary.bind(controller));
router.get('/top-rules',         auth, controller.getTopRules.bind(controller));

// ROLLUP & CUBE
router.get('/rollup',            auth, controller.getRollupData.bind(controller));
router.get('/cube',              auth, controller.getCubeData.bind(controller));

// Subquery
router.get('/untriggered-rules', auth, controller.getUntriggeredRules.bind(controller));

// Set Operation (UNION)
router.get('/timeline',          auth, controller.getUnionTimeline.bind(controller));

module.exports = router;
