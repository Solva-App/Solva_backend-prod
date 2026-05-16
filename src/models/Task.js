const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')

const taskSchema = {
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sponsorName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sponsorLogo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bannerImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  requirements: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  guidelines: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  selectionCriteria: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  howToSubmit: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalPool: {
    type: DataTypes.DECIMAL(24, 2),
    allowNull: true,
    defaultValue: 0,
  },
  totalSpots: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  usedSpots: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'active', 'ended'),
  },
  payoutDistributed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}

const Task = sequelize.define('Task', taskSchema, {
  timestamps: true,
  hooks: {
    beforeValidate: (task) => {
      const now = new Date();
      if (task.startDate) {
        const start = new Date(task.startDate);
        if (start > now) {
          task.status = 'upcoming';
        } else if (task.endDate && new Date(task.endDate) < now) {
          task.status = 'ended';
        } else {
          task.status = 'active';
        }
      }
    },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
Task.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Task model synced')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Task')
  })

module.exports = Task
