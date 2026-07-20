const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/LogController');
const auth       = require('../middleware/authMiddleware');

router.get('/',       auth, controller.getAll.bind(controller));
router.get('/stats',  auth, controller.getStats.bind(controller));
router.get('/:id',    auth, controller.getOne.bind(controller));

module.exports = router;
