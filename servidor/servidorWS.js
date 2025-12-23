function WSServer(io) {
    const juegos = {};

    const SUELO_Y = 500;
    const GRAVEDAD = 0.8;
    const FUERZA_SALTO = -20;
    const ANCHO_CANVAS = 1200;

    const ALTURA_OBSTACULO = 50;
    const VELOCIDAD_OBSTACULO = 4;

    // --------------------------------------------------------
    // FUNCIONES DE ENVÍO (DEFINIDAS AL PRINCIPIO PARA EVITAR ERRORES)
    // --------------------------------------------------------
    this.enviarAlRemitente = function (socket, mensaje, datos) {
        socket.emit(mensaje, datos);
    }

    this.enviarATodosMenosRemitente = function (socket, mens, datos) {
        socket.broadcast.emit(mens, datos);
    }

    this.enviarGlobal = function (io, mens, datos) {
        io.emit(mens, datos);
    }

    // --------------------------------------------------------
    // LÓGICA PRINCIPAL DEL SERVIDOR
    // --------------------------------------------------------
    this.lanzarServidor = function (io, sistema) {
        let srv = this; // 'this' ahora tiene garantizadas las funciones de arriba

        io.on('connection', function (socket) {
            console.log("Capa WS activa");

            socket.on("crearPartida", function (datos) {
                console.log("Servidor ha recibido 'crearPartida' con datos:", datos);

                sistema.crearPartida(datos.email, function (codigo) {
                    console.log("Código de partida generado (async):", codigo);

                    if (codigo != -1) {
                        socket.join(codigo);
                        // Aquí es donde te daba el error antes:
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
                                    codigo: codigo,
                                    estado: partida.estado,
                                    creador: partida.creador,
                                    jugadores: partida.jugadores
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
                        sistema.obtenerEstadisticasPartida(datos.codigo, function (partida) {
                            if (partida) {
                                srv.enviarGlobal(io, "juegoIniciado", {
                                    codigo: datos.codigo,
                                    creador: partida.creador,
                                    jugadores: partida.jugadores
                                });
                                if (!juegos[datos.codigo]) {
                                    juegos[datos.codigo] = {
                                        creador: datos.email,
                                        jugadores: {
                                            A: { y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0 },
                                            B: { y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0 }
                                        },
                                        obstaculos: [],
                                        juegoTerminado: false
                                    };

                                    // Bucle de actualización de juego
                                    juegos[datos.codigo].intervalo = setInterval(() => {
                                        actualizarJuego(datos.codigo, io);
                                    }, 50);
                                }
                            }
                        });

                    } else {
                        srv.enviarAlRemitente(socket, "errorIniciarJuego", {
                            razon: resultado
                        });
                    }
                });
            });

            socket.on("saltar", function (datos) {
                const juego = juegos[datos.codigo];
                if (!juego) return;

                // Determinar jugador (creador = A, otro = B)
                const jugador = (datos.email === juego.creador) ? 'A' : 'B';
                const pj = juego.jugadores[jugador];
                if (!pj.saltando) {
                    pj.vy = FUERZA_SALTO;
                    pj.saltando = true;
                }
            });

        });
    };

    // --------------------------------------------------------
    // BUCLE DE JUEGO
    // --------------------------------------------------------
    function actualizarJuego(codigo, io) {
        const juego = juegos[codigo];
        if (!juego || juego.juegoTerminado) return;

        // Física jugadores
        for (let key of ['A', 'B']) {
            const p = juego.jugadores[key];
            p.vy += GRAVEDAD;
            p.y += p.vy;
            if (p.y >= SUELO_Y) {
                p.y = SUELO_Y;
                p.vy = 0;
                p.saltando = false;
            }
        }

        // Mover obstáculos
        for (let o of juego.obstaculos) {
            o.x -= o.velocidad || 4;
        }
        juego.obstaculos = juego.obstaculos.filter(o => o.x + (o.ancho || 50) > 0);

        // Generar nuevos obstáculos
        if (Math.random() < 0.02) {
            let randomTipo = Math.random();
            let nuevoObstaculo = {
                x: ANCHO_CANVAS,
                y: SUELO_Y - 50,
                ancho: 50,
                alto: 50,
                velocidad: 4
            };

            if (randomTipo < 0.60) {
                nuevoObstaculo.tipo = "obstaculoA";
                nuevoObstaculo.puntuacion = 15;
            } else if (randomTipo < 0.90) {
                nuevoObstaculo.tipo = "obstaculoB";
                nuevoObstaculo.puntuacion = 20;
            } else {
                nuevoObstaculo.tipo = "obstaculoC";
                nuevoObstaculo.puntuacion = 30;
                nuevoObstaculo.velocidad = 6;
            }
            juego.obstaculos.push(nuevoObstaculo);
        }

        io.to(codigo).emit("estadoJuego", juego);
    }

}
module.exports.WSServer = WSServer;