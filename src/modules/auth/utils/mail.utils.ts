import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

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
  const html = await renderTemplate("reset-password", {
    code,
    ttlMinutes: "10",
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Codigo de recuperacion",
    html,
    text: `Tu codigo de recuperacion es: ${code}`,
  });
};

/*
 * Utils para enviar correos, en este caso para enviar el codigo de recuperacion de contraseña. Se puede usar nodemailer con un servicio SMTP (como Gmail) o con servicios de terceros como SendGrid, Mailgun, etc. En este ejemplo se usa nodemailer con Gmail, pero en produccion es recomendable usar un servicio dedicado para evitar problemas de entrega y limites de envio.
 * La funcion sendResetCode recibe el email del destinatario y el codigo de recuperacion, y envia un correo con esa informacion. Se pueden crear otras funciones similares para enviar otros tipos de correos (bienvenida, confirmacion, etc).
 * Es importante manejar los errores que puedan ocurrir al enviar el correo, y tambien considerar la seguridad (no exponer las credenciales del servicio de correo, usar variables de entorno, etc).
 */

const renderTemplate = async (
  templateName: string,
  vars: Record<string, string>,
) => {
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    `${templateName}.html`,
  );
  let html = await fs.readFile(templatePath, "utf-8");
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
};
