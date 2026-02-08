const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, ENUM } = DataTypes

const submissionSchema = {
  taskId: {
    type: STRING,
    allowNull: false,
  },
  userId: {
    type: STRING,
    allowNull: false,
  },
  link: {
    type: STRING,
    allowNull: false,
  },
  status: {
    type: ENUM('pending', 'approved', 'rejected'),
    defaultValue: "pending",
  }
}

const Submission = sequelize.define('Submission', submissionSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Submission.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Submission model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Submission ❌')
  })

module.exports = Submission

