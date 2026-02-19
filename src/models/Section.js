const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, TEXT, INTEGER } = DataTypes

const sectionSchema = {
  lessonId: {
    type: INTEGER, allowNull: false
  },
  heading: {
    type: STRING, allowNull: false
  },
  content: {
    type: TEXT, allowNull: false
  },
  order: {
    type: INTEGER, defaultValue: 0

  }
}

const Section = sequelize.define('Section', sectionSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Section.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Section model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Section ❌')
  })

module.exports = Section
