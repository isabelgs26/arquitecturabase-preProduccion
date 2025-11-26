function WSServer(io) {
    this.lanzarServidor = function (io, sistema) {
        let srv = this;

        io.on('connection', function (socket) {
            console.log("Capa WS activa");

            socket.on("crearPartida", function (datos) {
                console.log("Servidor ha recibido 'crearPartida' con datos:", datos);

                sistema.crearPartida(datos.email, function (codigo) {
                    console.log("Código de partida generado (async):", codigo);

                    if (codigo != -1) {
                        socket.join(codigo);
                        srv.enviarAlRemitente(socket, "partidaCreada", { "codigo": codigo });
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                        });
                    } else {
                        console.log("No se pudo crear la partida (código -1).");
                    }
                });
            });

            socket.on("unirAPartida", function (datos) {
                sistema.unirAPartida(datos.email, datos.codigo, function (codigo) {
                    if (codigo != -1) {
                        socket.join(codigo);
                        srv.enviarAlRemitente(socket, "unidoAPartida", { "codigo": codigo });

                        sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                            if (partida) {
                                srv.enviarGlobal(io, "estadoPartidaActualizado", {
                                    "codigo": codigo,
                                    "estado": partida.estado,
                                    "jugadores": partida.jugadores
                                });
                            }
                        });

                        sistema.obtenerPartidasDisponibles(function (lista) {
                            srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                        });
                    }
                });
            });

            socket.on("cancelarPartida", function (datos) {
                sistema.eliminarPartida(datos.codigo, datos.email, function (borrada) {
                    if (borrada) {
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            srv.enviarGlobal(io, "listaPartidas", lista);
                            srv.enviarGlobal(io, "partidaCancelada", { "codigo": datos.codigo });
                        });
                    }
                });
            });

            socket.on("iniciarJuego", function (datos) {
                sistema.iniciarJuego(datos.codigo, datos.email, function (resultado) {
                    if (resultado === 1) {
                        srv.enviarGlobal(io, "juegoIniciado", {
                            "codigo": datos.codigo
                        });
                    } else {
                        srv.enviarAlRemitente(socket, "errorIniciarJuego", {
                            "razon": resultado
                        });
                    }
                });
            });
        });
    }

    this.enviarAlRemitente = function (socket, mensaje, datos) {
        socket.emit(mensaje, datos);
    }
    this.enviarATodosMenosRemitente = function (socket, mens, datos) {
        socket.broadcast.emit(mens, datos);
    }
    this.enviarGlobal = function (io, mens, datos) {
        io.emit(mens, datos);
    }
}

module.exports.WSServer = WSServer;