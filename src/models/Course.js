const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, FLOAT, BOOLEAN } = DataTypes

const courseSchema = {
  name: {
    type: STRING,
    allowNull: false,
  },
  duration: {
    type: STRING,
    allowNull: true,
  },
  isFree: {
    type: BOOLEAN,
    defaultValue: true,
  },
  cost: {
    type: FLOAT,
    allowNull: true,
  },
  link: {
    type: STRING,
    allowNull: true,
  }
}

const Course = sequelize.define('Course', courseSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Course.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Course model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Course ❌')
  })

module.exports = Course
