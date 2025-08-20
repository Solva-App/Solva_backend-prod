const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/job')

router.get('/', controllers.getJobs)
router.get('/:id', controllers.getJob)

router.use(auth)
router.use(isAdmin)
router.get('/total/count', controllers.getTotalJobs)
router.post('/create', controllers.createJob)
router.patch('/:id', controllers.updateJob)
router.delete('/:id', controllers.deleteJob)

module.exports = router
