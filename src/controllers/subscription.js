const { OK } = require('http-status-codes')
const paystack = require('./../http/paystack')
const CustomError = require('../helpers/error')
const Transaction = require('../models/Transaction')
const { stopAutoCharge } = require('../services/scheduler')

module.exports.generateLink = async function (req, res, next) {
    try {
        if (!['premium', 'basic'].includes(req.params.plan)) {
            return next(CustomError.badRequest('Please provide a proper plan'))
        }

        const amount = req.params.plan === 'premium' ? 1999 : 999
        const callback = req.params.callback

        const link = await paystack.generatePaymentLink({
            amount: amount * 100,
            email: req.user.email,
            full_name: req.user.fullName,
            callback_url: callback ? callback.toLowerCase().trim() : undefined,
            channels: ['card'],
            metadata: JSON.stringify({
                id: req.user.id,
                type: req.params.plan,
            }),
        })

        if (link instanceof CustomError) {
            return next(link)
        }

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Link fetched successfully',
            data: {
                ...link.data,
            },
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.disableSubscription = async function (req, res, next) {
    try {
        const result = await stopAutoCharge(req.user)
        if (!result) {
            return next(CustomError.badRequest('No auto charge is initiated on your account'))
        }

        res.status(OK).json({
            success: true,
            statusCode: res.statusCode,
            message: 'Stop Auto Charge',
            data: null,
        })
    } catch (error) {
        return next({ error })
    }
}
