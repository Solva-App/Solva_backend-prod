const router = require('express').Router()
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/stats')

router.use(auth)
router.use(isAdmin)
router.get('/', controllers.getStats)

module.exports = router
