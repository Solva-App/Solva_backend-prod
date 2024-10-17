const { Schema } = require('json-validace')
const CustomError = require('../helpers/error')
const { default: isEmail } = require('validator/lib/isEmail')
const User = require('../models/User')
const { CREATED, OK } = require('http-status-codes')
const Token = require('../models/Token')
const redis = require('./../helpers/redis')

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
            return next(
                CustomError.badRequest('Invalid request body', {
                    fullName: { type: 'Full name is invalid' },
                })
            )
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
            refferal: '',
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

        const getPrefix = () => {
            let n = req.user.fullName.split(' ')
            let fn = n[0][0]
            let ln = n[n.length - 1][0]
            return (fn + ln).toLowerCase()
        }

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: "sucessfully fetched user's data!",
            data: {
                hasPassword: Boolean(req?.user?.password),
                ...req.user.dataValues,
                prefix: getPrefix(),
                password: undefined,
            },
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.generateToken = async function (req, res, next) {
    try {
        const schema = new Schema({ refreshToken: { type: 'string', required: true } })
        const result = schema.validate(req.body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body'), result.error)
        }

        const body = result.data

        const tokens = await Token.generateNewAccessToken(body.refreshToken)
        if (tokens instanceof CustomError) {
            return next(tokens)
        }

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            data: tokens,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.sendForgottenPasswordVerificationOtp = async function (req, res, next) {
    try {
        let url = `${process.env.BASE}/account/complete/${reference}`

        // saving email to redis
        await redis.setRedisData(reference, {
            ...req.body,
            url: url,
        })

        emails.emailVerification({
            url: url,
            ...req.body,
        })

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: '',
            data: {},
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.changePassword = async function (req, res, next) {
    try {
    } catch (error) {
        return next({ error })
    }
}

module.exports.updatePassword = async function (req, res, next) {
    try {
        const schema = new Schema({
            oldPassword: { type: 'string', required: true },
            newPassword: { type: 'string', required: true },
        })

        const result = schema.validate(req.body)
        if (result.error) return next(CustomError.badRequest('Invalid Body', result.error))

        const body = result.data

        // validate the password
        const isPasswordValid = await req.user.verifyPassword(body.oldPassword)
        if (!isPasswordValid) return next(CustomError.badRequest('Invalid password'))

        // change the password
        req.user.password = body.newPassword
        await req.user.encrypt()
        await req.user.save()

        return res.status(OK).send({
            message: 'Password changed succssfully!',
            success: true,
            status: res.statusCode,
            data: null,
        })
    } catch (error) {
        return next(error)
    }
}

module.exports.getAllUsers = async function (req, res, next) {
    try {
        const users = await User.findAll()
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Users fetched successfully',
            data: users,
        })
    } catch (error) {
        return next({ error })
    }
}

// update profile
module.exports.updateProfile = async function (req, res, next) {
    try {
        const schema = new Schema({
            fullName: { type: 'string', required: false, trim: true, default: req.user.firstName },
            email: { type: 'string', required: false, trim: true, default: req.user.lastName },
            phone: { type: 'string', required: false, trim: true },
            address: { type: 'string', required: false, trim: true },
            gender: { type: 'string', required: false, trim: true, toLower: true, enum: ['male', 'female'] },
        })

        const result = schema.validate(req.body)

        if (result.error) {
            return next(CustomError.badRequest('Invalid Body', result.error))
        }

        const body = result.data

        if (body.fullName.split(' ').length < 2) {
            return next(CustomError.badRequest('Full name is invalid'))
        }

        // update the nameobject
        req.user.fullName = body.fullName ?? req.user.fullName
        req.user.address = body.address ?? req.user.address
        req.user.email = body.email ?? req.user.email
        req.user.phone = body.phone ?? req.user.phone
        req.user.gender = body.gender ?? req.user.phone

        await req.user.save()

        // send response
        res.status(OK).send({
            message: 'profile changed successfully',
            success: true,
            status: res.statusCode,
            data: req.user,
        })
    } catch (error) {
        return next({ error })
    }
}
