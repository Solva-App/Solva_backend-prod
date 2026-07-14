const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, FLOAT, BOOLEAN, ENUM } = DataTypes

const courseSchema = {
  name: {
    type: STRING,
    allowNull: false,
  },
  category: {
    type: STRING,
    allowNull: false,
  },
  difficulty: {
    type: STRING,
    allowNull: false,
  },
  description: {
    type: STRING,
    allowNull: false,
  },
  status: {
    type: ENUM('draft', 'published'),
    defaultValue: 'draft'
  },
  duration: {
    type: STRING,
    allowNull: true,
  },
  isFree: {
    type: BOOLEAN,
    defaultValue: true,
  },
  price: {
    type: FLOAT,
    allowNull: true,
  },
  discountPrice: {
    type: FLOAT,
    allowNull: true,
  },
  thumbnail: {
    type: STRING,
    allowNull: true,
  },
  hasCertificate: {
    type: BOOLEAN,
    defaultValue: false,
  },
  link: {
    type: STRING,
    allowNull: false,
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
