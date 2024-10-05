const { Schema } = require('json-validace')
const CustomError = require('../helpers/error')
const { default: isEmail } = require('validator/lib/isEmail')
const User = require('../models/User')
const { CREATED, OK } = require('http-status-codes')
const Token = require('../models/Token')

module.exports.createAccount = async function (req, res, next) {
    try {
        const schema = new Schema({
            fullName: { type: 'string', required: true },
            email: { type: 'email', required: true },
            phone: { type: 'string', required: true },
            password: { type: 'string', required: true, minLength: 8 },
            referral: { type: 'string', required: false },
        })

        const result = schema.validate(req.body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid Request Body', result.error))
        }

        const body = result.data

        if (body.fullName.split(' ').length < 2) {
            return next(CustomError.badRequest('Full name is invalid'))
        }
        // check if email is already used
        const isEmailUsed = await User.findOne({ where: { email: body.email } })
        const isPhoneUsed = await User.findOne({ where: { phone: body.phone } })

        if (isEmailUsed) {
            return next(CustomError.unauthorizedRequest('Email already in use!'))
        } else if (isPhoneUsed) {
            return next(CustomError.unauthorizedRequest('Phone number is already used!'))
        }

        if (body.referral) {
            const referral = await User.findOne({ where: { referral: body.referral } })
            if (!referral) return next(CustomError.badRequest('Invalid Referral Username'))
            body.referral = referral.id // asign the id of the referral to the user's data

            referral.balance += 100
            await referral.save()
        }

        // create user
        // TODO: add referral to this user
        const user = await User.create({
            ...body,
            isSuspended: false,
            role: 'user',
            category: 'user',
            isActive: true,
        })

        res.status(CREATED).json({
            success: true,
            status: res.statusCode,
            message: 'Account created sucessfully!',
            data: {
                ...user.dataValues,
            },
        })
    } catch (error) {
        return next(error)
    }
}

module.exports.login = async function (req, res, next) {
    try {
        const schema = new Schema({
            email: { type: 'email', required: true },
            password: { type: 'string', required: true },
        })
        const result = schema.validate(req.body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        const body = result.data
        const user = await User.verifyLoginCredentials(body)
        if (user instanceof CustomError) return next(user)

        const tokens = await Token.generate(user)
        if (tokens instanceof CustomError) {
            return next(tokens)
        }
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'User login successfully',
            data: {
                user,
                tokens,
            },
        })
    } catch (error) {
        console.log(error)
        return next({ error })
    }
}

module.exports.getUser = async function (req, res, next) {
    try {
        const schema = new Schema({})
        if (schema.validate(req.body).error) return next(CustomError.badRequest('this endpoint does not require a body!'))

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: "sucessfully fetched user's data!",
            data: {
                hasPassword: Boolean(req?.user?.password),
                ...req.user.dataValues,
                password: undefined,
            },
        })
    } catch (error) {
        return next({ error })
    }
}
