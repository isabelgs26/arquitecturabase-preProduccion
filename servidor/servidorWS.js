function WSServer(io) {
    const juegos = {};

    const SUELO_Y = 500;
    const GRAVEDAD = 0.8;
    const FUERZA_SALTO = -25;
    const ANCHO_CANVAS = 1200;
    const PUNTOS_PARA_GANAR = 1000;

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
                if (socket.partidaCodigo) {
                    socket.emit("accionRechazada", {
                        accion: "crearPartida",
                        motivo: "YA_EN_PARTIDA"
                    });
                    return;
                }
                sistema.crearPartida(datos.email, function (codigo) {
                    if (codigo != -1) {
                        console.log("WS: Partida creada " + codigo);
                        socket.join(codigo);
                        socket.partidaCodigo = codigo;
                        socket.email = datos.email;
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
                        socket.partidaCodigo = codigo;
                        socket.email = datos.email;
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

            socket.on("cancelarPartida", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;

                if (!codigo || !email) return;

                // si el juego ya empezó, no se puede cancelar
                if (juegos[codigo]) {
                    socket.emit("accionRechazada", {
                        accion: "cancelarPartida",
                        motivo: "PARTIDA_EN_CURSO"
                    });
                    return;
                }

                sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                    if (!partida) return;

                    const esCreador = email === partida.creador;

                    if (esCreador) {
                        // Creador sale → eliminar partida
                        sistema.eliminarPartida(codigo, email, function () {
                            io.to(codigo).emit("partidaCancelada", {
                                motivo: "CREADOR_SALIO"
                            });

                            io.emit("listaPartidas");
                        });

                    } else {
                        // Jugador 2 sale → abandonar partida
                        sistema.salirDePartida(codigo, email, function () {
                            socket.leave(codigo);
                            socket.partidaCodigo = null;
                            socket.email = null;

                            io.to(codigo).emit("rivalSalio", {
                                email
                            });

                            socket.emit("salidaConfirmada");
                        });
                    }
                });
            });



            socket.on("iniciarJuego", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;

                if (!codigo || !email) return;

                sistema.iniciarJuego(codigo, email, function (resultado) {
                    if (resultado !== 1) {
                        socket.emit("errorIniciarJuego", { razon: resultado });
                        return;
                    }

                    sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                        if (!partida) return;

                        if (juegos[codigo]) {
                            socket.emit("errorIniciarJuego", { razon: "YA_INICIADA" });
                            return;
                        }

                        srv.enviarGlobal(io, "juegoIniciado", {
                            codigo,
                            creador: partida.creador,
                            jugadores: partida.jugadores
                        });

                        juegos[codigo] = {
                            creador: partida.creador,
                            jugadores: {
                                A: { y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0 },
                                B: { y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0 }
                            },
                            obstaculos: [],
                            juegoTerminado: false
                        };

                        juegos[codigo].intervalo = setInterval(() => {
                            actualizarJuego(codigo, io, juegos);
                        }, 50);
                    });
                });
            });


            socket.on("saltar", function (datos) {
                const codigo = socket.partidaCodigo;
                const email = socket.email;

                if (!codigo || !email) return;

                const juego = juegos[codigo];
                if (!juego) return;

                if (juego.juegoTerminado) return;

                const esCreador = email === juego.creador;

                const jugador = esCreador ? 'A' : 'B';

                const pj = juego.jugadores[jugador];
                if (!pj || pj.saltando) return;
                pj.vy = FUERZA_SALTO;
                pj.saltando = true;
            });

            socket.on("abandonarPartida", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;

                if (!codigo || !email) return;

                // solo tiene sentido si el juego está en curso
                const juego = juegos[codigo];
                if (!juego) return;

                console.log(`WS: ${email} abandonó la partida ${codigo}`);

                juego.juegoTerminado = true;

                io.to(codigo).emit("partidaAbandonada", {
                    email,
                    codigo
                });

                clearInterval(juego.intervalo);
                delete juegos[codigo];

                sistema.eliminarPartida(codigo, email, function () {
                    sistema.obtenerPartidasDisponibles(lista => {
                        io.emit("listaPartidas", lista);
                    });
                });

                socket.leave(codigo);
                socket.partidaCodigo = null;
                socket.email = null;
            });

            socket.on("disconnect", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;

                if (!codigo || !email) return;

                console.log(`WS: ${email} se desconectó de ${codigo}`);

                if (juegos[codigo]) {
                    io.to(codigo).emit("partidaAbandonada", {
                        email,
                        codigo
                    });

                    clearInterval(juegos[codigo].intervalo);
                    delete juegos[codigo];
                } else {
                    io.to(codigo).emit("rivalDesconectado", {
                        email,
                        codigo
                    });
                }

                sistema.eliminarPartida(codigo, email, function () {
                    sistema.obtenerPartidasDisponibles(lista => {
                        io.emit("listaPartidas", lista);
                    });
                });
            });


        });
    };

    function actualizarJuego(codigo, io, juegos) {
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
            let nuevoObstaculo = {
                x: ANCHO_CANVAS,
                y: 0,
                ancho: 50,
                alto: 50,
                velocidad: 6,
                contadoA: false,
                contadoB: false
            };

            if (randomTipo < 0.60) {
                nuevoObstaculo.tipo = "obstaculoA";
                nuevoObstaculo.y = SUELO_Y - 50;
                nuevoObstaculo.puntuacion = 10;
            } else if (randomTipo < 0.90) {
                nuevoObstaculo.tipo = "obstaculoB";
                nuevoObstaculo.y = SUELO_Y - 80;
                nuevoObstaculo.puntuacion = 20;
            } else {
                nuevoObstaculo.tipo = "obstaculoC";
                nuevoObstaculo.y = SUELO_Y - 120;
                nuevoObstaculo.puntuacion = 30;
            }
            juego.obstaculos.push(nuevoObstaculo);
        }
        // comprobar fin de partida por puntuación
        const puntosA = juego.jugadores.A.puntuacion;
        const puntosB = juego.jugadores.B.puntuacion;

        if (puntosA >= PUNTOS_PARA_GANAR || puntosB >= PUNTOS_PARA_GANAR) {
            juego.juegoTerminado = true;

            let ganador = "EMPATE";
            if (puntosA > puntosB) ganador = "A";
            else if (puntosB > puntosA) ganador = "B";

            io.to(codigo).emit("finPartida", {
                ganador,
                puntosA,
                puntosB
            });

            clearInterval(juego.intervalo);
            delete juegos[codigo];
            return;
        }

        io.to(codigo).emit("estadoJuego", juego);
    }
}

module.exports.WSServer = WSServer;