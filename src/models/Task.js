const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')

const taskSchema = {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
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
    type: DataTypes.TEXT,
    allowNull: true,
  },
  guidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  selectionCriteria: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  howToSubmit: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  totalPool: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalSpots: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usedSpots: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'active', 'ended'),
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
