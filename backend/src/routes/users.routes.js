const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/UserController');
const auth       = require('../middleware/authMiddleware');
const role       = require('../middleware/roleMiddleware');

router.get('/',              auth, role('admin'), controller.getAll.bind(controller));
router.get('/:id',           auth, role('admin'), controller.getOne.bind(controller));
router.patch('/:id/role',    auth, role('admin'), controller.updateRole.bind(controller));
router.delete('/:id',        auth, role('admin'), controller.delete.bind(controller));

module.exports = router;
