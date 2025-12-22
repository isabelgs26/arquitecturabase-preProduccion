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
            if (cw) cw.mostrarPantallaJuego(soyJugadorA);
        });

        this.socket.on("errorIniciarJuego", function (datos) {
            console.log("Error al iniciar juego:", datos.razon);
            if (cw) cw.mostrarModal("No se pudo iniciar el juego. Código de error: " + datos.razon);
        });

        this.socket.on("jugadorSalto", function (datos) {
            if (juego) juego.otroJugadorSalta();
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