const express = require('express');
const { fileParser } = require('../middlewares')
const { auth } = require('../middlewares/auth')
const router = express.Router();
const controllers = require('../controllers/lesson');

router.use(auth)
router.post('/', fileParser.single('document'),controllers.createLesson);
router.get('/', controllers.getAllLessons);
router.get('/:id', controllers.getLessonById);
router.delete('/:id', controllers.deleteLesson);

module.exports = router;