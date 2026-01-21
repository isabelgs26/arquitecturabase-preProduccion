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
            const emailActual = $.cookie("email") || cli.email;
            console.log("emailActual:", emailActual, "datos.creador:", datos.creador);
            if (datos.estado === "completa") {
                let esCreador = false;
                if (emailActual && datos.creador) {
                    esCreador = (datos.creador === emailActual);
                }
                console.log("¿Es creador?", esCreador);
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
        this.socket.on("jugadorSalioDelLobby", function (datos) {
            $("#btnReiniciarJuego").prop("disabled", true).addClass("disabled").text("El rival se ha ido");
            if (!$("#modalGameOver").is(":visible")) {
                cli.codigo = undefined;
            }
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
        this.socket.on("rivalSalio", function (datos) {
            if (cw) cw.mostrarEsperandoRival();
        });
        this.socket.on("finPartida", function (datos) {
            if (juego) juego.finalizarPartida(datos);
        });
        this.socket.on("juegoReiniciado", function (datos) {
            console.log("¡Juego reiniciado!", datos);
            if (juego) {
                juego.reiniciarPartida();
            }
        });
        this.socket.on("solicitudRevanchaRecibida", function (datos) {
            console.log("El rival solicita revancha");
            if (cw) cw.mostrarSolicitudRivalRevancha();
        });
        this.socket.on("revanchaAceptada", function (datos) {
            console.log("Revancha aceptada por ambos!", datos);
            $("#modalGameOver").modal("hide");
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
            const canvas = document.getElementById("miCanvas");
            if (canvas) canvas.style.display = "block";
            let soyJugadorA = (datos.creador === cli.email);
            if (juego) {
                juego.reiniciarPartida();
            } else {
                juego = new Juego();
                juego.iniciar(soyJugadorA);
            }
            if (cw) cw.mostrarPantallaJuego(soyJugadorA);
        });
        this.socket.on("revanchaRechazada", function () {
            console.log("Revancha rechazada");
            if (cw) cw.mostrarRivalRechazoRevancha();
        });
        this.socket.on("rivalAbandonoDuranteRevancha", function () {
            console.log("El rival se fue durante la revancha");
            if (cw) cw.mostrarRivalAbandonoRevancha();
        });
        this.socket.on("rivalSalioDespuesDeFin", function () {
            console.log("El rival ha salido tras finalizar.");
            if (cw) {
                cw.gestionarSalidaRivalFin();
            }
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
