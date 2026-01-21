function WSServer(io) {
    const juegos = {};
    const SUELO_Y = 350;
    const GRAVEDAD = 0.8;
    const FUERZA_SALTO = -20;
    const ANCHO_CANVAS = 1200;
    const PUNTOS_PARA_GANAR = 2000;
    const VELOCIDAD_INICIAL = 6;
    const VELOCIDAD_MAXIMA = 16;
    const TIEMPO_MIN_OBSTACULOS_BASE = 1000;
    this.lanzarServidor = function (io, sistema) {
        io.on('connection', function (socket) {
            console.log("Capa WS activa");
            sistema.obtenerPartidasDisponibles(function (lista) {
                socket.emit("listaPartidas", lista);
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
                        socket.emit("partidaCreada", { codigo });
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            const disponibles = lista.filter(p => p.estado !== "EN_CURSO");
                            socket.broadcast.emit("listaPartidas", disponibles);
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
                        socket.emit("unidoAPartida", { codigo });
                        sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                            if (partida) {
                                io.to(codigo).emit("estadoPartidaActualizado", {
                                    codigo: codigo,
                                    estado: partida.estado,
                                    creador: partida.creador,
                                    jugadores: partida.jugadores
                                });
                            }
                        });
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            socket.broadcast.emit("listaPartidas", lista);
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
                            socket.broadcast.to(codigo).emit("partidaCancelada", { motivo: "CREADOR_SALIO" });
                            socket.leave(codigo);
                            socket.partidaCodigo = null;
                            socket.email = null;
                            socket.emit("salidaConfirmada");
                            sistema.obtenerPartidasDisponibles(function (lista) {
                                io.emit("listaPartidas", lista);
                            });
                        });
                    } else {
                        sistema.salirDePartida(codigo, email, function () {
                            socket.leave(codigo);
                            socket.partidaCodigo = null;
                            socket.email = null;
                            socket.broadcast.to(codigo).emit("rivalSalio", { email });
                            socket.emit("salidaConfirmada");
                            // Actualizar lista de partidas para que vuelva a estar disponible
                            sistema.obtenerPartidasDisponibles(function (lista) {
                                io.emit("listaPartidas", lista);
                            });
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
                        juegos[codigo] = {
                            creador: partida.creador,
                            jugadores: {
                                A: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 },
                                B: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 }
                            },
                            obstaculos: [],
                            juegoTerminado: false,
                            velocidadActual: VELOCIDAD_INICIAL,
                            ultimoObstaculo: 0,
                            tiempoInicio: Date.now()
                        };
                        io.to(codigo).emit("juegoIniciado", {
                            codigo,
                            creador: partida.creador,
                            jugadores: partida.jugadores
                        });
                        juegos[codigo].intervalo = setInterval(() => {
                            actualizarJuego(codigo, io, juegos);
                        }, 17);
                    });
                });
            });
            socket.on("reiniciarJuego", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                const juego = juegos[codigo];
                if (!juego) return;
                juego.juegoTerminado = false;
                juego.obstaculos = [];
                juego.velocidadActual = VELOCIDAD_INICIAL;
                juego.ultimoObstaculo = 0;
                juego.tiempoInicio = Date.now();
                juego.jugadores = {
                    A: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 },
                    B: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 }
                };
                io.to(codigo).emit("juegoReiniciado", {
                    codigo,
                    jugadores: juego.jugadores
                });
                clearInterval(juego.intervalo);
                juego.intervalo = setInterval(() => {
                    actualizarJuego(codigo, io, juegos);
                }, 17);
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
                if (juego && !juego.juegoTerminado) {
                    socket.broadcast.to(codigo).emit("partidaAbandonada", { email, codigo });
                    juego.juegoTerminado = true;
                    clearInterval(juego.intervalo);
                    delete juegos[codigo];
                    sistema.eliminarPartida(codigo, email, function () {
                        // Actualizar lista de partidas para todos
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            io.emit("listaPartidas", lista);
                        });
                    });
                }
                socket.leave(codigo);
                socket.partidaCodigo = null;
                socket.email = null;
            });
            socket.on("solicitarRevancha", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                    if (!partida || partida.jugadores.length < 2) return;
                    const otroJugador = partida.jugadores.find(j => j.email !== email);
                    if (!otroJugador) return;
                    partida.revanchaSolicitada = true;
                    partida.revanchaPor = email;
                    socket.broadcast.to(codigo).emit("solicitudRevanchaRecibida", { email, otroJugador: otroJugador.email });
                });
            });
            socket.on("aceptarRevancha", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                    if (!partida) return;
                    juegos[codigo] = {
                        creador: partida.creador,
                        jugadores: {
                            A: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 },
                            B: { x: 100, y: SUELO_Y, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 }
                        },
                        obstaculos: [],
                        juegoTerminado: false,
                        velocidadActual: VELOCIDAD_INICIAL,
                        ultimoObstaculo: 0,
                        tiempoInicio: Date.now()
                    };
                    io.to(codigo).emit("revanchaAceptada", {
                        codigo,
                        creador: partida.creador,
                        jugadores: partida.jugadores
                    });
                    juegos[codigo].intervalo = setInterval(() => {
                        actualizarJuego(codigo, io, juegos);
                    }, 17);
                });
            });
            socket.on("rechazarRevancha", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                socket.broadcast.to(codigo).emit("revanchaRechazada", { email });
                sistema.eliminarPartida(codigo, email, function () {
                    sistema.obtenerPartidasDisponibles(function (lista) {
                        io.emit("listaPartidas", lista);
                    });
                });
                socket.leave(codigo);
                socket.partidaCodigo = null;
                socket.email = null;
            });
            socket.on("cancelarRevancha", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                sistema.obtenerEstadisticasPartida(codigo, function (partida) {
                    if (!partida) return;
                    io.to(codigo).emit("revanchaRechazada", { email });
                    sistema.eliminarPartida(codigo, email, function () {
                        sistema.obtenerPartidasDisponibles(function (lista) {
                            io.emit("listaPartidas", lista);
                        });
                    });
                });
                socket.leave(codigo);
                socket.partidaCodigo = null;
                socket.email = null;
            });
            socket.on("salirDespuesDeFin", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                socket.broadcast.to(codigo).emit("rivalSalioDespuesDeFin", { email, codigo });
                socket.leave(codigo);
                socket.partidaCodigo = null;
                socket.email = null;
            });
            socket.on("forzarFinPartidaTest", function (datos) {
                const codigo = socket.partidaCodigo;
                if (!codigo || !juegos[codigo]) return;
                juegos[codigo].juegoTerminado = true;
                clearInterval(juegos[codigo].intervalo);
                io.to(codigo).emit("finPartida", datos);
            });
            socket.on("disconnect", function () {
                const codigo = socket.partidaCodigo;
                const email = socket.email;
                if (!codigo || !email) return;
                if (juegos[codigo]) {
                    const juego = juegos[codigo];
                    if (juego.juegoTerminado) {
                        io.to(codigo).emit("rivalSalioDespuesDeFin", { email, codigo });
                    } else {
                        io.to(codigo).emit("partidaAbandonada", { email, codigo });
                    }
                    clearInterval(juego.intervalo);
                    delete juegos[codigo];
                } else {
                    if (socket.partidaFinalizada) {
                        io.to(codigo).emit("rivalSalioDespuesDeFin", { email, codigo });
                    } else {
                        io.to(codigo).emit("rivalDesconectado", { email, codigo });
                    }
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
        const POSICION_X_JUGADOR = 100;
        const maxPuntos = Math.max(juego.jugadores.A.puntuacion, juego.jugadores.B.puntuacion);
        let nuevaVelocidad = VELOCIDAD_INICIAL + Math.floor(maxPuntos / 300);
        if (nuevaVelocidad > VELOCIDAD_MAXIMA) nuevaVelocidad = VELOCIDAD_MAXIMA;
        juego.velocidadActual = nuevaVelocidad;
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
        for (let o of juego.obstaculos) {
            o.x -= juego.velocidadActual;
            if (hayColision(POSICION_X_JUGADOR, juego.jugadores.A.y, 80, 130, o.x, o.y, 50, 50)) {
                haChocadoA = true;
            }
            if (hayColision(POSICION_X_JUGADOR, juego.jugadores.B.y, 80, 130, o.x, o.y, 50, 50)) {
                haChocadoB = true;
            }
            if (!o.contadoA && o.x + o.ancho < POSICION_X_JUGADOR) {
                juego.jugadores.A.puntuacion += o.puntuacion;
                o.contadoA = true;
            }
            if (!o.contadoB && o.x + o.ancho < POSICION_X_JUGADOR) {
                juego.jugadores.B.puntuacion += o.puntuacion;
                o.contadoB = true;
            }
        }
        if (haChocadoA || haChocadoB) {
            juego.juegoTerminado = true;
            let ganador = "";
            if (haChocadoA && haChocadoB) {
                ganador = "EMPATE";
            } else if (haChocadoA) {
                ganador = "B";
            } else if (haChocadoB) {
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

        // Calcular nivel de dificultad basado en puntos (cada 200 puntos aumenta)
        const nivelDificultad = Math.floor(maxPuntos / 200);

        // Tiempo entre obstáculos que disminuye con la dificultad
        // Inicia en 1800ms y reduce 150ms por nivel (mínimo 600ms)
        const tiempoBase = 1800 - (nivelDificultad * 150);
        const tiempoEspera = Math.max(600, tiempoBase);

        // Probabilidad de aparición que aumenta con la dificultad
        // Inicia en 0.6 (60%) y aumenta 0.05 por nivel (máximo 0.95)
        const probabilidadBase = 0.6 + (nivelDificultad * 0.05);
        const probabilidadObstaculo = Math.min(0.95, probabilidadBase);

        const ahora = Date.now();
        const tiempoDesdeInicio = ahora - (juego.tiempoInicio || ahora);
        const LATENCIA_INICIAL_MS = 8000;
        if (tiempoDesdeInicio >= LATENCIA_INICIAL_MS && ahora - juego.ultimoObstaculo > tiempoEspera) {
            juego.ultimoObstaculo = ahora;
            if (Math.random() < probabilidadObstaculo) {
                let randomTipo = Math.random();
                const ALTO_OBSTACULO = 50;
                const ALTO_JUGADOR = 130;
                const Y_PIES = SUELO_Y + ALTO_JUGADOR;
                const Y_BASE_OBSTACULO = Y_PIES - ALTO_OBSTACULO;
                let nuevoObstaculo = {
                    x: ANCHO_CANVAS, y: Y_BASE_OBSTACULO, ancho: 50, alto: ALTO_OBSTACULO,
                    velocidad: juego.velocidadActual, contadoA: false, contadoB: false
                };
                if (randomTipo < 0.60) { nuevoObstaculo.tipo = "obstaculoA"; nuevoObstaculo.puntuacion = 10; }
                else if (randomTipo < 0.90) { nuevoObstaculo.tipo = "obstaculoB"; nuevoObstaculo.puntuacion = 20; }
                else { nuevoObstaculo.tipo = "obstaculoC"; nuevoObstaculo.puntuacion = 30; }
                juego.obstaculos.push(nuevoObstaculo);
            }
        }
        const puntosA = juego.jugadores.A.puntuacion;
        const puntosB = juego.jugadores.B.puntuacion;
        if (puntosA >= PUNTOS_PARA_GANAR || puntosB >= PUNTOS_PARA_GANAR) {
            juego.juegoTerminado = true;
            let ganador = "EMPATE";
            if (puntosA > puntosB) ganador = "A";
            else if (puntosB > puntosA) ganador = "B";
            io.to(codigo).emit("finPartida", { ganador, puntosA, puntosB });
            clearInterval(juego.intervalo);
            const sockets = io.sockets.adapter.rooms.get(codigo);
            if (sockets) {
                sockets.forEach(socketId => {
                    const s = io.sockets.sockets.get(socketId);
                    if (s) s.partidaFinalizada = true;
                });
            }
            delete juegos[codigo];
            return;
        }
        io.to(codigo).emit("estadoJuego", {
            jugadores: {
                A: {
                    x: juego.jugadores.A.x,
                    y: juego.jugadores.A.y,
                    puntuacion: juego.jugadores.A.puntuacion
                },
                B: {
                    x: juego.jugadores.B.x,
                    y: juego.jugadores.B.y,
                    puntuacion: juego.jugadores.B.puntuacion
                }
            },
            obstaculos: juego.obstaculos.map(o => ({
                x: o.x,
                y: o.y,
                ancho: o.ancho,
                alto: o.alto,
                tipo: o.tipo
            })),
            velocidad: juego.velocidadActual
        });
    }
}
function hayColision(pX, pY, pAncho, pAlto, oX, oY, oAncho, oAlto) {
    const margen = 15;
    return (
        pX + pAncho - margen > oX + margen &&
        pX + margen < oX + oAncho - margen &&
        pY + pAlto - margen > oY + margen &&
        pY + margen < oY + oAlto - margen
    );
}
module.exports.WSServer = WSServer;