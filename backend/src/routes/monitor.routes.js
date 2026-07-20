const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/SystemMonitorController')
const auth       = require('../middleware/authMiddleware')
const role       = require('../middleware/roleMiddleware')

router.get('/metrics', auth,               controller.getMetrics.bind(controller))
router.get('/status',  auth,               controller.getStatus.bind(controller))
router.post('/start',  auth, role('admin'), controller.start.bind(controller))
router.post('/stop',   auth, role('admin'), controller.stop.bind(controller))

module.exports = router
