function ClienteWS() {
    this.socket = undefined;
    this.email = undefined;
    this.codigo = undefined;

    this.ini = function () {
        this.socket = io.connect();
        this.lanzarServidorWS();
    }

    this.lanzarServidorWS = function () {
        let cli = this;

        this.socket.on("partidaCreada", function (datos) {
            console.log("Partida creada con código:", datos.codigo);
            cli.codigo = datos.codigo;
            cw.mostrarEsperandoRival();
        });

        this.socket.on("unidoAPartida", function (datos) {
            console.log("Te has unido a la partida con código:", datos.codigo);
            cli.codigo = datos.codigo;
            cw.mostrarEsperandoRival();
        });

        this.socket.on("listaPartidas", function (lista) {
            console.log("Lista de partidas actualizada:", lista);
            cw.mostrarListaPartidas(lista);
        });

        this.socket.on("partidaCancelada", function () {
            cli.codigo = undefined;
            cw.mostrarCierrePorAbandono();
        });

        this.socket.on("juegoIniciado", function (datos) {
            console.log("¡Juego iniciado!", datos);
            cw.mostrarPantallaJuego(datos.codigo);
        });

        this.socket.on("errorIniciarJuego", function (datos) {
            console.log("Error al iniciar juego:", datos.razon);
            cw.mostrarError("No se pudo iniciar el juego");
        });

        this.socket.on("estadoPartidaActualizado", function (datos) {
            console.log("Estado de partida actualizado:", datos.estado);

            if (datos.estado === "completa") {
                let esCreador = (datos.jugadores[0] === cli.email);
                cw.mostrarEsperandoInicio(datos.codigo, esCreador);
            }
        });
    }

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

    this.ini();
}