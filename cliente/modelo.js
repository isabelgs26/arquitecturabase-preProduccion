const datos = require("./cad.js");
const bcrypt = require("bcrypt");
const correo = require("./email.js");

const ERR_PARTIDA_NO_EXISTE = -1;
const ERR_USUARIO_NO_CREADOR = -2;
const ERR_ESTADO_INCORRECTO = -3;
const ERR_ACTUALIZACION_FALLIDA = -4;

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

    this.obtenerCodigo = () => Math.floor(Math.random() * 900000 + 100000).toString();

    // Método para agregar usuario en modo TEST
    this.agregarUsuario = function (usr) {
        if (this.test && typeof usr === 'object' && usr.nick && usr.email) {
            this.usuarios[usr.email] = usr;
            return usr;
        }
        return null;
    };

    this.crearPartida = function (email, callback) {
        // Modo TEST: retorna directamente sin callback
        if (this.test && !callback) {
            let usr = this.usuarios[email];
            if (usr) {
                let codigo = this.obtenerCodigo();
                let partida = {
                    codigo: codigo,
                    jugadores: [usr],
                    maxJug: 2,
                    creador: email,
                    fechaCreacion: new Date(),
                    estado: "incompleta",
                    puntuaciones: {}
                };
                this.partidas[codigo] = partida;
                return codigo;
            }
            return -1;
        }

        // Modo NORMAL: usa callback
        let modelo = this;
        this.cad.buscarUsuario({ "email": email }, function (usr) {
            if (usr) {
                let codigo = modelo.obtenerCodigo();
                let partida = {
                    codigo: codigo,
                    jugadores: [usr],
                    maxJug: 2,
                    creador: email,
                    fechaCreacion: new Date(),
                    estado: "incompleta",
                    puntuaciones: {}
                };
                modelo.cad.insertarPartida(partida, function (resultado) {
                    if (resultado) {
                        modelo.cad.insertarLog({
                            "tipo-operacion": "crearPartida",
                            "usuario": email,
                            "fecha-hora": new Date()
                        }, () => { });
                        callback(codigo);
                    } else {
                        callback(ERR_PARTIDA_NO_EXISTE);
                    }
                });

            } else {
                callback(-1);
            }
        });
    };



    this.unirAPartida = function (email, codigo, callback) {
        // Modo TEST: retorna directamente sin callback
        if (this.test && !callback) {
            let partida = this.partidas[codigo];
            if (!partida) return -1;
            if (partida.jugadores.length >= partida.maxJug) return -1;

            let usr = this.usuarios[email];
            if (!usr) return -1;

            partida.jugadores.push(usr);
            if (partida.jugadores.length >= partida.maxJug) {
                partida.estado = "completa";
                partida.puntuaciones = {};
                partida.jugadores.forEach(j => {
                    partida.puntuaciones[j.email] = 0;
                });
            }
            return codigo;
        }

        // Modo NORMAL: usa callback
        let modelo = this;
        this.cad.obtenerPartida(codigo, function (partidaBD) {
            if (!partidaBD) {
                callback(-1);
                return;
            }

            if (partidaBD.jugadores.length >= partidaBD.maxJug) {
                callback(-1);
                return;
            }

            modelo.cad.buscarUsuario({ "email": email }, function (usr) {
                if (!usr) {
                    callback(-1);
                    return;
                }

                partidaBD.jugadores.push(usr);

                let actualizacion = {
                    jugadores: partidaBD.jugadores
                };

                if (partidaBD.jugadores.length >= partidaBD.maxJug) {
                    actualizacion.estado = "completa";
                    actualizacion.puntuaciones = {};
                    partidaBD.jugadores.forEach(jugador => {
                        actualizacion.puntuaciones[jugador.email] = 0;
                    });
                    console.log("Partida " + codigo + " completada. Estado actualizado a 'completa'.");
                }

                modelo.cad.actualizarPartida(codigo, actualizacion, function (updated) {
                    if (updated) {
                        modelo.cad.insertarLog({
                            "tipo-operacion": "unirAPartida",
                            "usuario": email,
                            "fecha-hora": new Date()
                        }, () => { });
                        callback(codigo);
                    } else {
                        callback(-1);
                    }
                });
            });
        });
    };

    this.obtenerPartidasDisponibles = function (callback) {
        // Modo TEST: retorna directamente sin callback
        if (this.test && !callback) {
            let disponibles = [];
            for (let codigo in this.partidas) {
                let partida = this.partidas[codigo];
                if (partida.estado === "incompleta") {
                    disponibles.push({
                        codigo: codigo,
                        creador: partida.creador,
                        jugadoresActuales: partida.jugadores.length,
                        maxJugadores: partida.maxJug
                    });
                }
            }
            return disponibles;
        }

        // Modo NORMAL: usa callback
        let modelo = this;
        this.cad.obtenerPartidasDisponibles(function (partidasBD) {
            let lista = [];
            partidasBD.forEach(function (partida) {
                let obj = {
                    "codigo": partida.codigo,
                    "creador": partida.creador,
                    "jugadoresActuales": partida.jugadores.length,
                    "maxJugadores": partida.maxJug
                };
                lista.push(obj);
            });
            callback(lista);
        });
    };
    this.obtenerLogs = function (callback) {
        this.cad.obtenerLogs(callback);
    }

    this.actualizarPuntuacion = function (codigo, email, puntos, callback) {
        let modelo = this;

        this.cad.obtenerPartida(codigo, function (partida) {
            if (!partida || partida.estado !== "en juego") {
                callback(-1);
                return;
            }

            let actualizacion = {
                [`puntuaciones.${email}`]: puntos
            };

            modelo.cad.actualizarPartida(codigo, actualizacion, function (updated) {
                if (updated) {
                    callback(1);
                } else {
                    callback(-1);
                }
            });
        });
    }

    this.finalizarPartida = function (codigo, callback) {
        let modelo = this;

        let actualizacion = {
            estado: "finalizada",
            fechaFin: new Date()
        };

        modelo.cad.actualizarPartida(codigo, actualizacion, function (updated) {
            if (updated) {
                modelo.cad.insertarLog({
                    "tipo-operacion": "finalizarPartida",
                    "usuario": "sistema",
                    "fecha-hora": new Date()
                }, () => { });
                callback(1);
            } else {
                callback(-1);
            }
        });
    }

    this.obtenerEstadisticasPartida = function (codigo, callback) {
        this.cad.obtenerPartida(codigo, function (partida) {
            if (!partida) {
                callback(null);
                return;
            }

            let estadisticas = {
                codigo: partida.codigo,
                estado: partida.estado,
                creador: partida.creador,
                jugadores: partida.jugadores.map(j => j.email),
                puntuaciones: partida.puntuaciones || {},
                fechaCreacion: partida.fechaCreacion,
                fechaFin: partida.fechaFin
            };

            callback(estadisticas);
        });
    }

    this.iniciarJuego = function (codigo, email, callback) {
        let modelo = this;

        this.cad.obtenerPartida(codigo, function (partida) {
            if (!partida) {
                console.log("Error iniciarJuego: Partida no encontrada");
                callback(-1);
                return;
            }

            if (partida.creador !== email) {
                console.log("Error iniciarJuego: Usuario no es creador (" + email + " vs " + partida.creador + ")");
                callback(ERR_USUARIO_NO_CREADOR);
                return;
            }

            if (partida.estado !== "completa") {
                console.log("Error iniciarJuego: Estado incorrecto (" + partida.estado + "). Jugadores: " + partida.jugadores.length);
                callback(ERR_ESTADO_INCORRECTO);
                return;
            }

            let actualizacion = {
                estado: "en juego",
                fechaInicio: new Date()
            };

            modelo.cad.actualizarPartida(codigo, actualizacion, function (updated) {
                if (updated) {
                    modelo.cad.insertarLog({
                        "tipo-operacion": "iniciarJuego",
                        "usuario": email,
                        "fecha-hora": new Date()
                    }, () => { });
                    callback(1);
                } else {
                    callback(ERR_ACTUALIZACION_FALLIDA);
                }
            });
        });
    }




}


