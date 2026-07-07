const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db')

const postCommentSchema = {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  profilePic: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}

const PostComment = sequelize.define('PostComment', postCommentSchema, {
  timestamps: true,
  hooks: {
    beforeValidate(_pl) { },
    beforeUpdate(_pl) { },
    afterFind(_pl) { },
  },
})

// sync database
PostComment.sync({ alter: true })
  .then((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('=> PostComment model synced ✔️')
  })
  .catch((_) => {
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production') console.log('Error while syncing PostComment ❌')
  })

module.exports = PostComment;