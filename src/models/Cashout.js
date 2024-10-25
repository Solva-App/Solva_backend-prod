const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, BOOLEAN } = DataTypes

const cashoutSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
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
    amount: {
        type: STRING,
        allowNull: false,
    },
    status: {
        type: STRING,
        defaultValue: 'awaiting-response',
    },
}

const Cashout = sequelize.define('Cashout-Request', cashoutSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

Cashout.prototype.approve = async function () {
    const cashout = this
    cashout.status = 'approved'
    return await cashout.save()
}
Cashout.prototype.decline = async function () {
    const cashout = this
    cashout.status = 'declined'
    return await cashout.save()
}

// sync database
Cashout.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Cashout model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Cashout ❌')
    })

module.exports = Cashout
