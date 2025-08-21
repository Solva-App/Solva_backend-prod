const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/question')

router.get('/:id', controllers.getPastQuestion)
router.get('/', controllers.getPastQuestions)

router.use(auth)

router.use(isAdmin)
router.patch('/edit/:id', controllers.editPastQuestion)

// router.patch('/decline/:id', controllers.declinePastQuestion)
// router.patch('/approve/:id', controllers.approvePastQuestion)
// router.delete('/:id', controllers.deletePastQuestion)

module.exports = router
