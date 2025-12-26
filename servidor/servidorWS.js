function WSServer(io) {
    const juegos = {};

    const SUELO_Y = 500;
    const GRAVEDAD = 0.8;
    const FUERZA_SALTO = -25;
    const ANCHO_CANVAS = 1200;

    const ALTURA_OBSTACULO = 50;
    const VELOCIDAD_OBSTACULO_DEFAULT = 4;

    this.enviarAlRemitente = function (socket, mensaje, datos) {
        socket.emit(mensaje, datos);
    }

    this.enviarATodosMenosRemitente = function (socket, mens, datos) {
        socket.broadcast.emit(mens, datos);
    }

    this.enviarGlobal = function (io, mens, datos) {
        io.emit(mens, datos);
    }

    this.lanzarServidor = function (io, sistema) {
        let srv = this;

        io.on('connection', function (socket) {
            console.log("Capa WS activa");
            sistema.obtenerPartidasDisponibles(function (lista) {
                srv.enviarAlRemitente(socket, "listaPartidas", lista);
            });

            socket.on("crearPartida", function (datos) {
                console.log("WS: crearPartida de " + datos.email);
                sistema.crearPartida(datos.email, function (codigo) {
                    if (codigo != -1) {
                        console.log("WS: Partida creada " + codigo);
                        socket.join(codigo);
                        srv.enviarAlRemitente(socket, "partidaCreada", { "codigo": codigo });
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                        });
                    } else {
                        console.log("WS: Error al crear partida");
                    }
                });
            });

            socket.on("unirAPartida", function (datos) {
                sistema.unirAPartida(datos.email, datos.codigo, function (codigo) {
                    if (codigo != -1) {
                        console.log("WS: Jugador " + datos.email + " unido a " + codigo);
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
                console.log("WS: Intento de iniciar juego " + datos.codigo + " por " + datos.email);
                sistema.iniciarJuego(datos.codigo, datos.email, function (resultado) {
                    if (resultado === 1) {
                        sistema.obtenerEstadisticasPartida(datos.codigo, function (partida) {
                            if (partida) {
                                console.log("WS: Juego iniciado. Creador oficial: " + partida.creador);
                                srv.enviarGlobal(io, "juegoIniciado", {
                                    codigo: datos.codigo,
                                    creador: partida.creador,
                                    jugadores: partida.jugadores
                                });

                                if (!juegos[datos.codigo]) {
                                    juegos[datos.codigo] = {
                                        creador: partida.creador,
                                        jugadores: {
                                            A: { y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0 },
                                            B: { y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0 }
                                        },
                                        obstaculos: [],
                                        juegoTerminado: false
                                    };

                                    juegos[datos.codigo].intervalo = setInterval(() => {
                                        actualizarJuego(datos.codigo, io);
                                    }, 50);
                                }
                            }
                        });

                    } else {
                        srv.enviarAlRemitente(socket, "errorIniciarJuego", { razon: resultado });
                    }
                });
            });

            socket.on("saltar", function (datos) {
                const juego = juegos[datos.codigo];
                if (!juego) return;

                let esCreador = (datos.email && juego.creador && datos.email.trim() === juego.creador.trim());

                const jugador = esCreador ? 'A' : 'B';

                const pj = juego.jugadores[jugador];
                if (!pj.saltando) {
                    pj.vy = FUERZA_SALTO;
                    pj.saltando = true;
                }
            });

        });
    };

    function actualizarJuego(codigo, io) {
        const juego = juegos[codigo];
        if (!juego || juego.juegoTerminado) return;

        const POSICION_X_JUGADOR_A = 50;
        const POSICION_X_JUGADOR_B = 150;

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

        for (let o of juego.obstaculos) {
            o.x -= o.velocidad || 4;

            if (!o.contadoA && o.x + o.ancho < POSICION_X_JUGADOR_A) {
                juego.jugadores.A.puntuacion += o.puntuacion;
                o.contadoA = true;
            }

            if (!o.contadoB && o.x + o.ancho < POSICION_X_JUGADOR_B) {
                juego.jugadores.B.puntuacion += o.puntuacion;
                o.contadoB = true;
            }
        }

        juego.obstaculos = juego.obstaculos.filter(o => o.x + (o.ancho || 50) > -100);

        if (Math.random() < 0.02) {
            let randomTipo = Math.random();
            let velocidadAleatoria = Math.floor(Math.random() * (10 - 4 + 1)) + 4;

            let despegueSuelo = Math.floor(Math.random() * 120);
            let yAleatoria = (SUELO_Y - 50) - despegueSuelo;

            let nuevoObstaculo = {
                x: ANCHO_CANVAS,
                y: yAleatoria,
                ancho: 50,
                alto: 50,
                velocidad: velocidadAleatoria,
                contadoA: false,
                contadoB: false
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
            }
            juego.obstaculos.push(nuevoObstaculo);
        }

        io.to(codigo).emit("estadoJuego", juego);
    }
}

module.exports.WSServer = WSServer;