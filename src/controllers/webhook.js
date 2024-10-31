const { OK } = require('http-status-codes')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const event = require('./../events/paystack')

module.exports.paystackTransactionWebhook = async function (req, res, next) {
    try {
        const { data, event: eventString } = req.body
        console.log(eventString)
        return event.emit(eventString, event, data, req, res, next)
        // validate the rest
    } catch (error) {
        console.log(error)
        return next({ error })
    }
}
