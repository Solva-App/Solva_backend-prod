const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, TEXT } = DataTypes

const commentSchema = {
    freelancer: {
        type: INTEGER,
        allowNull: false,
    },
    name: {
        type: TEXT,
        allowNull: false,
    },
    title: {
        type: STRING,
    },
    message: {
        type: STRING,
        allowNull: false,
    },
}

const Comment = sequelize.define('Comment', commentSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Comment.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Comment model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Comment ❌')
    })

module.exports = Comment
