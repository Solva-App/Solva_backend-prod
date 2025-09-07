const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, TEXT, BOOLEAN } = DataTypes

const projectSchema = {
  owner: {
    type: INTEGER,
    allowNull: false,
  },
  name: {
    type: STRING,
    allowNull: true,
  },
  description: {
    type: TEXT,
    allowNull: true,
  },
  requiresApproval: {
    type: BOOLEAN,
    defaultValue: true,
  },
  // uploadedToUser: {
  //   type: BOOLEAN,
  //   defaultValue: false,
  // }
}

const Project = sequelize.define('Project', projectSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Project.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Project model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Project ❌')
  })

module.exports = Project
