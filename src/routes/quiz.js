const express = require('express');
const { fileParser } = require('../middlewares')
const { auth } = require('../middlewares/auth')
const router = express.Router();
const controllers = require('../controllers/quiz');

router.use(auth)
router.post('/', fileParser.single('document'),controllers.createQuiz);
router.get('/', controllers.getAllQuizzes);
router.get('/:id', controllers.getQuizById);
router.delete('/:id', controllers.deleteQuiz);

module.exports = router;