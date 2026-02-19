const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, ENUM, INTEGER } = DataTypes

const flashcardSchema = {
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
    type: ENUM('open-ended', 'true/false'),
    defaultValue: 'open-ended'
  }
}

const Flashcard = sequelize.define('Flashcard', flashcardSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Flashcard.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Flashcard model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Flashcard ❌')
  })

module.exports = Flashcard
