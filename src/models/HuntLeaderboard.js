const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { INTEGER } = DataTypes

const leaderboardSchema = {
  stage_id: { type: INTEGER, allowNull: false },
  faculty_id: { type: INTEGER, allowNull: false },
  total_score: { type: INTEGER, allowNull: false, defaultValue: 0 },
  rank: { type: INTEGER, allowNull: false, defaultValue: 0 },
}

const HuntLeaderboard = sequelize.define('HuntLeaderboard', leaderboardSchema, {
  tableName: 'hunt_leaderboards',
  timestamps: true,
  indexes: [{ unique: true, fields: ['stage_id', 'faculty_id'] }],
  hooks: {
    beforeValidate(_leaderboard) { },
    beforeUpdate(_leaderboard) { },
    afterFind(_leaderboard) { },
  },
})

HuntLeaderboard.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntLeaderboard model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntLeaderboard ❌')
  })

module.exports = HuntLeaderboard