const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/SimulationController');
const auth       = require('../middleware/authMiddleware');
const role       = require('../middleware/roleMiddleware');

router.post('/start',  auth, role('admin'), controller.start.bind(controller));
router.post('/stop',   auth, role('admin'), controller.stop.bind(controller));
router.get('/status',  auth,               controller.status.bind(controller));
router.post('/fire',   auth, role('admin'), controller.fire.bind(controller));

module.exports = router;
