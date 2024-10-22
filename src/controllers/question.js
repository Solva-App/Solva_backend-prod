const { Schema } = require('json-validace')
const CustomError = require('../helpers/error')
const image = require('./../helpers/image')
const firebase = require('./../helpers/firebase')
const Project = require('../models/Project')
const Document = require('../models/Document')
const { OK } = require('http-status-codes')
const Question = require('../models/Question')

module.exports.createPastQuestion = async function (req, res, next) {
    try {
        const schema = new Schema({
            name: { type: 'string', required: true },
            description: { type: 'string', required: true },
            documents: { type: 'array', required: false },
        })
        req.body.documents = []

        let { body } = req
        let files = {
            documents: [],
        }

        for (let file of req.files) {
            file = file
            files[file.fieldname].push(await image.modifyStringImageFile(body[file.fieldname].length ? body[file.fieldname] : file))
        }

        const result = schema.validate({ ...body, ...files })
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        // upload cert to firebase or aws bucket
        for (const file of files.documents) {
            const upload = await firebase.fileUpload(file, file.fieldname)
            if (upload instanceof CustomError) {
                return next(body.documents)
            }
            body[file.fieldname].push({
                size: file.size,
                url: upload,
            })
        }

        const question = await Question.create({
            name: body.name,
            description: body.description,
            owner: req.user.id,
        })

        const documents = await Document.bulkCreate(
            body.documents.map((d) => {
                return {
                    model: 'question',
                    modelId: question.id,
                    url: d.url,
                    size: d.size,
                }
            })
        )

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Question created successfully',
            data: {
                question,
                documents,
            },
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getPastQuestion = async function (_req, res, next) {
    try {
        let questions = await Project.findAll()
        questions = questions.map(async (question) => {
            const docs = await Document.findAll({ where: { model: 'question', modelId: question.id } })
            return {
                question: question,
                document: docs,
            }
        })

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            data: await Promise.all(questions),
        })
    } catch (error) {
        return next({ error })
    }
}
