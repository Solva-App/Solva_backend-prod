const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, TEXT, DATE } = DataTypes

const seasonSchema = {
  title: { type: STRING, allowNull: false },
  description: { type: TEXT, allowNull: true },
  status: { type: STRING, allowNull: false, defaultValue: 'draft' },
  start_date: { type: DATE, allowNull: true },
  end_date: { type: DATE, allowNull: true },
}

const HuntSeason = sequelize.define('HuntSeason', seasonSchema, {
  tableName: 'hunt_seasons',
  timestamps: true,
  hooks: {
    beforeValidate(_season) { },
    beforeUpdate(_season) { },
    afterFind(_season) { },
  },
})

HuntSeason.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntSeason model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntSeason ❌')
  })

module.exports = HuntSeason