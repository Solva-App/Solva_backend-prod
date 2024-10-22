const { DataTypes } = require('sequelize')
const { sequelize } = require('./../database/db')
const jsonwebtoken = require('jsonwebtoken')
const CustomError = require('../helpers/error')
const User = require('./User')
const { createHmac } = require('crypto')

const { TEXT, INTEGER, DATE } = DataTypes

const accessTokenSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    accessToken: {
        type: TEXT,
        allowNull: false,
    },
    accessTokenExpiresIn: {
        type: DATE,
        allowNull: true,
    },
    refreshToken: {
        type: TEXT,
        allowNull: false,
    },
    refreshTokenExpiresIn: {
        type: DATE,
        allowNull: true,
    },
    notificationToken: {
        type: TEXT,
        allowNull: true,
    },
}

const Token = sequelize.define('Token', accessTokenSchema, {
    timestamps: true,
})

// sync changes to accesstoken table
Token.sync()

// generate access token
Token.generate = async function (user, notificationToken) {
    try {
        // remove unecessary keys from the user object
        user = user.dataValues
        delete user.password
        delete user.email
        delete user.pin
        delete user.isEmailVerified
        delete user.referral

        // ensure every accessToken get's delete on login (this will help ensure security)
        // await Token.destroy({ where: { owner: user.id } })

        const accessToken = Token.generateAccessToken(user)
        const refreshToken = Token.generateRefreshToken(user)

        // storing accessToken to database
        const tokens = await Token.create({
            accessToken: accessToken.token,
            accessTokenExpiresIn: accessToken.expiresIn,
            refreshToken: refreshToken.token,
            refreshTokenExpiresIn: refreshToken.expiresIn,
            owner: user.id,
            notificationToken,
        })

        return tokens
    } catch (error) {
        console.log(error)
        return CustomError.internalServerError('Something went wrong!')
    }
}

Token.generateAccessToken = (data) => {
    const accessTokenExpiresIn = new Date()
    accessTokenExpiresIn.setHours(accessTokenExpiresIn.getHours() + 24)
    return {
        token: jsonwebtoken.sign(data, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIERATION }),
        expiresIn: accessTokenExpiresIn,
    }
}

Token.generateRefreshToken = (data) => {
    const refreshTokenExpiresIn = new Date()
    refreshTokenExpiresIn.setMinutes(refreshTokenExpiresIn.getMinutes() + 30)

    return {
        token: jsonwebtoken.sign(data, process.env.JTW_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIERATION }),
        expiresIn: refreshTokenExpiresIn,
    }
}

Token.extractToken = (token, secret = process.env.JWT_ACCESS_TOKEN_SECRET) => {
    try {
        const decoded = jsonwebtoken.verify(token, secret)
        // Check if the token has an expiration claim ('exp') and compare it with the current time
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return null // expired token
        }
        return decoded // valid token
    } catch (error) {
        console.error('Error verifying Access Token')
        return null // Invalid token
    }
}

Token.generateNewAccessToken = async function (refreshToken) {
    const tokenPayload = Token.extractToken(refreshToken, process.env.JTW_REFRESH_TOKEN_SECRET)
    if (!tokenPayload) {
        return CustomError.badRequest('Expired or invalid refresh token')
    }

    const token = await Token.findOne({ where: { refreshToken: refreshToken } })
    if (!token) {
        // console.log(token)
        return CustomError.badRequest('invalid token')
    }

    delete tokenPayload.iat
    delete tokenPayload.exp

    const accessToken = Token.generateAccessToken(tokenPayload)

    token.accessToken = accessToken.token
    token.accessTokenExpiresIn = accessToken.expiresIn
    await token.save()
    return token
}

// delete accesstoken from database
Token.deleteToken = async function (accessToken) {
    await Token.destroy({ where: { accessToken: accessToken } })
    console.log('token deleted!')
}

// verify accessToken
Token.verify = async function (accessToken) {
    try {
        // check if token is in database
        const token = await Token.findOne({
            where: {
                accessToken: accessToken,
            },
        })

        if (!token) return CustomError.badRequest('Invalid Access Token!')

        // verify accessToken payload
        jsonwebtoken.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET)

        // get user's data
        const user = await User.findOne({ where: { id: token.owner } })
        return { token, user }
    } catch (error) {
        if (error.name.toLowerCase() === 'tokenexpirederror') {
            // delete accesstoken from database
            // await Token.deleteToken(accessToken)
            return CustomError.unauthorizedRequest('Your Access token has expired!')
        }

        return CustomError.badRequest('Invalid Access Token!')
    }
}

Token.generateReferral = async function (id) {
    const hash = createHmac('sha256', process.env.REFERRAL_SECRET_ID).update(id).digest('hex')
    return hash.slice(0, 6).toUpperCase()
}

// sync database
Token.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> AccessToken model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing AccessToken ❌')
    })

module.exports = Token
