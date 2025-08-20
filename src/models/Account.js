const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING } = DataTypes

const accountSchema = {
    accountNumber: {
        type: STRING,
        allowNull: false,
    },
    accountName: {
        type: STRING,
        allowNull: false,
    },
    bankName: {
        type: STRING,
        allowNull: false,
    },
    receipent_id: {
        type: STRING,
        allowNull: true,
    },
}

const Account = sequelize.define('Account', accountSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Account.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Account model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Account ❌')
    })

module.exports = Account

