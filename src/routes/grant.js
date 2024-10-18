const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/grant')

router.use(auth)
// router.use(isAdmin)
router.post('/create', controllers.createGrant)
router.get('/', controllers.getGrant)
router.patch('/:id', controllers.updateGrant)
router.delete('/:id', controllers.deleteGrant)

module.exports = router
