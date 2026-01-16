const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

const PROJECT_ID = '375522614359';

async function accessMONGO_URI() {
    const name = `projects/${PROJECT_ID}/secrets/MONGO_URI/versions/latest`;
    try {
        const [version] = await client.accessSecretVersion({ name: name });
        const datos = version.payload.data.toString("utf8");
        console.log("[GV] Secreto 'MONGO_URI' obtenido.");
        return datos;
    } catch (err) {
        console.error("Error al obtener secreto 'MONGO_URI':", err);
        return null;
    }
}
async function accessCLAVECORREO() {
    const name = `projects/${PROJECT_ID}/secrets/CLAVECORREO/versions/latest`;
    try {
        const [version] = await client.accessSecretVersion({
            name: name,
        });
        console.log(`[GV] Secreto 'CLAVECORREO' (pass) obtenido.`);
        const datos = version.payload.data.toString("utf8");
        return datos;
    } catch (err) {
        console.error("Error al obtener secreto 'CLAVECORREO':", err);
        return null;
    }
}


async function accessCORREO() {
    const name = `projects/${PROJECT_ID}/secrets/CORREO/versions/latest`;
    try {
        const [version] = await client.accessSecretVersion({
            name: name,
        });
        console.log(`[GV] Secreto 'CORREO' (user) obtenido.`);
        const datos = version.payload.data.toString("utf8");
        return datos;
    } catch (err) {
        console.error("Error al obtener secreto 'CORREO':", err);
        return null;
    }
}


module.exports.obtenerOptions = async function (callback) {
    let options = { user: "", pass: "" };

    let pass = await accessCLAVECORREO();
    let user = await accessCORREO();

    options.user = user;
    options.pass = pass;

    console.log(`[GV] Options cargadas: User: ${options.user}, Pass: [Secreta, ${options.pass ? options.pass.length : 0} chars]`);

    callback(options);
}

module.exports.obtenerMongoURI = accessMONGO_URI;