const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, TEXT, INTEGER, DATE } = DataTypes

const stageSchema = {
  season_id: { type: INTEGER, allowNull: false },
  stage_no: { type: INTEGER, allowNull: false },
  title: { type: STRING, allowNull: false },
  description: { type: TEXT, allowNull: true },
  unlock_time: { type: DATE, allowNull: true },
  points_reward: { type: INTEGER, allowNull: false, defaultValue: 0 },
}

const HuntStage = sequelize.define('HuntStage', stageSchema, {
  tableName: 'hunt_stages',
  timestamps: true,
  hooks: {
    beforeValidate(_stage) { },
    beforeUpdate(_stage) { },
    afterFind(_stage) { },
  },
})

HuntStage.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntStage model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntStage ❌')
  })

module.exports = HuntStage