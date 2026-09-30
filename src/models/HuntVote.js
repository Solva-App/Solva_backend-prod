const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { INTEGER, STRING, ENUM, DATE } = DataTypes

const huntVoteSchema = {
  season_id: {
    type: INTEGER,
    allowNull: false,
  },
  faculty_id: {
    type: INTEGER,
    allowNull: false,
  },
  user_id: {
    type: INTEGER,
    allowNull: false,
  },
  vote_count: {
    type: INTEGER,
    allowNull: false,
  },
  amount: {
    type: INTEGER,
    allowNull: false,
  },
  reference: {
    type: STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: ENUM('pending', 'paid', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  paid_at: {
    type: DATE,
    allowNull: true,
  },
}

const HuntVote = sequelize.define('HuntVote', huntVoteSchema, {
  tableName: 'hunt_votes',
  timestamps: true,
  hooks: {
    beforeValidate(_vote) { },
    beforeUpdate(_vote) { },
    afterFind(_vote) { },
  },
})

HuntVote.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntVote model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntVote ❌')
  })

module.exports = HuntVote