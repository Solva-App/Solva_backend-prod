const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, ENUM, INTEGER } = DataTypes

const quizSchema = {
  owner: {
    type: INTEGER,
    allowNull: true,
  },
  topic: {
    type: STRING,
    allowNull: true,
  },
  difficulty: {
    type: ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium'
  },
  type: {
    type: STRING,
    defaultValue: 'multiple_choice'
  }
}

const Quiz = sequelize.define('Quiz', quizSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Quiz.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Quiz model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Quiz ❌')
  })

module.exports = Quiz
