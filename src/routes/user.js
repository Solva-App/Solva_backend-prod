const router = require('express').Router()
const { auth } = require('../middlewares/auth')
const controllers = require('./../controllers/user')

router.post('/create', controllers.createAccount)
router.post('/login', controllers.login)

router.use(auth)

router.get('/', controllers.getUser)

module.exports = router
