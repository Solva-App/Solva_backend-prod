const router = require('express').Router()
const { fileParser } = require('../middlewares')
const { auth, isAdmin } = require('../middlewares/auth')
const controllers = require('./../controllers/slider')

router.get('/', controllers.getSlide)

router.use(auth)
router.use(isAdmin)

router.post('/upload', fileParser.array('slides', 4), controllers.uploadSlideImage)
router.delete('/:id', controllers.deleteSlide)

module.exports = router
