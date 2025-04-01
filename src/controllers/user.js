const { Schema } = require('json-validace')
const CustomError = require('../helpers/error')
const User = require('../models/User')
const { CREATED, OK } = require('http-status-codes')
const Token = require('../models/Token')
const redis = require('./../helpers/redis')
const Freelancer = require('../models/Freelancer')
const { emailVerification } = require('../helpers/email')
const uuid = require('uuid')

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
            const referral = await User.findOne({ where: { referralCode: body.referral } })
            if (!referral) return next(CustomError.badRequest('Invalid referral code'))
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
            referralCode: await Token.generateReferral(body.email),
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
                freelancer: await Freelancer.findOne({ where: { owner: req.user.id } }),
            },
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getUserById = async function (req, res, next) {
    try {
        const user = await User.findByPk(req.params.id)
        if (!user) {
            return next(CustomError.badRequest('User does not exit'))
        }
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'User data fetched successfully',
            data: user,
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
            return next(CustomError.badRequest('Invalid request body', result.error))
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
        const schema = new Schema({
            callback: { type: 'string', required: true },
            email: { type: 'email', required: true },
        })

        const r = schema.validate(req.body)
        if (r.error) {
            return next(CustomError.badRequest('Invalid request body', r.error))
        }

        const body = r.data

        // check if user exist
        const user = await User.findOne({ where: { email: req.body.email } })

        if (user) {
            // generate reference id
            let reference = null
            const callback = req.body.callback

            while (!reference && (await redis.getRedisData(reference))) {
                reference = `${uuid.v1()}`
            }

            // saving email to redis
            let url = encodeURI(`${process.env.BASE_URL}/api/v1/users/update/password/${reference}?callback=${callback}`)

            await redis.setRedisData(
                reference,
                {
                    ...req.body,
                    url: url,
                    callback: req.body.callback,
                },
                60 * 20 // set to expire in 20 minute
            )

            emailVerification({
                url: url,
                user: user,
                ...req.body,
            })
        }

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Email sent to recipient',
            data: null,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.manageForgottenPasswordCallback = async function (req, res, next) {
    try {
        const reference = req.params.reference
        const callback = req.query.callback
        const url = `${callback}?reference=${reference}`

        //verify url
        const data = await redis.getRedisData(reference)
        console.log(data)
        if (!data) {
            return next(CustomError.badRequest('Invalid or expired url'))
        }

        res.status(OK).redirect(url)
    } catch (error) {
        return next(error)
    }
}

module.exports.updateForgottenPassword = async function (req, res, next) {
    try {
        const schema = new Schema({
            reference: { type: 'string', required: true },
            newPassword: { type: 'string', required: true },
        })

        const r = schema.validate(req.body)
        if (r.error) {
            return next(CustomError.badRequest('Invalid request body', r.error))
        }

        const body = r.data

        // validate the validate reference
        const referenceData = await redis.getRedisData(body.reference)
        if (!referenceData) {
            return next(CustomError.badRequest('Invalid or expired reference ID'))
        }

        const user = await User.findOne({ where: { email: referenceData.email } })
        // change the password
        user.password = body.newPassword
        console.log(user)
        await user.encrypt()
        await user.save()

        // delete redis reference
        await redis.deleteRedisData(body.reference)

        return res.status(OK).send({
            message: 'Password changed succssfully!',
            success: true,
            status: res.statusCode,
            data: null,
        })
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
        req.user.gender = body.gender ?? req.user.gender

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

module.exports.flagUsers = async function (req, res, next) {
    try {
        const user = await User.findByPk(req.params.id)
        if (!user) {
            return next(CustomError.badRequest('Invalid id'))
        }

        user.isSuspended = true
        await user.save()

        return res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'User suspended successfully',
            data: user,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.unFlagUsers = async function (req, res, next) {
    try {
        const user = await User.findByPk(req.params.id)
        if (!user) {
            return next(CustomError.badRequest('Invalid id'))
        }

        user.isSuspended = false
        await user.save()

        return res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'User suspended successfully',
            data: user,
        })
    } catch (error) {
        return next({ error })
    }
}


// GET user balance
module.exports.getUserBalance = async function (req, res, next) {
    try {
        const user = await User.findOne({ attributes: ['balance'], where: { id: req.params.id } });
        if (!user) {
            return next(CustomError.badRequest('Invalid user id'))
        }
        const userBalance = user.balance;
        return res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Get user balance',
            data: { balance: userBalance },
        })
    } catch (error) {
        return next({ error })
    }
}