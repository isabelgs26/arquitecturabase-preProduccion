function Juego() {
    this.canvas = null;
    this.ctx = null;
    this.ancho = 1200;
    this.alto = 800;
    this.bucle = null;
    this.soyJugadorA = false;
    this.obstaculos = [];
    this.juegoTerminado = false;

    this.anchoP = 80;
    this.altoP = 130;

    this.sueloY = 500;
    this.alturaMaxSalto = 300;

    this.personajeA = { x: 50, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0 };
    this.personajeB = { x: 150, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0 };

    this.gravedad = 0.4;
    this.fuerzaSalto = -15;


    // Imágenes
    this.imgPersonajeA = new Image();
    this.imgPersonajeA.src = "img/personajeA.png";

    this.imgPersonajeB = new Image();
    this.imgPersonajeB.src = "img/personajeB.png";

    this.imgFondo = new Image();
    this.imgFondo.src = "img/paisajeJuego.png";

    // Obstáculos precargados
    this.imgObstaculos = {
        obstaculoA: new Image(),
        obstaculoB: new Image(),
        obstaculoC: new Image()
    };
    this.imgObstaculos.obstaculoA.src = "img/obstaculoA.png";
    this.imgObstaculos.obstaculoB.src = "img/obstaculoB.png";
    this.imgObstaculos.obstaculoC.src = "img/obstaculoC.png";

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
            ws.socket.emit("abandonarPartida");
        });

    }

    this.iniciar = function (soyA) {
        this.soyJugadorA = soyA;
        if (!this.canvas) this.ini();
        this.bucle = requestAnimationFrame(() => this.actualizar());
    }

    this.saltar = function () {
        let miPersonaje = this.soyJugadorA ? this.personajeA : this.personajeB;
        if (!miPersonaje.saltando) {
            miPersonaje.saltando = true;
            miPersonaje.vy = this.fuerzaSalto;
        }
    }

    this.otroJugadorSalta = function () {
        let otroPersonaje = this.soyJugadorA ? this.personajeB : this.personajeA;
        if (!otroPersonaje.saltando) {
            otroPersonaje.saltando = true;
            otroPersonaje.vy = this.fuerzaSalto;
        }
    }

    this.actualizar = function () {
        if (this.juegoTerminado) return;

        this.aplicarFisica(this.personajeA);
        this.aplicarFisica(this.personajeB);

        this.actualizarObstaculos();
        this.verificarColisiones();

        this.dibujar();
        requestAnimationFrame(() => this.actualizar());
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
        }
    }

    this.dibujar = function () {
        this.ctx.fillStyle = "#87CEEB";
        this.ctx.fillRect(0, 0, this.ancho, this.alto);

        if (this.imgFondo.complete && this.imgFondo.naturalWidth !== 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.ctx.drawImage(this.imgFondo, 0, 0, this.ancho, this.alto);
            this.ctx.restore();
        }

        // Personajes
        if (this.imgPersonajeA.complete && this.imgPersonajeA.naturalWidth !== 0) {
            this.ctx.drawImage(this.imgPersonajeA, this.personajeA.x, this.personajeA.y, this.anchoP, this.altoP);
        } else {
            this.ctx.fillStyle = "red";
            this.ctx.fillRect(this.personajeA.x, this.personajeA.y, this.anchoP, this.altoP);
        }

        if (this.imgPersonajeB.complete && this.imgPersonajeB.naturalWidth !== 0) {
            this.ctx.drawImage(this.imgPersonajeB, this.personajeB.x, this.personajeB.y, this.anchoP, this.altoP);
        } else {
            this.ctx.fillStyle = "blue";
            this.ctx.fillRect(this.personajeB.x, this.personajeB.y, this.anchoP, this.altoP);
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


    this.actualizarObstaculos = function () {
        this.obstaculos = this.obstaculos.filter(o => o.activo !== false);
    }

    this.dibujarObstaculos = function () {
        this.obstaculos.forEach(obstaculo => {
            // Verificamos si la imagen existe Y si está cargada
            if (obstaculo.img && obstaculo.img.complete && obstaculo.img.naturalWidth !== 0) {
                this.ctx.drawImage(obstaculo.img, obstaculo.x, obstaculo.y, obstaculo.ancho, obstaculo.alto);
            }
            // Si no hay imagen o falló la carga, dibujamos un cuadrado de color
            else {
                if (obstaculo.tipo === "obstaculoA") this.ctx.fillStyle = "red";
                else if (obstaculo.tipo === "obstaculoB") this.ctx.fillStyle = "yellow";
                else this.ctx.fillStyle = "purple"; // Obstáculo C

                this.ctx.fillRect(obstaculo.x, obstaculo.y, obstaculo.ancho, obstaculo.alto);
            }
        });
    }

    this.verificarColisiones = function () {
        for (let obstaculo of this.obstaculos) {
            if (!obstaculo.activo) continue;

            // Colisión jugador A
            if (!this.juegoTerminado &&
                this.personajeA.x < obstaculo.x + obstaculo.ancho &&
                this.personajeA.x + this.anchoP > obstaculo.x &&
                this.personajeA.y < obstaculo.y + obstaculo.alto &&
                this.personajeA.y + this.altoP > obstaculo.y
            ) {
                this.juegoTerminado = true;
            }

            // Colisión jugador B
            if (!this.juegoTerminado &&
                this.personajeB.x < obstaculo.x + obstaculo.ancho &&
                this.personajeB.x + this.anchoP > obstaculo.x &&
                this.personajeB.y < obstaculo.y + obstaculo.alto &&
                this.personajeB.y + this.altoP > obstaculo.y
            ) {
                this.juegoTerminado = true;
            }

            // Puntuación jugador A
            if (!obstaculo.esquivadoA && this.personajeA.x > obstaculo.x + obstaculo.ancho) {
                this.personajeA.puntuacion += obstaculo.puntuacion;
                obstaculo.esquivadoA = true;
            }

            // Puntuación jugador B
            if (!obstaculo.esquivadoB && this.personajeB.x > obstaculo.x + obstaculo.ancho) {
                this.personajeB.puntuacion += obstaculo.puntuacion;
                obstaculo.esquivadoB = true;
            }
        }

        if (this.juegoTerminado) {
            setTimeout(() => this.mostrarGanador(), 100);
        }
    }

    this.mostrarGanador = function () {
        let mensaje;
        if (this.personajeA.puntuacion > this.personajeB.puntuacion) {
            mensaje = `Jugador A gana con ${this.personajeA.puntuacion} puntos!`;
        } else if (this.personajeB.puntuacion > this.personajeA.puntuacion) {
            mensaje = `Jugador B gana con ${this.personajeB.puntuacion} puntos!`;
        } else {
            mensaje = `Empate! Ambos con ${this.personajeA.puntuacion} puntos`;
        }
        alert(mensaje);
    }

    this.sincronizarEstado = function (estado) {
        this.personajeA = { ...this.personajeA, ...estado.jugadores.A };
        this.personajeB = { ...this.personajeB, ...estado.jugadores.B };

        this.obstaculos = estado.obstaculos.map(o => ({
            ...o,
            activo: true,
            img: this.imgObstaculos[o.tipo]
        }));

        this.juegoTerminado = estado.juegoTerminado;
    }



}
