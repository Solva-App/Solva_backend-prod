const storage = require('@firebase/storage')
const app = require('@firebase/app')
const firebaseKeys = require('../../firebase.json')
const CustomError = require('./error')

app.initializeApp(firebaseKeys.storage)

const bucket = storage.getStorage()

module.exports.fileUpload = async function (file, location) {
    try {
        const metadata = { contentType: file.mimetype }
        const ref = storage.ref(bucket, `${location}/${Math.round(Math.random() * 1e9)}-${file.originalname} `)
        const snapshort = await storage.uploadBytes(ref, file.buffer, metadata)
        return await storage.getDownloadURL(snapshort.ref)
    } catch (error) {
        console.log(error)
        return CustomError.internalServerError('Something went wrong', error)
    }
}
