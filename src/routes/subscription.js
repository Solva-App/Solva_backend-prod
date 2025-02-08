const { auth } = require('../middlewares/auth')
const router = require('express').Router()
const controllers = require('./../controllers/subscription')

router.use(auth)
router.get('/:plan/link', controllers.generateLink)
router.post('/end/autocharge', controllers.disableSubscription)

module.exports = router
