const EventEmitter = require('events')
const User = require('../models/User')
const { OK } = require('http-status-codes')
const Transaction = require('../models/Transaction')
const { initiateSubscriptionScheduler } = require('../services/scheduler')
const Token = require('../models/Token')

const event = new EventEmitter()

event.on('charge.success', async function (_event, data, req, res, next) {
    try {
        const date = new Date()
        date.setMonth(date.getMonth() + data.metadata.type === 'premium' ? 3 : 1)

        const user = await User.findOne({ where: { email: data.customer.email } })
        user.chargeAuthCode = data.authorization.authorization_code
        user.lastSubscriptionExpiresAt = date // set this to be the next 3 month
        user.lastSubscriptionPlan = data.metadata.type
        user.chargeChannel = data.channel.toLowerCase()

        await Transaction.create({
            owner: user.id,
            reference: data.reference,
            status: data.status,
            success: data.status.toLowerCase() === 'success',
            amount: data.amount / 100,
            verified: true,
        })

        // initiate crod when for next charge if chanel is don via card
        if (user.chargeChannel === 'card') {
            user.autoCharge = true
            await initiateSubscriptionScheduler(user)
        }

        await user.save()

        res.sendStatus(OK)
    } catch (error) {
        next({ error })
    }
})

module.exports = event
