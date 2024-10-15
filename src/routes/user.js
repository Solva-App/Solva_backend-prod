const router = require('express').Router()
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/user')

router.post('/create', controllers.createAccount)
router.post('/login', controllers.login)
router.post('/generate/token', controllers.generateToken)

router.use(auth)

router.get('/', controllers.getUser)
router.patch('/update/password', controllers.updatePassword)
router.patch('/', controllers.updateProfile)

router.use(isAdmin) // ensure only admins  gets access to the below endpoints
router.get('/all', controllers.getAllUsers)

module.exports = router
