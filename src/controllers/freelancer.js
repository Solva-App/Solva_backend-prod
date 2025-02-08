const CustomError = require('../helpers/error')
const Freelancer = require('../models/Freelancer')
const { Schema } = require('json-validace')
const image = require('./../helpers/image')
const { OK } = require('http-status-codes')
const User = require('../models/User')
const Comment = require('../models/Comment')
const firebase = require('./../helpers/firebase')

module.exports.becomeFreelancer = async function (req, res, next) {
    try {
        const schema = new Schema({
            fullName: { type: 'string', required: true },
            categoryId: { type: 'string', required: true },
            bio: { type: 'string', required: true },
            startingAmount: { type: 'string', required: true },
            portfolioLink: { type: 'string', required: true },
            phoneNumber: { type: 'string', required: true },
            whatsappLink: { type: 'string', required: true },
            profilePic: {
                type: 'object',
                required: true,
                $_data: {
                    fieldname: 'string',
                    originalname: 'string',
                    encoding: 'string',
                    mimetype: 'string',
                    buffer: 'object',
                    size: 'number',
                    base64String: 'string',
                },
            },
        })

        let { user, body, file } = req
        body.profilePic = await image.modifyStringImageFile(body?.profilePic?.length ? body.profilePic : file)

        const result = schema.validate(body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        if (user.isAdmin) {
            return next(CustomError.unauthorizedRequest('Admins are restricted from using this endpoint'))
        }

        // upload image to cloud
        const link = await firebase.fileUpload(file, file.fieldname)
        if (link instanceof CustomError) {
            return next(link)
        }

        body.profilePic = link
        if (await Freelancer.findOne({ where: { owner: req.user.id } })) {
            return next(CustomError.badRequest("you're already a freelancer"))
        }

        const freelancer = await Freelancer.create({
            owner: req.user.id,
            ...body,
        })

        req.user.role = 'freelancer'
        await req.user.save()

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Freelancer created successful',
            data: freelancer,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getFreelancers = async function (req, res, next) {
    try {
        const query = req.query.category != undefined ? { categoryId: Number(req.query.category) } : {}
        const freelancers = await Freelancer.findAll({ where: query })

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'freelancers fetched successfully',
            data: freelancers,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getFreelancer = async function (req, res, next) {
    try {
        const freelancer = await Freelancer.findByPk(req.params.id)
        if (!freelancer) {
            return next(CustomError.badRequest(''))
        }

        const user = await User.findByPk(freelancer.owner)
        console.log(freelancer.owner)

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Get Freelancer',
            data: {
                ...user.dataValues,
                email: undefined,
                password: undefined,
                freelancer,
                comments: await Comment.findAll({ where: { freelancer: freelancer.id } }),
            },
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.addComment = async function (req, res, next) {
    try {
        const schema = new Schema({
            title: { type: 'string', required: true },
            name: { type: 'string', required: true },
            message: { type: 'string', required: true },
        })
        const result = schema.validate(req.body)

        const body = result.data

        const freelancer = await Freelancer.findByPk(req.params.freelancerId)
        if (!freelancer) {
            return next(CustomError.badRequest('Invalid freelancer id'))
        }

        const comment = await Comment.create({
            freelancer: req.params.freelancerId,
            ...body,
        })

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Comment created successfully',
            data: comment,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getCatigories = async function (_req, res, next) {
    try {
        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'catigory fetched successfully',
            data: [
                {
                    id: 1,
                    title: 'Graphic Design',
                    description: 'Logo & Brand Identity, Gaming',
                },
                {
                    id: 2,
                    title: 'Digital Marketing',
                    description: 'Social Media, Marketing, SEO',
                },
                {
                    id: 3,
                    title: 'Programming & Tech',
                    description: 'Website Development, Maintainance',
                },
                {
                    id: 4,
                    title: 'Video & Animation',
                    description: 'Video Editing, Video Ads & Commercials',
                },
            ],
        })
    } catch (error) {
        return next({ error })
    }
}
