const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/job')

router.use(auth)
// router.use(isAdmin)
router.post('/create', controllers.createJob)
router.get('/', controllers.getJobs)
router.patch('/:id', controllers.updateJob)
router.delete('/:id', controllers.deleteJob)

module.exports = router
