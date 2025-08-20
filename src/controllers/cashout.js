const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const Cashout = require('../models/Cashout')
const User = require('../models/User')
const Account = require('../models/Account')
const { OK } = require('http-status-codes')
const paystack = require('./../http/paystack')

module.exports.createCashout = async function (req, res, next) {
    try {
        const schema = new Schema({
            accountNumber: { type: 'string', required: true },
            accountName: { type: 'string', required: true },
            bankName: { type: 'string', required: true },
            amount: { type: 'number', required: true },
        })
        const result = schema.validate(req.body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        const { user, body } = req

        // prevent admins from adding account
        if (user.isAdmin) {
            return next(CustomError.unauthorizedRequest('Admins are restricted from using this endpoint'))
        }

        // ensure user has enough funds
        user.balance -= body.amount
        if (user.balance < 0) {
            return next(CustomError.paymentRequiredError('Insufficent Balance'))
        }

        const account = await Account.findOne({
            where: {
                accountNumber: body.accountNumber,
                bankName: body.bankName,
            },
        })
        if (!account) {
            const bankCode = await paystack.getBankCode(body.bankName)
            if (!bankCode) return next(CustomError.badRequest('Bank not found'))
            const recipient = await paystack.createTransferRecipient({
                type: 'nuban',
                name: body.accountName,
                account_number: body.accountNumber,
                bank_code: bankCode,
                currency: 'NGN',
            })
            if (!recipient) return next(CustomError.badRequest('Account number is invalid'))
            const newAccount = await Account.create(result.data)
            newAccount.receipent_id = recipient.data.recipient_code
            await newAccount.save()
        }

        const cashout = await Cashout.create({
            owner: req.user.id,
            ...result.data,
        })

        await user.save()

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Cashout created successful',
            data: cashout,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getCashouts = async function (req, res, next) {
    try {
        let query = { status: 'awaiting-response' }
        if (!req.user.isAdmin) {
            query = { ...query, owner: req.user.id }
        }
        const cashouts = await Cashout.findAll({ where: query, order: [['createdAt', 'DESC']] })
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'cashout fetched successfully',
            data: cashouts,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.approve = async function (req, res, next) {
    try {
        let cashout = await Cashout.findByPk(req.params.id)
        if (!cashout) {
            return next(CustomError.badRequest('Invalid cashout id'))
        }

        if (cashout.status !== 'awaiting-response') {
            return next(CustomError.badRequest('you have already responded to this cashout request'))
        }

        const recipient_acc = await Account.findOne({
            where: {
                accountNumber: cashout.accountNumber,
                bankName: cashout.bankName,
            },
        })
        if (!recipient_acc) {
            return next(CustomError.badRequest('Account number is invalid'))
        }

        const transfer = await paystack.createTransfer({
          source: "balance",
          amount: Number(cashout.amount) * 100,
          recipient: recipient_acc.receipent_id,
          metadata: JSON.stringify({
            id: req.user.id,
            type: 'cashout',
          }),
        })

        cashout = await cashout.approve()

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Success',
            data: cashout
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.decline = async function (req, res, next) {
    try {
        let cashout = await Cashout.findByPk(req.params.id)
        if (!cashout) {
            return next(CustomError.badRequest('Invalid cashout id'))
        }
        if (cashout.status !== 'awaiting-response') {
            return next(CustomError.badRequest('you have already responded to this cashout request'))
        }

        const cashoutOwner = await User.findByPk(cashout.owner)
        cashoutOwner.balance += cashout.amount
        await cashoutOwner.save()

        cashout = await cashout.decline()
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Success',
            data: cashout,
        })
    } catch (error) {
        return next({ error })
    }
}
