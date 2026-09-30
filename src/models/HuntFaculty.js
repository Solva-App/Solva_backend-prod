const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { STRING, TEXT, INTEGER, BOOLEAN } = DataTypes

const facultySchema = {
  season_id: { type: INTEGER, allowNull: false },
  name: { type: STRING, allowNull: false },
  description: { type: TEXT, allowNull: true },
  access_code: { type: STRING, allowNull: true, unique: true },
  representative_user_id: { type: INTEGER, allowNull: true },
  team_contact_name: { type: STRING, allowNull: true },
  crest_logo: { type: STRING, allowNull: true },
  is_activated: { type: BOOLEAN, allowNull: false, defaultValue: false },
}

const HuntFaculty = sequelize.define('HuntFaculty', facultySchema, {
  tableName: 'hunt_faculties',
  timestamps: true,
  hooks: {
    beforeValidate(_faculty) { },
    beforeUpdate(_faculty) { },
    afterFind(_faculty) { },
  },
})

HuntFaculty.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntFaculty model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntFaculty ❌')
  })

module.exports = HuntFaculty