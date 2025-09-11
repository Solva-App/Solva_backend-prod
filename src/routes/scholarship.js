const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/scholarship')

router.use(auth)
router.get('/', controllers.getScholarships)
router.get('/:id', controllers.getScholarship)

router.use(isAdmin)
router.post('/create', controllers.createScholarship)
router.patch('/:id', controllers.updateScholarship)
router.delete('/:id', controllers.deleteScholarship)

module.exports = router
