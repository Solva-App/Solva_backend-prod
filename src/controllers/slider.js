const { Schema } = require('json-validace')
const image = require('./../helpers/image')
const Slide = require('../models/Slider')
const { OK } = require('http-status-codes')
const firebase = require('./../helpers/firebase')
const CustomError = require('../helpers/error')

module.exports.uploadSlideImage = async function (req, res, next) {
    try {
        const schema = new Schema({
            slides: { type: 'array', required: true },
        })

        req.body.slides = []
        let { body } = req
        let files = {
            slides: [],
        }

        for (let file of req.files) {
            file = file
            console.log(file.fieldname)
            files[file.fieldname].push(await image.modifyStringImageFile(body['slides'].length ? body[file.fieldname] : file))
        }

        const result = schema.validate({ ...body, ...files })
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        // const images = await Slide.findAll({})
        // if ([...images, ...files.slides].length > 4) {
        //     return next(CustomError.badRequest('You can only have 4 images'))
        // }

        // upload cert to firebase or aws bucket
        for (const file of files.slides) {
            const upload = await firebase.fileUpload(file, file.fieldname)
            if (upload instanceof CustomError) {
                return next(body.slides)
            }
            body[file.fieldname].push({
                size: file.size,
                url: upload,
            })
        }

        const slides = await Slide.bulkCreate(
            body.slides.map((slide) => ({
                owner: req.user.id,
                size: slide.size,
                url: slide.url,
            }))
        )

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'image uploaded successfully',
            data: slides,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getSlide = async function (req, res, next) {
    try {
        const slides = await Slide.findAll({
            limit: 4,
            order: [['createdAt', 'DESC']],
        })
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Fetch all slide',
            data: slides,
        })
    } catch (error) {
        return next(error)
    }
}

module.exports.deleteSlide = async function (req, res, next) {
    try {
        const slide = await Slide.destroy({ where: { id: req.params.id } })
        if (!slide) {
            return next(CustomError.badRequest('Invalid slide id'))
        }

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Slide delete successfully',
            data: slide,
        })
    } catch (error) {
        return next({ error })
    }
}
