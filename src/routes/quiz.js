const express = require('express');
const { fileParser } = require('../middlewares')
const router = express.Router();
const controllers = require('../controllers/quiz');

router.post('/', fileParser.single('document'),controllers.createQuiz);
router.get('/', controllers.getAllQuizzes);
router.get('/:id', controllers.getQuizById);
router.delete('/:id', controllers.deleteQuiz);

module.exports = router;