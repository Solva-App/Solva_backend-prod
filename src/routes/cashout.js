const router = require('express').Router()
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/cashout')

router.use(auth)
router.post('/create', controllers.createCashout)

router.get('/', controllers.getCashouts)

router.use(isAdmin)
router.patch('/decline/:id', controllers.decline)
router.patch('/approve/:id', controllers.approve)

module.exports = router
