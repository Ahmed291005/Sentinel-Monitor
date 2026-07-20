const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/EventController');
const auth       = require('../middleware/authMiddleware');
const role       = require('../middleware/roleMiddleware');

router.get('/',              auth, controller.getAll.bind(controller));
router.get('/stats',         auth, controller.getStats.bind(controller));
router.get('/:id',           auth, controller.getOne.bind(controller));
router.post('/',             auth, controller.create.bind(controller));
router.patch('/:id/status',  auth, controller.updateStatus.bind(controller));
router.delete('/:id',        auth, role('admin'), controller.delete.bind(controller));

module.exports = router;