Sistema.prototype.inicializar = async function () {
    if (!this.test) {
        await this.cad.conectar();
    } else {
        console.log("Modo Test: Omitiendo conexión a MongoDB.");
    }
}

Sistema.prototype.usuarioGoogle = function (usr, callback) {
    let modelo = this;
    this.cad.buscarOCrearUsuario(usr, function (resultado) {
        modelo.cad.insertarLog({
            "tipo-operacion": "inicioGoogle",
            "usuario": usr.email,
            "fecha-hora": new Date()
        }, () => { });

        callback(resultado);
    });

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
                modelo.cad.insertarLog({
                    "tipo-operacion": "registroUsuario",
                    "usuario": obj.email,
                    "fecha-hora": new Date()
                }, () => { });
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
    let modelo = this;

    this.cad.buscarUsuario({ email: obj.email, confirmada: true }, function (usr) {
        if (!usr) {
            return callback({ "email": -1 });
        }

        bcrypt.compare(obj.password, usr.password, function (err, ok) {
            if (ok) {

                modelo.cad.insertarLog({
                    "tipo-operacion": "inicioLocal",
                    "usuario": usr.email,
                    "fecha-hora": new Date()
                }, () => { });

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

Sistema.prototype.eliminarPartida = function (codigo, email, callback) {
    let modelo = this;

    this.cad.obtenerPartida(codigo, function (partida) {
        if (!partida) {
            console.log("Intento fallido de borrar partida. Partida inexistente.");
            if (callback) callback(false);
            return false;
        }

        const creadorNorm = (partida.creador || "").toString().trim().toLowerCase();
        const emailNorm = (email || "").toString().trim().toLowerCase();

        if (creadorNorm === emailNorm) {
            modelo.cad.eliminarPartida(codigo, function (resultado) {
                if (resultado && resultado.eliminado > 0) {
                    modelo.cad.insertarLog({
                        "tipo-operacion": "eliminarPartida",
                        "usuario": email,
                        "fecha-hora": new Date()
                    }, () => { });
                    console.log("Partida " + codigo + " eliminada por el creador: " + email);
                    if (callback) callback(true);
                } else {
                    if (callback) callback(false);
                }
            });
        } else {
            console.log("Intento fallido de borrar partida. Usuario no autorizado.");
            if (callback) callback(false);
        }
    });
}

module.exports.Sistema = Sistema;