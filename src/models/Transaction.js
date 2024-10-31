const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, BOOLEAN, TEXT } = DataTypes

const transactionSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    success: {
        type: BOOLEAN,
        allowNull: false,
    },
    status: {
        type: STRING,
        allowNull: false,
    },
    reference: {
        type: STRING,
        allowNull: false,
    },
    amount: {
        type: DECIMAL(20, 9),
        allowNull: true,
    },
    verified: {
        type: BOOLEAN,
        allowNull: true,
    },
}

const Transaction = sequelize.define('Transaction', transactionSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Transaction.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Transaction model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Transaction ❌')
    })

module.exports = Transaction
