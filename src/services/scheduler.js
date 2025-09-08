const schedule = require('node-schedule')
const paystack = require('./../http/paystack')
const CustomError = require('../helpers/error')
const User = require('../models/User')
const { formatDate } = require('./../helpers/time')
const Token = require('../models/Token')

const initiateCharge = function (user) {
    console.log(`Charge will be initiated ${formatDate(user.lastSubscriptionExpiresAt)}`, user.email)
    return async () => {
        // console.log('charge in progress')
        const amount = user.lastSubscriptionPlan === 999
        // initiate the charge
        const charge = await paystack.chargeCard({
            email: user.email,
            amount: amount,
            authorization_code: user.chargeAuthCode,
            metadata: {
                id: user.id,
                type: user.lastSubscriptionPlan,
            },
        })

        if (charge instanceof CustomError) {
            user.willChargeAgain = false
        }

        return await user.save()
    }
}

module.exports.initiateSubscriptionScheduler = async function (user) {
    if (user.chargeChannel !== 'card') {
        schedule.scheduleJob(user.lastSubscriptionExpiresAt, async () => {
            user.category = 'user'
            await user.save()
        })
    } else {
        schedule.scheduleJob(user.chargeAuthCode, user.lastSubscriptionExpiresAt, initiateCharge(user))
    }
}

module.exports.initiateAllSubscriptionScheduler = async function () {
    const users = await User.findAll({
        where: {
            autoCharge: true,
        },
    })

    // initiate all user charge
    users.forEach((user) => {
        if (user.chargeChannel !== 'card') {
            schedule.scheduleJob(user.lastSubscriptionExpiresAt, async () => {
                user.category = 'user'
                await user.save()
            })
        } else {
            schedule.scheduleJob(user.chargeAuthCode, user.lastSubscriptionExpiresAt, initiateCharge(user))
        }
    })
}

module.exports.stopAutoCharge = async function (user) {
    console.log('Auto Charge Disactivated Successfully')
    user.autoCharge = false
    await user.save()
    if (user.chargeChannel === 'card') return schedule.cancelJob(user.chargeAuthCode)
}

