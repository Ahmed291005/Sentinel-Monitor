const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/AuthController');
const auth       = require('../middleware/authMiddleware');

router.post('/register', controller.register.bind(controller));
router.post('/login',    controller.login.bind(controller));
router.post('/logout',   auth, controller.logout.bind(controller));
router.get('/me',        auth, controller.me.bind(controller));

module.exports = router;
