const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/submission')

router.use(auth)
router.post('/create', controllers.createSubmission)

router.use(isAdmin)
router.get('/task/:taskId', controllers.getTaskSubmissions)
router.get('/:id', controllers.getSubmission)
router.patch('/approve/:id', controllers.approveSubmission)
router.patch('/reject/:id', controllers.rejectSubmission)
router.delete('/:id', controllers.deleteSubmission)

module.exports = router
