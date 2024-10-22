const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER } = DataTypes

const documentSchema = {
    model: {
        type: STRING,
        allowNull: true,
    },
    modelId: {
        type: INTEGER,
        allowNull: false,
    },
    url: {
        type: STRING,
        allowNull: false,
    },
    size: {
        type: INTEGER,
        allowNull: false,
    },
}

const Document = sequelize.define('Document', documentSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Document.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Document model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Document ❌')
    })

module.exports = Document
