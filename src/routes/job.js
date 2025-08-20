const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/job')

router.get('/', controllers.getJobs)

router.use(auth)
router.use(isAdmin)
router.get('/all', controllers.getAllJobs)
router.post('/create', controllers.createJob)
router.patch('/:id', controllers.updateJob)
router.delete('/:id', controllers.deleteJob)

module.exports = router
