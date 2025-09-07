const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, TEXT } = DataTypes

const scholarshipSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    }
    link: {
        type: STRING,
    },
}

const Scholarship = sequelize.define('Scholarship', scholarshipSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Scholarship.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Scholarship model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing AccessToken ❌')
    })

module.exports = Scholarship
