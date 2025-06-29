const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { auth } = require('../middlewares/auth')
const controllers = require('./../controllers/freelancer')

router.post('/create/comment/:freelancerId', controllers.addComment)

router.use(auth)

router.post('/create', fileParser.single('profilePic'), controllers.becomeFreelancer)
router.get('/', controllers.getFreelancers)
router.get('/catigories', controllers.getCatigories)
router.get('/:id', controllers.getFreelancer)
router.put('/edit', fileParser.single('profilePic'), controllers.editFreelancerProfile)

module.exports = router
