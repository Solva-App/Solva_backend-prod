const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER } = DataTypes

const questionSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    title: {
        type: STRING,
        allowNull: false,
    },
    university: {
        type: STRING,
        alowNull: false,
    },
    faculty: {
        type: STRING,
        allowNull: false,
    },
    department: {
        type: STRING,
        allowNull: false,
    },
    courseCode: {
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
