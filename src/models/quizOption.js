const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { TEXT, BOOLEAN, INTEGER } = DataTypes

const quizOptionSchema = {
  questionId: {
    type: INTEGER,
    allowNull: false,
  },
  optionText: {
    type: TEXT,
    allowNull: false,
  },
  isCorrect: {
    type: BOOLEAN,
    defaultValue: false,
  },
}

const QuizOption = sequelize.define('QuizOption', quizOptionSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

QuizOption.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> QuizOption model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing QuizOption ❌')
  })

module.exports = QuizOption