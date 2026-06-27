const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const postLikeSchema = {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
};

const PostLike = sequelize.define('PostLike', postLikeSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) {},
    beforeUpdate(_pl) {},
    afterFind(_pl) {},
  },
});

PostLike.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> PostLike model synced ✔️');
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing PostLike ❌');
  });

module.exports = PostLike;
