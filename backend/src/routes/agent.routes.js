const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/AgentController')
const auth       = require('../middleware/authMiddleware')
const role       = require('../middleware/roleMiddleware')

router.get('/status',  auth,              controller.status.bind(controller))
router.get('/metrics', auth,              controller.metrics.bind(controller))
router.post('/start',  auth, role('admin'), controller.start.bind(controller))
router.post('/stop',   auth, role('admin'), controller.stop.bind(controller))

module.exports = router
