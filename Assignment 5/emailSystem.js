const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: '127.0.0.1',
    port: 2525});

async function send2FACode(email, username, code){
    let message = `Your 2FA code is: ${code}`

    await transporter.sendMail({
        from: 'noreply@myapp.com',
        to: email,
        subject: '2FA Code',
        text: message
    })
    console.log(`2FA Code: ${code}, Email: ${email}`);
    return true;
}

async function alertSuspiciousActivity(email, attempts){
    let message = `We have detected suspicious activity on your account.`

    await transporter.sendMail({
        from: 'noreply@myapp.com',
        to: email,
        subject: 'Suspicious Activity Detected',
        text: message
    })
    console.log(`Suspicious activity detected. ${attempts} failed 2FA attempts.`)
    return true;
}

async function sendLockedAccountNotification(email){
    let message = `Your account has been locked due to 10 failed 2FA attempts`

    await transporter.sendMail({
        from: 'noreply@myapp.com',
        to: email,
        subject: 'Account Locked',
        text: message
    })
    console.log('Account has been locked')
    return true;
}

module.exports = {
    send2FACode,
    alertSuspiciousActivity,
    sendLockedAccountNotification
}
