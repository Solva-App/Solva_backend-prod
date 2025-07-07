const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER } = DataTypes

const socketSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    socket: {
        type: STRING,
        allowNull: false,
    },
}

const Socket = sequelize.define('Socket', socketSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Socket.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Socket model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Socket ❌')
    })

module.exports = Socket
