const Transaction = require('../models/Transaction')
const User = require('../models/User')

module.exports.paystackTransactionWebhook = async function (req, res, next) {
    try {
        const { status, data, message } = req.body
        status = status.toLowerCase()

        const user = await User.findOne({ where: { email: data.customer.email } })

        const transaction = await Transaction.create({
            owner: user.id,
            reference: data.reference,
            status: status,
            success: status === 'success',
            verified: true,
            amount: data.amount / 100,
        })

        // validate the rest
        // and initiate the time cron operation for consitent charge
    } catch (error) {
        return next({ error })
    }
}
