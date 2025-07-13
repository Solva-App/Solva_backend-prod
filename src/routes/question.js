const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/question')

router.get('/:id', controllers.getPastQuestion)
router.get('/', controllers.getPastQuestions)

router.use(auth)
// router.use(isAdmin)

router.post('/create', fileParser.array('documents', 10), controllers.createPastQuestion)

module.exports = router
