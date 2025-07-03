const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, BOOLEAN } = DataTypes

const notificationSchema = {
  userId: {
    type: INTEGER,
    allowNull: false
  },
  title: {
    type: STRING,
    allowNull: false
  },
  message: {
    type: TEXT,
    allowNull: false
  },
  isRead: {
    type: BOOLEAN,
    defaultValue: false
  }
};

const Notification = sequelize.define('Notification', notificationSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Notification.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Notification model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Notification ❌')
    })

module.exports = Notification
