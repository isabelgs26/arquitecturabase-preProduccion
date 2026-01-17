const nodemailer = require('nodemailer');
const gestor = require('./gestorVariables');

const url = process.env.URL_BASE || "http://localhost:3000/";

let transporter;

exports.inicializarTransporter = async function () {
    if (transporter) return;

    try {
        const opts = await new Promise((resolve) => {
            gestor.obtenerOptions(function (opt) {
                resolve(opt);
            });
        });

        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: opts.user,
                pass: opts.pass
            }
        });

        console.log("Transporter de Nodemailer inicializado con secretos de GCP.");
    } catch (error) {
        console.error("Fallo al inicializar el transporter:", error.message);
    }
};

module.exports.enviarEmail = async function (direccion, key, asunto) {
    if (!transporter) {
        await exports.inicializarTransporter();
        if (!transporter) {
            console.error("El transporter de correo no está disponible.");
            return;
        }
    }

    const confirmLink = `${url.replace(/\/$/, "")}/confirmarUsuario/${direccion}/${key}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #343a40; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Confirma tu Cuenta - Sistema</h1>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px;">¡Hola!</p>
                <p style="font-size: 16px;">Gracias por registrarte. Para terminar el proceso y asegurar que tu cuenta está lista, por favor, haz clic en el botón de confirmación de abajo:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${confirmLink}" 
                        style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Confirmar Cuenta
                    </a>
                </p>
                <p style="font-size: 16px; margin-bottom: 0;">El equipo del Sistema</p>
            </div>
            <div style="background-color: #f8f9fa; color: #6c757d; padding: 15px; text-align: center; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Sistema. Todos los derechos reservados.
            </div>
        </div>
    `;

    try {
        const result = await transporter.sendMail({
            from: transporter.options.auth.user,
            to: direccion,
            subject: asunto,
            text: 'Pulsa aquí para confirmar cuenta: ' + confirmLink,
            html: htmlContent
        });
        console.log("Email enviado con éxito a:", direccion);
        return result;
    } catch (error) {
        console.error("Error al enviar email:", error);
        throw error;
    }
};
