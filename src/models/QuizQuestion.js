const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { INTEGER, TEXT } = DataTypes

const quizQuestionSchema = {
  quizId: {
    type: INTEGER,
    allowNull: false,
  },
  questionText: {
    type: TEXT,
    allowNull: false,
  },
  explanation: {
    type: TEXT,
    allowNull: true,
  },
}

const QuizQuestion = sequelize.define('QuizQuestion', quizQuestionSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

QuizQuestion.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> QuizQuestion model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing QuizQuestion ❌')
  })

module.exports = QuizQuestion