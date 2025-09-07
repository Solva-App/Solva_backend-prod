const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, TEXT } = DataTypes

const grantSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    link: {
        type: STRING,
    },
}

const Grant = sequelize.define('Grant', grantSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Grant.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Job model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing AccessToken ❌')
    })

module.exports = Grant
