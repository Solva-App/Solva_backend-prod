const { OK } = require('http-status-codes')
const paystack = require('./../http/paystack')
const CustomError = require('../helpers/error')
const Transaction = require('../models/Transaction')

module.exports.generateLink = async function (req, res, next) {
    try {
        const amount = req.params.plan === 'premium' ? 4000 : 2000

        const link = await paystack.generatePaymentLink({
            amount: amount,
            email: req.user.email,
            full_name: req.user.fullName,
        })

        if (link instanceof CustomError) {
            return next(link)
        }

        const transaction = await Transaction.create({
            owner: req.user.id,
            amount: amount,
            reference: link.data.reference,
        })

        // generate crud operation to verify transaction
        // ---- inside crude operation start the subscription

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Link fetched successfully',
            data: {
                url: link.data.authorization_url,
                transaction: transaction,
            },
        })
    } catch (error) {
        return next({ error })
    }
}
