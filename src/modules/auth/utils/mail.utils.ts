import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendResetCode = async (to: string, code: string) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Codigo de recuperacion",
    text: `Tu codigo de recuperacion es: ${code}`,
  });
};
