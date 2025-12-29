function Juego() {
    this.canvas = null;
    this.ctx = null;
    this.ancho = 1200;
    this.alto = 500;
    this.bucle = null;
    this.soyJugadorA = false;
    this.obstaculos = [];
    this.juegoTerminado = false;

    this.anchoP = 80;
    this.altoP = 130;

    this.sueloY = 350;
    this.alturaMaxSalto = 150;

    this.personajeA = { x: 100, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 };
    this.personajeB = { x: 100, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 };

    this.gravedad = 0.8;
    this.fuerzaSalto = -20;

    // Imágenes
    this.imgPersonajeA = new Image();
    this.imgPersonajeA.src = "img/personajeA.png";

    this.imgPersonajeB = new Image();
    this.imgPersonajeB.src = "img/personajeB.png";

    this.videoFondo = document.createElement("video");
    this.videoFondo.src = "video/fondo.mp4";
    this.videoFondo.muted = true;
    this.videoFondo.loop = true;
    this.videoFondo.setAttribute("playsinline", "");

    // Obstáculos precargados
    this.imgObstaculos = {
        obstaculoA: new Image(),
        obstaculoB: new Image(),
        obstaculoC: new Image()
    };
    this.imgObstaculos.obstaculoA.src = "img/obstaculoA.png";
    this.imgObstaculos.obstaculoB.src = "img/obstaculoB.png";
    this.imgObstaculos.obstaculoC.src = "img/obstaculoC.png";

    this.sonidoSalto = new Audio("audio/salto.mp3");
    this.sonidoCrash = new Audio("audio/crash.mp3");
    this.musicaFondo = new Audio("audio/musica.mp3");

    this.musicaFondo.loop = true;
    this.musicaFondo.volume = 0.2;

    this.ini = function () {
        this.canvas = document.getElementById("miCanvas");
        this.canvas.width = this.ancho;
        this.canvas.height = this.alto;
        this.ctx = this.canvas.getContext("2d");

        let juego = this;
        document.addEventListener("keydown", function (e) {
            if (e.code === "Space") {
                juego.saltar();
            }
        });
        $("#btnSalirJuego").click(function () {
            if (ws && ws.socket) ws.socket.emit("abandonarPartida");
        });
    }

    this.iniciar = function (soyA) {
        this.soyJugadorA = soyA;
        if (!this.canvas) this.ini();

        this.musicaFondo.currentTime = 0;
        this.musicaFondo.play().catch(e => console.log("Haz click en la web para activar audio"));

        this.videoFondo.play().catch(e => console.log("Error video fondo:", e));

        if (this.bucle) cancelAnimationFrame(this.bucle);
        this.bucle = requestAnimationFrame(() => this.actualizar());
    }

    this.saltar = function () {
        let miPersonaje = this.soyJugadorA ? this.personajeA : this.personajeB;

        if (miPersonaje.contadorSaltos < 2) {
            miPersonaje.saltando = true;
            miPersonaje.vy = this.fuerzaSalto;
            miPersonaje.contadorSaltos++;

            // SONIDO SALTO
            this.sonidoSalto.currentTime = 0; // Reiniciar por si salta muy seguido
            this.sonidoSalto.play();

            if (ws) ws.saltar();
        }
    }

    this.actualizar = function () {
        if (this.juegoTerminado) return;
        this.aplicarFisica(this.personajeA);
        this.aplicarFisica(this.personajeB);
        this.dibujar();
        this.bucle = requestAnimationFrame(() => this.actualizar());
    }

    this.aplicarFisica = function (jugador) {
        if (jugador.y < this.sueloY || jugador.saltando) {
            jugador.vy += this.gravedad;
            jugador.y += jugador.vy;
        }
        if (jugador.y >= this.sueloY) {
            jugador.y = this.sueloY;
            jugador.vy = 0;
            jugador.saltando = false;
            jugador.contadorSaltos = 0;
        }
    }

    this.dibujar = function () {
        this.ctx.fillStyle = "#87CEEB";
        this.ctx.fillRect(0, 0, this.ancho, this.alto);

        if (this.videoFondo.readyState >= 2) {
            this.ctx.drawImage(this.videoFondo, 0, 0, this.ancho, this.alto);
        }
        // Personajes
        if (this.soyJugadorA) {
            this.dibujarPersonaje(this.personajeA, this.imgPersonajeA, "red");
        } else {
            this.dibujarPersonaje(this.personajeB, this.imgPersonajeB, "blue");
        }

        // Obstáculos
        this.dibujarObstaculos();

        // Puntuaciones
        this.ctx.save();
        this.ctx.fillStyle = "black";
        this.ctx.font = "bold 30px Arial";
        this.ctx.textAlign = "left";

        if (this.soyJugadorA) {
            this.ctx.fillText("Jugador A: " + this.personajeA.puntuacion, 30, 50);
        } else {
            this.ctx.fillText("Jugador B: " + this.personajeB.puntuacion, 30, 50);
        }

        this.ctx.restore();
    }
    this.dibujarPersonaje = function (pj, img, colorBackup) {
        if (img.complete && img.naturalWidth !== 0) {
            this.ctx.drawImage(img, pj.x, pj.y, this.anchoP, this.altoP);
        } else {
            this.ctx.fillStyle = colorBackup;
            this.ctx.fillRect(pj.x, pj.y, this.anchoP, this.altoP);
        }
    }

    this.dibujarObstaculos = function () {
        if (!this.obstaculos) return;
        let ajusteAltura = 35;

        let sueloReal = this.sueloY + this.altoP;

        this.obstaculos.forEach(obstaculo => {
            let yAjustada = (sueloReal - obstaculo.alto) - ajusteAltura;

            if (obstaculo.img && obstaculo.img.complete && obstaculo.img.naturalWidth !== 0) {
                this.ctx.drawImage(obstaculo.img, obstaculo.x, yAjustada, obstaculo.ancho, obstaculo.alto);
            } else {
                if (obstaculo.tipo === "obstaculoA") this.ctx.fillStyle = "red";
                else if (obstaculo.tipo === "obstaculoB") this.ctx.fillStyle = "yellow";
                else this.ctx.fillStyle = "purple";

                this.ctx.fillRect(obstaculo.x, yAjustada, obstaculo.ancho, obstaculo.alto);
            }
        });
    }

    this.finalizarPartida = function (datos) {
        this.juegoTerminado = true;

        this.musicaFondo.pause();
        this.videoFondo.pause();
        if (datos.puntosA < 2000 && datos.puntosB < 2000) {
            this.sonidoCrash.play();
        }
        let ganadorServidor = datos.ganador;
        let mensaje = "";
        let yoGano = false;

        if (ganadorServidor === "EMPATE") {
            mensaje = "Nadie se chocó y tenéis los mismos puntos.";
        }
        else {
            if (this.soyJugadorA && ganadorServidor === "A") yoGano = true;
            if (!this.soyJugadorA && ganadorServidor === "B") yoGano = true;

            if (yoGano) {
                mensaje = "El rival se chocó o tuviste más puntos.";
            } else {
                mensaje = "Te chocaste o tuviste menos puntos.";
            }
        }

        // Llamamos a la ventana bonita de ControlWeb
        if (typeof cw !== 'undefined') {
            cw.mostrarModalGameOver(yoGano, mensaje, datos.puntosA, datos.puntosB);
        } else {
            alert((yoGano ? "GANASTE" : "PERDISTE") + "\n" + mensaje);
        }
    }
    this.sincronizarEstado = function (estado) {
        if (!estado || !estado.jugadores) return;

        this.personajeA.puntuacion = estado.jugadores.A.puntuacion;
        this.personajeB.puntuacion = estado.jugadores.B.puntuacion;

        this.personajeA.x = estado.jugadores.A.x;
        this.personajeB.x = estado.jugadores.B.x;

        if (this.soyJugadorA) {
            this.personajeB.y = estado.jugadores.B.y;
        }
        else {
            this.personajeA.y = estado.jugadores.A.y;
        }

        this.obstaculos = (estado.obstaculos || []).map(o => ({
            ...o,
            activo: true,
            img: this.imgObstaculos[o.tipo]
        }));

        this.juegoTerminado = estado.juegoTerminado;
    }
}