const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, BOOLEAN, TEXT } = DataTypes

const freelancerSchema = {
  owner: {
    type: INTEGER,
    allowNull: false,
  },
  fullName: {
    type: STRING,
    allowNull: false,
  },
  categoryId: {
    type: INTEGER,
    allowNull: false,
  },
  bio: {
    type: TEXT,
    allowNull: false,
  },
  startingAmount: {
    type: STRING,
    allowNull: false,
  },
  portfolioLink: {
    type: STRING,
    defaultValue: 'awaiting-response',
  },
  phoneNumber: {
    type: STRING,
    allowNull: false,
  },
  location: {
    type: STRING,
    allowNull: false,
  },
  whatsappLink: {
    type: STRING,
    allowNull: false,
  },
  profilePic: {
    type: STRING,
    allowNull: false,
  },
}

const Freelancer = sequelize.define('Freelancer', freelancerSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Freelancer.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Freelancer model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Freelancer❌')
  })

module.exports = Freelancer
