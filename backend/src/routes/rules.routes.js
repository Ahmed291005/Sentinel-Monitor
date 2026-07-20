const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/RuleController');
const auth       = require('../middleware/authMiddleware');
const role       = require('../middleware/roleMiddleware');

router.get('/',             auth,              controller.getAll.bind(controller));
router.get('/:id',          auth,              controller.getOne.bind(controller));
router.post('/',            auth, role('admin'), controller.create.bind(controller));
router.put('/:id',          auth, role('admin'), controller.update.bind(controller));
router.patch('/:id/toggle', auth, role('admin'), controller.toggle.bind(controller));
router.post('/:id/test',    auth, role('admin'), controller.test.bind(controller));
router.delete('/:id',       auth, role('admin'), controller.delete.bind(controller));

module.exports = router;
