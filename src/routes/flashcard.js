const express = require('express');
const { fileParser } = require('../middlewares')
const { auth } = require('../middlewares/auth')
const router = express.Router();
const controllers = require('../controllers/flashcard');

router.use(auth)
router.post('/', fileParser.single('document'),controllers.createFlashcard);
router.get('/', controllers.getAllFlashcards);
router.get('/:id', controllers.getFlashcardById);
router.delete('/:id', controllers.deleteFlashcard);

module.exports = router;