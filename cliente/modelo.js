const datos = require("./cad.js");

function Sistema() {
    this.usuarios = {};
    this.contadorId = 1;

    // CONEXIÓN A MongoDB
    this.cad = new datos.CAD();
    this.cad.conectar(function (db) {
        console.log("Conectado a Mongo Atlas");
    });
}

Sistema.prototype.agregarUsuario = function (nick, email, password) {
    this.usuarios[nick] = new Usuario(nick, email, password);
    this.contadorId++;
    return this.contadorId;
}

Sistema.prototype.obtenerUsuario = function () {
    return this.usuarios;
}

Sistema.prototype.usuarioActivo = function (nick) {
    return !!this.usuarios[nick];
}

Sistema.prototype.eliminarUsuario = function (nick) {
    if (this.usuarios.hasOwnProperty(nick)) {
        delete this.usuarios[nick];
        return true;
    }
    return false;
}

Sistema.prototype.numeroUsuarios = function () {
    return Object.keys(this.usuarios).length;
}

Sistema.prototype.obtenerUsuarios = function () {
    return this.usuarios;
}

Sistema.prototype.loginUsuario = function (obj, callback) {
    this.cad.buscarUsuario({ email: obj.email }, function (usr) {
        if (usr && usr.password === obj.password) {
            callback(usr);
        } else {
            callback({ "email": -1 });
        }
    });
}

Sistema.prototype.registrarUsuario = function (obj, callback) {
    let modelo = this;
    if (!obj.nick) {
        obj.nick = obj.email;
    }
    this.cad.buscarUsuario(obj, function (usr) {
        if (!usr) {
            modelo.cad.insertarUsuario(obj, function (res) {
                callback(res);
            });
        } else {
            callback({ "email": -1 });
        }
    });
}

Sistema.prototype.usuarioGoogle = function (usr, callback) {
    this.cad.buscarOCrearUsuario(usr, function (obj) {
        callback(obj);
    });
}

function Usuario(nick, email, password) {
    this.nick = nick;
    this.email = email;
    this.password = password;
}

module.exports.Sistema = Sistema;