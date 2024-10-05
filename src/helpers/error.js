const StatusCode = require('http-status-codes')

class CustomError {
    constructor(code, statusMessage, message, error) {
        this.status = code
        this.statusMessage = statusMessage
        this.message = message
        this.success = false
        this.error = error
    }

    static badRequest(message, error) {
        return new CustomError(StatusCode.BAD_REQUEST, 'Bad Request!', message, error)
    }

    static unsuportedMediaTypeError(message, error) {
        return new CustomError(StatusCode.UNSUPPORTED_MEDIA_TYPE, 'Unsupported Media Type', message, error)
    }

    static paymentRequiredError(message, error) {
        return new CustomError(StatusCode.PAYMENT_REQUIRED, 'Payment Required!', message, error)
    }

    static notFound(message, error) {
        return new CustomError(StatusCode.NOT_FOUND, 'Not Found!', message, error)
    }

    static unauthorizedRequest(message, error) {
        return new CustomError(StatusCode.UNAUTHORIZED, 'Unauthorized Request!', message, error)
    }

    static continueRequest(message, error) {
        return new Error(StatusCode.CONTINUE, 'Continue!', message, error)
    }

    static requestTimeout(message, error) {
        return new Error(StatusCode.REQUEST_TIMEOUT, 'Request Timeout', message, error)
    }

    static internalServerError(message, error) {
        return new CustomError(StatusCode.INTERNAL_SERVER_ERROR, 'Internal Server Error!', message, error)
    }

    static sessionExpired(message, error) {
        return new CustomError(440, 'Session Expired!', message, error)
    }

    static forbiddenRequest(message, error) {
        return new CustomError(StatusCode.FORBIDDEN, 'Forbidden Request', message, error)
    }

    static serviceUnavailable(message, error) {
        return new CustomError(StatusCode.SERVICE_UNAVAILABLE, 'Service Unavailable', message, error)
    }
}

module.exports = CustomError
