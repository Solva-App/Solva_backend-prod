const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, INTEGER, TEXT } = DataTypes

const jobSchema = {
    owner: {
        type: INTEGER,
        allowNull: false,
    },
    status: {
        type: TEXT,
        allowNull: false,
    },
    title: {
        type: STRING,
    },
    description: {
        type: STRING,
        allowNull: false,
    },
}

const Job = sequelize.define('Job', jobSchema, {
    timestamps: true,
    hooks: {
        beforeValidate(payload) {
            try {
                payload.status = JSON.parse(payload.status)
            } catch (e) {}

            if (!Array.isArray(payload.status)) {
                payload.status = new Array()
            }
            payload.status = JSON.stringify(payload.status)
        },
        // beforeUpdate(payload) {
        // },
        afterFind(payload) {
            if (!Array.isArray(payload)) payload = [payload]

            payload = payload.map((pl) => {
                pl.status = JSON.parse(pl.status)
            })
        },
    },
})

// sync database
Job.sync({ alter: true })
    .then((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Job model synced ✔️')
    })
    .catch((_) => {
        if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing AccessToken ❌')
    })

module.exports = Job
