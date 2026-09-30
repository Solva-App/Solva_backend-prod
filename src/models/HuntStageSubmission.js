const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { INTEGER, TEXT, BOOLEAN } = DataTypes

const stageSubmissionSchema = {
  stage_id: { type: INTEGER, allowNull: false },
  challenge_id: { type: INTEGER, allowNull: false },
  faculty_id: { type: INTEGER, allowNull: false },
  submitted_by: { type: INTEGER, allowNull: false },
  answer_provided: { type: TEXT, allowNull: false },
  is_correct: { type: BOOLEAN, allowNull: false, defaultValue: false },
  score_awarded: { type: INTEGER, allowNull: false, defaultValue: 0 },
}

const HuntStageSubmission = sequelize.define('HuntStageSubmission', stageSubmissionSchema, {
  tableName: 'hunt_stage_submissions',
  timestamps: true,
  hooks: {
    beforeValidate(_submission) { },
    beforeUpdate(_submission) { },
    afterFind(_submission) { },
  },
})

HuntStageSubmission.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntStageSubmission model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntStageSubmission ❌')
  })

module.exports = HuntStageSubmission