function WSServer(io) {
    this.lanzarServidor = function (io, sistema) {
        let srv = this;

        io.on('connection', function (socket) {
            console.log("Capa WS activa");

            // --- Listener: Crear Partida ---
            socket.on("crearPartida", function (datos) {
                console.log("Servidor ha recibido 'crearPartida' con datos:", datos);

                sistema.crearPartida(datos.email, function (codigo) {
                    console.log("Código de partida generado (async):", codigo);

                    if (codigo != -1) {
                        socket.join(codigo);
                        srv.enviarAlRemitente(socket, "partidaCreada", { "codigo": codigo });
                        let lista = sistema.obtenerPartidasDisponibles();
                        srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    } else {
                        console.log("No se pudo crear la partida (código -1).");
                    }
                });
            });

            socket.on("unirAPartida", function (datos) {
                // pedir a sistema unir a partida
                sistema.unirAPartida(datos.email, datos.codigo, function (codigo) {

                    // unirse al socket si el código no es -1
                    if (codigo != -1) {
                        socket.join(codigo);

                        // enviar al remitente “unidoAPartida” y el código
                        srv.enviarAlRemitente(socket, "unidoAPartida", { "codigo": codigo });

                        // enviar al resto la lista de partidas actualizada
                        let lista = sistema.obtenerPartidasDisponibles();
                        srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    }
                });
            });

            socket.on("cancelarPartida", function (datos) {
                let borrada = sistema.eliminarPartida(datos.codigo, datos.email);

                if (borrada) {
                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                }
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