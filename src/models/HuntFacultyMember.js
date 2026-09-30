const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db')
const { INTEGER, DATE } = DataTypes

const facultyMemberSchema = {
  faculty_id: { type: INTEGER, allowNull: false },
  user_id: { type: INTEGER, allowNull: false, unique: true },
  joined_at: { type: DATE, allowNull: false, defaultValue: DataTypes.NOW },
}

const HuntFacultyMember = sequelize.define('HuntFacultyMember', facultyMemberSchema, {
  tableName: 'hunt_faculty_members',
  timestamps: true,
  hooks: {
    beforeValidate(_facultyMember) { },
    beforeUpdate(_facultyMember) { },
    afterFind(_facultyMember) { },
  },
})

HuntFacultyMember.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> HuntFacultyMember model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing HuntFacultyMember ❌')
  })

module.exports = HuntFacultyMember