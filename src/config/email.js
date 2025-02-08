const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const path = require('path')

const handlebarOptions = {
    viewEngine: {
        partialsDir: path.join(__dirname, '..', 'templates', 'partials'),
        defaultLayout: false,
    },
    viewPath: path.join(__dirname, '..', 'templates'),
}

const emailConfiguration = function (address, password) {
    return {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        service: process.env.EMAIL_SERVICE,
        pool: true,
        secure: true,
        auth: {
            user: address,
            pass: password,
        },
        tls: {
            rejectUnauthrized: false,
        },
    }
}

// configure security email
const security = nodemailer.createTransport(emailConfiguration(process.env.SECURITY_EMAIL_ADDRESS, process.env.SECURITY_EMAIL_PASSWORD))

security.use('compile', hbs(handlebarOptions))

module.exports = {
    security,
}
