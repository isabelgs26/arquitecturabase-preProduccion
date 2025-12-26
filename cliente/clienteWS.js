function ClienteWS() {
    this.socket = undefined;
    this.email = undefined;
    this.codigo = undefined;

    this.ini = function () {
        const canvas = document.getElementById("miCanvas");
        if (canvas) canvas.style.display = "none";
        this.socket = io.connect();
        this.lanzarServidorWS();
    }

    this.lanzarServidorWS = function () {
        let cli = this;

        this.socket.on("connect", function () {
            console.log("Conectado al servidor de WS");
        });

        this.socket.on("partidaCreada", function (datos) {
            console.log("Partida creada con código:", datos.codigo);
            cli.codigo = datos.codigo;
            if (cw) cw.mostrarEsperandoRival();
        });

        this.socket.on("unidoAPartida", function (datos) {
            console.log("Te has unido a la partida con código:", datos.codigo);
            cli.codigo = datos.codigo;
            if (cw) cw.mostrarEsperandoRival();
        });

        this.socket.on("listaPartidas", function (lista) {
            if (cw) cw.mostrarListaPartidas(lista);
        });

        this.socket.on("partidaCancelada", function () {
            cli.codigo = undefined;
            if (cw) cw.mostrarCierrePorAbandono();
        });

        this.socket.on("estadoPartidaActualizado", function (datos) {
            console.log("Estado de partida actualizado:", datos);
            if (datos.estado === "completa") {
                let esCreador = (datos.creador === cli.email);
                if (cw) cw.mostrarEsperandoInicio(datos.codigo, esCreador);
            }
        });

        this.socket.on("juegoIniciado", function (datos) {
            console.log("¡Juego iniciado!", datos);
            let soyJugadorA = (datos.creador === cli.email);
            const canvas = document.getElementById("miCanvas");
            canvas.style.display = "block";
            if (cw) cw.mostrarPantallaJuego(soyJugadorA);

        });

        this.socket.on("errorIniciarJuego", function (datos) {
            console.log("Error al iniciar juego:", datos.razon);
            if (cw) cw.mostrarModal("No se pudo iniciar el juego. Código de error: " + datos.razon);
        });

        this.socket.on("jugadorSalto", function (datos) {
            if (juego) juego.otroJugadorSalta();
        });

        this.socket.on("estadoJuego", function (estado) {
            if (juego) juego.sincronizarEstado(estado);
        });
        this.socket.on("rivalDesconectado", function (datos) {
            console.log("Rival desconectado:", datos);

            if (datos.email === cli.email) return;

            if (juego) {
                juego.juegoTerminado = true;
            }

            if (cw) {
                cw.mostrarCierrePorAbandono();
            }
        });
        this.socket.on("partidaAbandonada", function () {
            if (cw) cw.mostrarCierrePorAbandono();
            if (juego) juego.juegoTerminado = true;
        });


    };

    this.crearPartida = function () {
        this.socket.emit("crearPartida", { "email": this.email });
    }

    this.unirAPartida = function (codigo) {
        this.socket.emit("unirAPartida", {
            "email": this.email, "codigo": codigo
        });
    }

    this.cancelarPartida = function () {
        if (this.codigo) {
            this.socket.emit("cancelarPartida", { "email": this.email, "codigo": this.codigo });
            console.log("Petición de cancelación enviada.");
            this.codigo = undefined;
        }
    }

    this.iniciarJuego = function () {
        this.socket.emit("iniciarJuego", {
            "email": this.email,
            "codigo": this.codigo
        });
    }

    this.saltar = function () {
        this.socket.emit("saltar", {
            "email": this.email,
            "codigo": this.codigo
        });
    }
    this.ini();
}

Juego.prototype.sincronizarEstado = function (estado) {
    this.personajeA.y = estado.jugadores.A.y;
    this.personajeA.vy = estado.jugadores.A.vy;
    this.personajeA.saltando = estado.jugadores.A.saltando;
    this.personajeA.puntuacion = estado.jugadores.A.puntuacion;

    this.personajeB.y = estado.jugadores.B.y;
    this.personajeB.vy = estado.jugadores.B.vy;
    this.personajeB.saltando = estado.jugadores.B.saltando;
    this.personajeB.puntuacion = estado.jugadores.B.puntuacion;

    this.obstaculos = estado.obstaculos;
    this.juegoTerminado = estado.juegoTerminado;
};

