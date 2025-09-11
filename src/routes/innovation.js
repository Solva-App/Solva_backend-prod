const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('../controllers/innovation')

router.get('/', controllers.getInnovations)
router.get('/:id', controllers.getInnovation)

router.use(auth)
router.use(isAdmin)

router.post('/create', controllers.createInnovation)
router.patch('/:id', controllers.updateInnovation)
router.delete('/:id', controllers.deleteInnovation)

module.exports = router
