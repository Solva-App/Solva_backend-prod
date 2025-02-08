const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, BOOLEAN } = DataTypes

const slideSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    size: {
        type: INTEGER,
        allowNull: false,
    },
    url: {
        type: STRING,
        allowNull: false,
    },
}

const Slide = sequelize.define('Slide', slideSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(_pl) {},
        beforeUpdate(_pl) {},
        afterFind(_pl) {},
    },
})

// sync database
Slide.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Slide model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing slide ❌')
    })

module.exports = Slide
