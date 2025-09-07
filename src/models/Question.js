const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, BOOLEAN } = DataTypes

const questionSchema = {
  owner: {
    type: INTEGER,
    allowNull: false,
  },
  title: {
    type: STRING,
    allowNull: true,
  },
  university: {
    type: STRING,
    alowNull: true,
  },
  faculty: {
    type: STRING,
    allowNull: true,
  },
  department: {
    type: STRING,
    allowNull: true,
  },
  courseCode: {
    type: STRING,
    allowNull: true,
  },
  requiresApproval: {
    type: BOOLEAN,
    defaultValue: true,
  },
  uploadedToUser: {
    type: BOOLEAN,
    defaultValue: false,
  }
}

const Question = sequelize.define('Question', questionSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
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
