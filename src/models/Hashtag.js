const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db')

const hashtagSchema = {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postsCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
};

const Hashtag = sequelize.define('Hashtag', hashtagSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
});

// sync database
Hashtag.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> Hashtag model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing Hashtag ❌')
  })

module.exports = Hashtag;