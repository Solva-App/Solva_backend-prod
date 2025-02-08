const router = require('express').Router()
const controllers = require('./../controllers/webhook')

router.post('/paystack', controllers.paystackTransactionWebhook)

module.exports = router
