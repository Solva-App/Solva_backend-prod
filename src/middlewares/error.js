const CustomError = require('./../helpers/error')

module.exports = function (error, req, res, _next) {
    error = error.instance ? error.instance : error

    console.error('----------------------------------------------------------------')
    console.error('Error triggered by', req?.user?.username ?? ' none auth user', 'with ID of', req?.user?.id, '\n\n')
    console.error(req.body)
    console.error(error)
    console.error('----------------------------------------------------------------')

    if (error instanceof CustomError) {
        return res.status(error.status).send(error)
    }

    return res.status(500).send({
        message: 'something went wrong',
        status: 500,
        success: false,
        error: error.message,
    })
}
