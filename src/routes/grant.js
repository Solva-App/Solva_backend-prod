const router = require('express').Router()
const { isAdmin, auth } = require('../middlewares/auth')
const controllers = require('./../controllers/grant')

router.get('/', controllers.getGrants)

router.use(auth)
router.use(isAdmin)

router.post('/create', controllers.createGrant)
router.patch('/:id', controllers.updateGrant)
router.delete('/:id', controllers.deleteGrant)

module.exports = router
