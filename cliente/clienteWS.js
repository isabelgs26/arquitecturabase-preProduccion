function ClienteWS() {
    this.socket = undefined;
    this.email = undefined;
    this.codigo = undefined;
    let juego = null;

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

            $("#miModal").modal("hide");

            const canvas = document.getElementById("miCanvas");
            canvas.style.display = "block";

            let soyJugadorA = (datos.creador === cli.email);

            juego = new Juego();
            juego.iniciar(soyJugadorA);

            if (cw) cw.mostrarPantallaJuego(soyJugadorA);
        });


        this.socket.on("errorIniciarJuego", function (datos) {
            if (datos.razon === "YA_INICIADA") {
                console.warn("La partida ya estaba iniciada, ignorando.");
                return;
            }
            if (cw) {
                cw.mostrarModal("No se pudo iniciar el juego: " + datos.razon);
            }
        });


        this.socket.on("estadoJuego", function (estado) {
            if (juego) juego.sincronizarEstado(estado);
        });
        this.socket.on("rivalDesconectado", function (datos) {
            if (datos.email === cli.email) return;
            cli.codigo = undefined;

            if (juego) juego.juegoTerminado = true;

            if (cw) {
                cw.mostrarCierrePorAbandono();
            }
        });
        this.socket.on("partidaAbandonada", function () {
            if (cw) cw.mostrarCierrePorAbandono();
            if (juego) juego.juegoTerminado = true;
            cli.codigo = undefined;
        });
        this.socket.on("partidaEliminadaPorCreador", function () {
            if (juego) juego.juegoTerminado = true;
            if (cw) cw.mostrarModal("La partida fue eliminada por el creador");
            cli.codigo = undefined;
        });

        this.socket.on("rivalAbandonoAntesInicio", function () {
            if (cw) cw.mostrarEsperandoRival();
            cli.codigo = undefined;

        });

        this.socket.on("finPartida", function (datos) {
            if (juego) juego.juegoTerminado = true;

            const soyCreador = (cli.email === ws.email && juego);
            let resultado = "Empate";

            if (datos.ganador === "A") {
                resultado = soyCreador ? "Has ganado" : "Has perdido";
            } else if (datos.ganador === "B") {
                resultado = soyCreador ? "Has perdido" : "Has ganado";
            }

            cw.mostrarFinPartida(resultado, datos);
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
        if (!this.codigo) return;

        const btn = document.getElementById("btnSalirJuego");
        if (btn) btn.disabled = true;

        this.socket.emit("cancelarPartida");
    };



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


