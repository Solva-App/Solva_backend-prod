const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { isAdmin, auth, isPremium } = require('../middlewares/auth')
const controllers = require('./../controllers/submission')

router.use(auth)
router.use(isPremium)
router.post('/create', controllers.createSubmission)

router.get('/company/task/:taskId', controllers.getCompanyTaskSubmissions)
router.get('/company/:id', controllers.getCompanyTaskSubmissions)
router.patch('/company/approve/:id', controllers.approveCompanyTaskSubmission)
router.patch('/company/reject/:id', controllers.rejectCompanyTaskSubmission)

router.use(isAdmin)
router.get('/task/:taskId', controllers.getTaskSubmissions)
router.get('/:id', controllers.getSubmission)
router.patch('/approve/:id', controllers.approveSubmission)
router.patch('/reject/:id', controllers.rejectSubmission)
router.delete('/:id', controllers.deleteSubmission)

module.exports = router
