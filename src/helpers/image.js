const fs = require('fs')
const { randomUUID } = require('crypto')
const { default: axios } = require('axios')

module.exports.modifyStringImageFile = async function (base64String, path) {
    if (typeof base64String === 'string') {
        // extract keys from base64 string
        const mimetype = base64String.split(':')[1].split(';')[0]
        const ext = mimetype.split('/')[mimetype.split('/').length - 1]
        const originalname = Date.now().toString() + randomUUID() + Math.random() * 100000000 + '.' + ext

        // extract the base64 meta data
        base64String = base64String.split(';base64,').pop()
        const buffer = Buffer.from(base64String, 'base64')

        if (path) await fs.promises.writeFile(`${path}/${originalname}`, buffer)

        // return data
        return {
            originalname,
            fieldname: 'avatar',
            encoding: '7bit',
            path: path ? path + '/' + originalname : undefined,
            mimetype,
            size: buffer.length,
            base64String: `data:${mimetype};base64,` + buffer.toString('base64'),
            buffer: buffer,
        }
    } else {
        return {
            ...base64String,
            base64String: `data:${base64String.mimetype};base64,` + base64String.buffer.toString('base64'),
        }
    }
}

module.exports.urlToBuffer = async function (url, fieldname) {
    try {
        const response = await axios({
            method: 'get',
            url: url,
            // responseType: 'arraybuffer', // Return the response as an array buffer
        })

        // Convert the arraybuffer to a buffer
        const buffer = Buffer.from(response.data, 'binary')
        console.log(response.headers)
        const memetype = response.headers['content-type']
        return {
            originalname: response.headers['x-goog-meta-firebasestoragedownloadtokens'] + '.' + memetype.split('/')[1],
            memetype: memetype,
            buffer,
            size: Number(response.headers['content-length']),
        }
    } catch (error) {
        // console.error('Error fetching the file:', error.message)
        throw error
    }
}
