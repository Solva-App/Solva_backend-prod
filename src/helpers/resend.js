const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_SEND);

module.exports.sendEmail = async function (recipient, subject, template) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Solva <noreply@team.solvaafrica.com>",
      to: recipient,
      subject,
      html: template,
    });

    if (error) throw error;
  } catch (err) {
    console.dir(err);
    console.error("Error sending resend email", err?.message);
    throw err;
  }
};
