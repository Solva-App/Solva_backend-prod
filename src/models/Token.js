const { DataTypes } = require('sequelize')
const { sequelize } = require('./../database/db')
const jsonwebtoken = require('jsonwebtoken')
const CustomError = require('../helpers/error')
const User = require('./User')

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
        delete user.pin
        delete user.isEmailVerified
        delete user.referral

        // ensure every accessToken get's delete on login (this will help ensure security)
        // await Token.destroy({ where: { owner: user.id } })

        const accessToken = jsonwebtoken.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIERATION })
        const refreshToken = jsonwebtoken.sign(user, process.env.JTW_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIERATION })

        const accessTokenExpiresIn = new Date()
        accessTokenExpiresIn.setHours(accessTokenExpiresIn.getHours() + 24)
        // refreshTokenExpire
        const refreshTokenExpiresIn = new Date()
        refreshTokenExpiresIn.setMinutes(refreshTokenExpiresIn.getMinutes() + 30)

        // storing accessToken to database
        const tokens = await Token.create({
            accessToken: accessToken,
            accessTokenExpiresIn: accessTokenExpiresIn,
            refreshToken: refreshToken,
            refreshTokenExpiresIn: refreshTokenExpiresIn,
            owner: user.id,
            notificationToken,
        })

        return tokens
    } catch (error) {
        console.log(error)
        return CustomError.internalServerError('Something went wrong!')
    }
}

Token.isTokenExpired = (token) => {
    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET) // Replace 'yourSecretKey' with your actual secret key

        // Check if the token has an expiration claim ('exp') and compare it with the current time
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return true // Token has expired
        }

        return false // Token is still valid
    } catch (error) {
        console.error('Error verifying Access Token')
        return true // Invalid token
    }
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
            await Token.deleteToken(accessToken)
            return CustomError.unauthorizedRequest('Your Access token has expired!')
        }

        return CustomError.badRequest('Invalid Access Token!')
    }
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
