function WSServer(io) {
    const juegos = {};

    const SUELO_Y = 350;

    const GRAVEDAD = 0.8;
    const FUERZA_SALTO = -20;
    const ANCHO_CANVAS = 1200;
    const PUNTOS_PARA_GANAR = 2000;

    const ALTURA_OBSTACULO = 50;
    const VELOCIDAD_INICIAL = 6;
    const VELOCIDAD_MAXIMA = 16;

    let ultimoObstaculo = 0;
    const TIEMPO_MIN_OBSTACULOS_BASE = 1500;

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
                        sistema.eliminarPartida(codigo, email, function () {
                            io.to(codigo).emit("partidaCancelada", { motivo: "CREADOR_SALIO" });
                            io.emit("listaPartidas");
                        });
                    } else {
                        sistema.salirDePartida(codigo, email, function () {
                            socket.leave(codigo);
                            socket.partidaCodigo = null;
                            socket.email = null;
                            io.to(codigo).emit("rivalSalio", { email });
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
                                A: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 },
                                B: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 }
                            },
                            obstaculos: [],
                            juegoTerminado: false,
                            velocidadActual: VELOCIDAD_INICIAL
                        };

                        juegos[codigo].intervalo = setInterval(() => {
                            actualizarJuego(codigo, io, juegos);
                        }, 17);
                    });
                });
            });

            socket.on("saltar", function (datos) {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;

                const juego = juegos[codigo];
                if (!juego || juego.juegoTerminado) return;

                const esCreador = email === juego.creador;
                const jugador = esCreador ? 'A' : 'B';

                const pj = juego.jugadores[jugador];
                if (!pj) return;

                if (pj.contadorSaltos < 2) {
                    pj.vy = FUERZA_SALTO;
                    pj.saltando = true;
                    pj.contadorSaltos++;
                }
            });

            socket.on("abandonarPartida", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                const juego = juegos[codigo];
                if (!juego) return;

                juego.juegoTerminado = true;
                io.to(codigo).emit("partidaAbandonada", { email, codigo });
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

                if (juegos[codigo]) {
                    io.to(codigo).emit("partidaAbandonada", { email, codigo });
                    clearInterval(juegos[codigo].intervalo);
                    delete juegos[codigo];
                } else {
                    io.to(codigo).emit("rivalDesconectado", { email, codigo });
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

        const POSICION_X_JUGADOR_A = 100;
        const POSICION_X_JUGADOR_B = 100;

        // CALCULO VELOCIDAD
        const maxPuntos = Math.max(juego.jugadores.A.puntuacion, juego.jugadores.B.puntuacion);
        let nuevaVelocidad = VELOCIDAD_INICIAL + Math.floor(maxPuntos / 300);
        if (nuevaVelocidad > VELOCIDAD_MAXIMA) nuevaVelocidad = VELOCIDAD_MAXIMA;
        juego.velocidadActual = nuevaVelocidad;

        // GRAVEDAD JUGADORES
        for (let key of ['A', 'B']) {
            const p = juego.jugadores[key];
            p.vy += GRAVEDAD;
            p.y += p.vy;

            if (p.y < 0) { p.y = 0; p.vy = 0; }
            if (p.y > SUELO_Y) {
                p.y = SUELO_Y;
                p.vy = 0;
                p.saltando = false;
                p.contadorSaltos = 0;
            }
        }

        let haChocadoA = false;
        let haChocadoB = false;

        // MOVER OBSTÁCULOS Y DETECTAR COLISIÓN
        for (let o of juego.obstaculos) {
            o.x -= juego.velocidadActual;

            if (hayColision(POSICION_X_JUGADOR_A, juego.jugadores.A.y, 80, 130, o.x, o.y, 50, 50)) {
                haChocadoA = true;
            }

            if (hayColision(POSICION_X_JUGADOR_B, juego.jugadores.B.y, 80, 130, o.x, o.y, 50, 50)) {
                haChocadoB = true;
            }

            // CONTAR PUNTOS
            if (!o.contadoA && o.x + o.ancho < POSICION_X_JUGADOR_A) {
                juego.jugadores.A.puntuacion += o.puntuacion;
                o.contadoA = true;
            }
            if (!o.contadoB && o.x + o.ancho < POSICION_X_JUGADOR_B) {
                juego.jugadores.B.puntuacion += o.puntuacion;
                o.contadoB = true;
            }
        }

        if (haChocadoA || haChocadoB) {
            juego.juegoTerminado = true;
            let ganador = "";

            if (haChocadoA && haChocadoB) {
                // ¡LOS DOS SE HAN CHOCADO!
                ganador = "EMPATE";
            } else if (haChocadoA) {
                // Solo A se chocó
                ganador = "B";
            } else if (haChocadoB) {
                // Solo B se chocó
                ganador = "A";
            }

            io.to(codigo).emit("finPartida", {
                ganador: ganador,
                puntosA: juego.jugadores.A.puntuacion,
                puntosB: juego.jugadores.B.puntuacion
            });
            clearInterval(juego.intervalo);
            delete juegos[codigo];
            return;
        }

        juego.obstaculos = juego.obstaculos.filter(o => o.x + (o.ancho || 50) > -100);

        // GENERAR OBSTÁCULOS
        const tiempoEspera = Math.max(500, TIEMPO_MIN_OBSTACULOS_BASE - (juego.velocidadActual * 40));
        const ahora = Date.now();

        if (ahora - ultimoObstaculo > tiempoEspera) {
            if (Math.random() < (0.03 + (juego.velocidadActual * 0.001))) {
                ultimoObstaculo = ahora;
                let randomTipo = Math.random();
                const Y_RAS_SUELO = SUELO_Y + 50;
                let nuevoObstaculo = {
                    x: ANCHO_CANVAS, y: Y_RAS_SUELO, ancho: 50, alto: 50,
                    velocidad: juego.velocidadActual, contadoA: false, contadoB: false
                };

                if (randomTipo < 0.60) { nuevoObstaculo.tipo = "obstaculoA"; nuevoObstaculo.puntuacion = 10; }
                else if (randomTipo < 0.90) { nuevoObstaculo.tipo = "obstaculoB"; nuevoObstaculo.puntuacion = 20; }
                else { nuevoObstaculo.tipo = "obstaculoC"; nuevoObstaculo.puntuacion = 30; }

                juego.obstaculos.push(nuevoObstaculo);
            }
        }

        // FINALIZAR POR PUNTOS
        const puntosA = juego.jugadores.A.puntuacion;
        const puntosB = juego.jugadores.B.puntuacion;

        if (puntosA >= PUNTOS_PARA_GANAR || puntosB >= PUNTOS_PARA_GANAR) {
            juego.juegoTerminado = true;
            let ganador = "EMPATE";
            if (puntosA > puntosB) ganador = "A";
            else if (puntosB > puntosA) ganador = "B";

            io.to(codigo).emit("finPartida", { ganador, puntosA, puntosB });
            clearInterval(juego.intervalo);
            delete juegos[codigo];
            return;
        }

        io.to(codigo).emit("estadoJuego", juego);
    }
}

function hayColision(pX, pY, pAncho, pAlto, oX, oY, oAncho, oAlto) {
    const margen = 5;
    return (
        pX + pAncho - margen > oX + margen &&
        pX + margen < oX + oAncho - margen &&
        pY + pAlto - margen > oY + margen &&
        pY + margen < oY + oAlto - margen
    );
}

module.exports.WSServer = WSServer;