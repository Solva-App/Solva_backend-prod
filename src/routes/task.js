const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/task')

router.use(auth)
router.get('/', controllers.getTasks)
router.get('/:id', controllers.getTask)

router.use(isAdmin)
router.post('/create', fileParser.fields([{ name: "sponsorLogo", maxCount: 1 }, { name: "bannerImage", maxCount: 1 }]), controllers.createTask)
router.patch('/:id', fileParser.fields([{ name: "sponsorLogo", maxCount: 1 }, { name: "bannerImage", maxCount: 1 }]), controllers.updateTask)
router.delete('/:id', controllers.deleteTask)

module.exports = router
