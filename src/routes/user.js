const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/user')

router.post('/create', controllers.createAccount)
router.post('/login', controllers.login)
router.post('/generate/token', controllers.generateToken)
router.post('/forgotten/password/otp', controllers.sendForgottenPasswordVerificationOtp)
router.get('/update/password/:reference', controllers.manageForgottenPasswordCallback)
router.patch('/update/forgotten/password', controllers.updateForgottenPassword)

router.use(auth)

router.get('/', controllers.getUser)
router.patch('/users/update/password', controllers.updatePassword)
router.patch('/', controllers.updateProfile)

router.use(isAdmin) // ensure only admins  gets access to the below endpoints
router.get('/all', controllers.getAllUsers)
router.get('/:id', controllers.getUserById)
router.patch('/flag/:id', controllers.flagUsers)
router.patch('/unflag/:id', controllers.unFlagUsers)

module.exports = router
