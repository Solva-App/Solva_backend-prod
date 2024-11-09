const { security } = require('../config/email')

module.exports.emailVerification = async function ({ user, url }) {
    try {
        security.sendMail({
            from: `Solva ${security.options.auth.user}`,
            to: user.email,
            subject: `Security Alert 》Password Reset`,
            template: 'forgotten_password_otp_email',
            context: {
                email: user.email,
                user: user,
                url: url,
            },
        })
        console.error(`Email sent to: ${user.email}`)
    } catch (error) {
        console.error('Error sending email', error)
    }
}
