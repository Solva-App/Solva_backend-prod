const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { isAdmin, auth, isPremium } = require('../middlewares/auth')
const controllers = require('./../controllers/task')

router.use(auth)
router.use(isPremium)
router.get('/', controllers.getTasks)

router.get('/company', controllers.getCompanyTasks)
router.post('/company/create', fileParser.fields([{ name: "sponsorLogo", maxCount: 1 }, { name: "bannerImage", maxCount: 1 }]), controllers.createCompanyTaskDraft)
router.post('/company/activate', controllers.verifyAndActivateCompanyTask)
router.get('/company/:id', controllers.getCompanyTask)
router.patch('/company/:id', fileParser.fields([{ name: "sponsorLogo", maxCount: 1 }, { name: "bannerImage", maxCount: 1 }]), controllers.updateCompanyTask)
router.delete('/company/:id', controllers.deleteCompanyTask)

router.get('/:id', controllers.getTask)

router.use(isAdmin)
router.post('/create', fileParser.fields([{ name: "sponsorLogo", maxCount: 1 }, { name: "bannerImage", maxCount: 1 }]), controllers.createTask)
router.patch('/:id', fileParser.fields([{ name: "sponsorLogo", maxCount: 1 }, { name: "bannerImage", maxCount: 1 }]), controllers.updateTask)
router.delete('/:id', controllers.deleteTask)

module.exports = router
