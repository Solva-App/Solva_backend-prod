const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const bcrypt = require('bcryptjs')
const CustomError = require('../helpers/error')

const { STRING, INTEGER, BOOLEAN, DATE, DECIMAL } = DataTypes

const userSchema = {
    fullName: {
        type: STRING,
        allowNull: false,
    },
    email: {
        type: STRING,
        allowNull: false,
    },
    gender: {
        type: STRING,
        allowNull: true,
    },
    address: {
        type: STRING,
        allowNull: true,
    },
    isAdmin: {
        type: BOOLEAN,
        defaultValue: false,
    },
    phone: {
        type: STRING,
        allowNull: false,
    },
    password: {
        type: STRING,
        allwNull: false,
    },
    referral: {
        type: STRING,
        allowNull: true,
    },
    isActive: {
        type: BOOLEAN,
        defaultValue: true,
    },
    category: {
        type: STRING,
        defaultValue: true,
    },
    isSuspended: {
        type: BOOLEAN,
        defaultValue: false,
    },
    role: {
        type: STRING,
        defaultValue: false,
    },
    balance: {
        type: DECIMAL(20, 3),
        defaultValue: 0,
    },
}

const User = sequelize.define('User', userSchema, {
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            // encrypt password
            user.password = await bcrypt.hash(user.password, Number(process.env.PASSWORD_HASH))
            if (user.pin) user.pin = await bcrypt.hash(user.pin, Number(process.env.PIN_HASH))
        },
        beforeSave: () => {},
    },
})

// sync database
User.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> User model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing User ❌')
    })

User.prototype.encrypt = async function (key = 'password') {
    this[key] = await bcrypt.hash(this[key], Number(process.env.PASSWORD_HASH))
}

User.prototype.verifyPassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}

User.prototype.verifyTransactionPin = async function (pin) {
    return await bcrypt.compare(pin, this.pin)
}

User.verifyLoginCredentials = async function (credentials) {
    const credential = credentials.username ? 'username' : 'email'

    // check iif user with username or email exist
    const user = await User.findOne({
        where: {
            [credential]: credentials[credential],
        },
    })

    if (!user) return CustomError.badRequest('user not registered with us!')

    // check if password matches the account's password
    const isPasswordSimilarToDB = await bcrypt.compare(credentials.password, user.password)
    if (!isPasswordSimilarToDB) return CustomError.unauthorizedRequest('username or password is incorrect')

    return user
}

module.exports = User
