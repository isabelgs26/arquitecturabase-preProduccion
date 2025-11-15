const datos = require("./cad.js");
const bcrypt = require("bcrypt");
const correo = require("./email.js");

function Sistema(objConfig = {}) {
    this.cad = new datos.CAD();
    this.test = objConfig.test || false;
}

Sistema.prototype.inicializar = async function () {
    if (!this.test) {
        await this.cad.conectar();
    } else {
        console.log("Modo Test: Omitiendo conexión a MongoDB.");
    }
}

Sistema.prototype.usuarioGoogle = function (usr, callback) {
    this.cad.buscarOCrearUsuario(usr, callback);
}

Sistema.prototype.obtenerUsuarios = function (callback) {
    this.cad.buscarUsuarios({}, callback);
}

Sistema.prototype.registrarUsuario = function (obj, callback) {
    let modelo = this;
    if (!obj.nick) {
        obj.nick = obj.email;
    }

    this.cad.buscarUsuario({ email: obj.email }, function (usr) {
        if (!usr) {
            bcrypt.hash(obj.password, 10, function (err, hash) {
                if (err) {
                    console.error("Error al cifrar la contraseña:", err);
                    return callback({ "email": -1 });
                }
                obj.password = hash;

                obj.key = Date.now().toString();
                obj.confirmada = false;

                modelo.cad.insertarUsuario(obj, function (res) {
                    correo.enviarEmail(obj.email, obj.key, "Confirmar cuenta");
                    callback(res);
                });
            });
        } else {
            callback({ "email": -1 });
        }
    });
};

Sistema.prototype.confirmarUsuario = function (obj, callback) {
    let modelo = this;
    this.cad.buscarUsuario({ "email": obj.email, "confirmada": false, "key": obj.key }, function (usr) {
        if (usr) {
            usr.confirmada = true;

            modelo.cad.actualizarUsuario(usr, function (res) {
                callback({ "email": res.email });
            });
        }
        else {
            callback({ "email": -1 });
        }
    });
};

Sistema.prototype.loginUsuario = function (obj, callback) {
    this.cad.buscarUsuario({ email: obj.email, confirmada: true }, function (usr) {
        if (!usr) {
            return callback({ "email": -1 });
        }

        bcrypt.compare(obj.password, usr.password, function (err, ok) {
            if (ok) {
                callback(usr);
            } else {
                callback({ "email": -1 });
            }
        });
    });
};

Sistema.prototype.usuarioActivo = function (email, callback) {
    this.cad.buscarUsuario({ email: email }, function (usr) {
        if (usr) {
            callback({ activo: true });
        } else {
            callback({ activo: false });
        }
    });
}

Sistema.prototype.eliminarUsuario = function (email, callback) {
    this.cad.eliminarUsuario({ email: email }, function (res) {
        callback(res);
    });
}

Sistema.prototype.numeroUsuarios = function (callback) {
    this.cad.contarUsuarios({}, callback);
}

module.exports.Sistema = Sistema;