const multer = require('multer')
const fs = require('fs')
const uuid = require('uuid')

// multer configuration
const storage = multer.memoryStorage({
    filename: function (req, file, callback) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + uuid.v4() + '.' + file.mimetype.split('/')[1]
        callback(null, file.fieldname + '-' + uniqueSuffix)
    },
})

const upload = multer({ storage: storage })
module.exports = upload
