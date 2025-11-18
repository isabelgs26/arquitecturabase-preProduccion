const datos = require("./cad.js");
const bcrypt = require("bcrypt");
const correo = require("./email.js");

function Sistema(objConfig = {}) {
    this.cad = new datos.CAD();
    this.test = objConfig.test || false;
    this.partidas = {}
    this.usuarios = {};
    this.obtenerCodigo = function () {
        return (new Date()).getTime().toString().substr(-6);
    }

    this.crearPartida = function (email) {
        // obtener el objeto usuario con email = “email”
        let usr = this.usuarios[email]; // USA 'this.usuarios'

        // si existe, entonces:
        if (usr) {
            // obtener un código único
            let codigo = this.obtenerCodigo();

            // crear partida con ese código
            let partida = new Partida(codigo);

            // asignar al usuario como jugador de la partida
            partida.jugadores.push(usr);

            // Guardar la partida en la colección del sistema
            this.partidas[codigo] = partida;

            // Devolver el código
            return codigo;
        }

        // Si el usuario no existe, devolver -1 (o algo que indique error)
        return -1;
    }
    this.unirAPartida = function (email, codigo) {
        // obtener el usuario cuyo email es “email”
        let usr = this.usuarios[email]; // USA 'this.usuarios'

        // obtener la partida cuyo código es “codigo”
        let partida = this.partidas[codigo];

        // si existen el usuario y la partida, entonces
        if (usr && partida) {

            // Comprobar si la partida no está llena
            if (partida.jugadores.length < partida.maxJug) {
                // asignar al usuario a la partida
                partida.jugadores.push(usr);
                return codigo; // Éxito
            }
            // (Opcional) en caso contrario, mostrar un mensaje (partida llena)
            else {
                console.log("La partida está llena");
                return -1; // Error: partida llena
            }

        }
        // en caso contrario, mostrar un mensaje (usuario o partida no existen)
        else {
            console.log("Usuario o partida no encontrados");
            return -1; // Error: no existen
        }
    }
    //ejercicio
    this.obtenerPartidasDisponibles = function () {
        let lista = [];
        for (var e in this.partidas) {
            let partida = this.partidas[e];

            // comprobar si la partida está disponible (no está llena)
            if (partida.jugadores.length < partida.maxJug) {

                // obtener el email del creador de la partida (el primer jugador)
                let creadorEmail = partida.jugadores[0].email;

                // obtener el código de la partida
                let codigoPartida = partida.codigo; // o simplemente 'e'

                // crear un objeto JSON con esos dos datos
                let obj = { "codigo": codigoPartida, "creador": creadorEmail };

                // meter el objeto JSON en el array lista
                lista.push(obj);
            }
        }
        return lista;
    };
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

// AÑADIDO DESDE EL CLIENTE
function Usuario(usr) {
    this.nick = usr.nick;
    this.email = usr.email;
    this.nombre = usr.nombre;
}
// AÑADIDO DESDE EL CLIENTE
function Partida(codigo) {
    this.codigo = codigo;
    this.jugadores = [];
    this.maxJug = 2;
}

// AÑADIDO DESDE EL CLIENTE
// Método para añadir usuarios en la prueba (basado en el test-modelo.html)
Sistema.prototype.agregarUsuario = function (usr) {
    this.usuarios[usr.email] = usr;
}

module.exports.Sistema = Sistema;