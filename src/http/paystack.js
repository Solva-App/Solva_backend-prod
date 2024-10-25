const axios = require('axios')

const headers = {
    'Caontent-Type': 'application/json',
}

// create wallet
module.exports.generatePaymentLink = async function () {
    try {
        const response = await axios({
            url: ``,
            method: 'get',
            headers: {
                ...headers,
            },
        })

        return response.data
    } catch (error) {
        // check for network or connection issue
        if (error.request && !error.response) return CustomError.internalServerError('Error connecting to server!')
        // console.log(error)
        return CustomError.internalServerError(error?.response?.data?.message, error.message || error.response.message || error.response.data || 'something went wrong!')
    }
}
