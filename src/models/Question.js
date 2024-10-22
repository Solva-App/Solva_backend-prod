const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, TEXT } = DataTypes

const questionSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    name: {
        type: TEXT,
        allowNull: false,
    },
    description: {
        type: STRING,
        allowNull: false,
    },
}

const Question = sequelize.define('Question', questionSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Question.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Question model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Question ❌')
    })

module.exports = Question
