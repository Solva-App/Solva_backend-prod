const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, ENUM, INTEGER } = DataTypes

const lessonSchema = {
  owner: {
    type: INTEGER,
    allowNull: true,
  },
  topic: {
    type: STRING,
    allowNull: true,
  },
  difficulty: {
    type: ENUM('easy', 'intermediate', 'advanced'),
    defaultValue: 'easy'
  },
  type: {
    type: ENUM('deep-dive', 'standard'),
    defaultValue: 'standard'
  }
}

const Lesson = sequelize.define('Lesson', lessonSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Lesson.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Lesson model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Lesson ❌')
  })

module.exports = Lesson
