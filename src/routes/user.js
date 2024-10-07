const router = require('express').Router()
const { auth } = require('../middlewares/auth')
const controllers = require('./../controllers/user')

router.post('/create', controllers.createAccount)
router.post('/login', controllers.login)
router.post('/generate/token', controllers.generateToken)

router.use(auth)

router.get('/', controllers.getUser)
router.patch('/update/password', controllers.updatePassword)
router.patch('/', controllers.updateProfile)

module.exports = router
