const nodemailer = require('nodemailer');

let transporter;

async function initMailer() {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    console.log('✉️ Mailer configured with Real Email credentials.');
  } else {
    return new Promise((resolve, reject) => {
      nodemailer.createTestAccount((err, account) => {
        if (err) {
          console.error('Failed to create a testing account. ' + err.message);
          return reject(err);
        }
        transporter = nodemailer.createTransport({
          host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass }
        });
        console.log(`\n✉️ Mailer configured with Ethereal Email (Test Mode). Check console logs for email links.\n`);
        resolve(transporter);
      });
    });
  }
  return transporter;
}

async function sendMail(options) {
  const t = await initMailer();
  const info = await t.sendMail(options);
  if (info.messageId && !process.env.EMAIL_USER) {
    console.log(`\n📧 Email Sent to ${options.to}: ${options.subject}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}\n`);
  }
  return info;
}

module.exports = { sendMail };
