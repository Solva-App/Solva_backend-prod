const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/freelancer')

router.post('/create/comment/:freelancerId', controllers.addComment)

router.use(auth)

router.post('/create', fileParser.single('profilePic'), controllers.becomeFreelancer)
router.get('/', controllers.getFreelancers)
router.get('/:id', controllers.getFreelancer)

module.exports = router
