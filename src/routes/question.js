const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/question')

router.get('/:id', controllers.getPastQuestion)
router.get('/', controllers.getPastQuestions)

router.use(auth)
router.post('/create', fileParser.array('documents', 10), controllers.createPastQuestion)

router.use(isAdmin)
router.patch('/decline/:id', controllers.declinePastQuestion)
router.patch('/approve/:id', controllers.approvePastQuestion)
router.delete('/:id', controllers.deletePastQuestion)

module.exports = router
