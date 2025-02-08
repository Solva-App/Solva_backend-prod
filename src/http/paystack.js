const axios = require('axios')
const CustomError = require('../helpers/error')

const headers = {
    'Caontent-Type': 'application/json',
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
}

const baseurl = process.env.PAYSTACK_BASEURL

// create wallet
module.exports.generatePaymentLink = async function (body) {
    try {
        const request = {
            url: `${baseurl}/transaction/initialize`,
            method: 'POST',
            headers: {
                ...headers,
            },
            data: body,
        }
        console.log(request)
        const response = await axios(request)
        return response.data
    } catch (error) {
        // check for network or connection issue
        if (error.request && !error.response) return CustomError.internalServerError('Error connecting to server!')
        // console.log(error)
        return CustomError.internalServerError(error?.response?.data?.message, error.message || error.response.message || error.response.data || 'something went wrong!')
    }
}

module.exports.chargeCard = async function (body) {
    try {
        const request = {
            url: `${baseurl}/transaction/charge_authorization`,
            method: 'POST',
            headers: {
                ...headers,
            },
            data: body,
        }
        console.log(request)
        const response = await axios(request)
        return response.data
    } catch (error) {
        // check for network or connection issue
        if (error.request && !error.response) return CustomError.internalServerError('Error connecting to server!')
        // console.log(error)
        return CustomError.internalServerError(error?.response?.data?.message, error.message || error.response.message || error.response.data || 'something went wrong!')
    }
}
