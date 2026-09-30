const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { INTEGER, TEXT, STRING } = DataTypes

const challengeSchema = {
  stage_id: { type: INTEGER, allowNull: false },
  question_hint: { type: TEXT, allowNull: false },
  challenge_type: { type: STRING, allowNull: false },
  correct_answer: { type: TEXT, allowNull: false },
  points: { type: INTEGER, allowNull: false, defaultValue: 0 },
}

const HuntChallenge = sequelize.define('HuntChallenge', challengeSchema, {
  tableName: 'hunt_challenges',
  timestamps: true,
  hooks: {
    beforeValidate(_challenge) { },
    beforeUpdate(_challenge) { },
    afterFind(_challenge) { },
  },
})

HuntChallenge.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntChallenge model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntChallenge ❌')
  })

module.exports = HuntChallenge