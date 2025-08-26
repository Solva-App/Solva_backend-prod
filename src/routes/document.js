const { fileParser } = require('../middlewares')
const { auth, isAdmin } = require('../middlewares/auth')
const router = require('express').Router()
const controllers = require('./../controllers/document')

router.use(auth)
router.post('/upload', fileParser.array('documents', 10), controllers.uploadDocument)

router.use(isAdmin)
router.get('/', controllers.getAllUploadedDocuments)
router.get('/:docId', controllers.getUploadedDocuments)
router.patch('/approve/:docId', controllers.approveDocument)
router.patch('/decline/:docId', controllers.declineDocument)

module.exports = router
