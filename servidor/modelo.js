const datos = require("./cad.js");
const bcrypt = require("bcrypt");
const correo = require("./email.js");

function Partida(codigo) {
    this.codigo = codigo;
    this.jugadores = [];
    this.maxJug = 2;
}

function Sistema(objConfig = {}) {
    this.cad = new datos.CAD();
    this.test = objConfig.test || false;
    this.partidas = {};
    this.usuarios = {};

    this.obtenerCodigo = function () {
        return (new Date()).getTime().toString().substr(-6);
    }

    this.crearPartida = function (email, callback) {
        let modelo = this;
        // 1. Buscamos al usuario en la BD
        this.cad.buscarUsuario({ "email": email }, function (usr) {
            if (usr) {
                let codigo = modelo.obtenerCodigo();
                let partida = new Partida(codigo);
                partida.jugadores.push(usr);
                modelo.partidas[codigo] = partida;
                callback(codigo); // Devolvemos el código
            } else {
                callback(-1); // Usuario no encontrado
            }
        });
    }

    this.unirAPartida = function (email, codigo, callback) {
        let modelo = this;
        let partida = this.partidas[codigo];

        if (!partida) {
            callback(-1);
            return;
        }

        this.cad.buscarUsuario({ "email": email }, function (usr) {
            if (usr && partida.jugadores.length < partida.maxJug) {
                partida.jugadores.push(usr);
                callback(codigo);
            } else {
                callback(-1);
            }
        });
    }

    this.obtenerPartidasDisponibles = function () {
        let lista = [];
        for (var e in this.partidas) {
            let partida = this.partidas[e];
            // comprobar si la partida está disponible (no está llena)
            if (partida.jugadores.length < partida.maxJug) {
                // obtener el email del creador de la partida (el primer jugador)
                let creadorEmail = partida.jugadores[0].email;
                // obtener el código de la partida
                let codigoPartida = partida.codigo;

                let obj = { "codigo": codigoPartida, "creador": creadorEmail };
                lista.push(obj);
            }
        }
        return lista;
    };
    this.obtenerLogs = function (callback) {
        this.cad.obtenerLogs(callback);
    }
}

// --- MÉTODOS DEL PROTOTIPO ---

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
                    if (!modelo.test) {
                        correo.enviarEmail(obj.email, obj.key, "Confirmar cuenta");
                    }
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
        } else {
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

// CORRECCIÓN AQUÍ: Usamos Sistema.prototype en lugar de 'this' suelto
Sistema.prototype.eliminarPartida = function (codigo, email) {
    if (this.partidas[codigo]) {
        const creador = this.partidas[codigo].jugadores[0] && this.partidas[codigo].jugadores[0].email;
        const creadorNorm = (creador || "").toString().trim().toLowerCase();
        const emailNorm = (email || "").toString().trim().toLowerCase();

        if (creadorNorm === emailNorm) {
            delete this.partidas[codigo];
            console.log("Partida " + codigo + " eliminada por el creador: " + email);
            return true;
        }
    }
    console.log("Intento fallido de borrar partida. Usuario no autorizado o partida inexistente.");
    return false;
}

module.exports.Sistema = Sistema;