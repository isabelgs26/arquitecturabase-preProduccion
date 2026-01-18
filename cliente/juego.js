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
    this.personajeA = { x: 100, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 };
    this.personajeB = { x: 100, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 };
    this.gravedad = 0.8;
    this.fuerzaSalto = -20;
    this.particulas = [];
    this.imgPersonajeA = new Image();
    this.imgPersonajeA.src = "img/personajeA.png";
    this.imgPersonajeB = new Image();
    this.imgPersonajeB.src = "img/personajeB.png";
    this.videoFondo = document.createElement("video");
    this.videoFondo.src = "video/fondo.mp4";
    this.videoFondo.muted = true;
    this.videoFondo.loop = true;
    this.videoFondo.setAttribute("playsinline", "");
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
        this.canvas.addEventListener("mousedown", function () {
            juego.saltar();
        });
        this.canvas.addEventListener("touchstart", function (e) {
            e.preventDefault();
        }, { passive: false });
        $("#btnSalirJuego").click(function () {
            if (ws && ws.socket) {
                ws.socket.emit("abandonarPartida");
                setTimeout(() => {
                    if (cw) cw.mostrarHome($.cookie("nick"));
                }, 300);
            }
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
            this.sonidoSalto.currentTime = 0;
            this.sonidoSalto.play();
            let piesX = miPersonaje.x + this.anchoP / 2;
            let piesY = this.sueloY + this.altoP;
            this.crearPolvo(piesX, piesY);
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
            if (jugador.vy > 0) {
                let piesX = jugador.x + this.anchoP / 2;
                let piesY = this.sueloY + this.altoP;
                this.crearPolvo(piesX, piesY);
            }
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
        if (this.soyJugadorA) {
            this.dibujarPersonaje(this.personajeA, this.imgPersonajeA, "red");
        } else {
            this.dibujarPersonaje(this.personajeB, this.imgPersonajeB, "blue");
        }
        this.dibujarObstaculos();
        this.gestionarParticulas();
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
        let huboChoque = (datos.puntosA < 2000 && datos.puntosB < 2000);
        if (huboChoque) {
            this.sonidoCrash.play();
        }
        if (ganadorServidor === "EMPATE") {
            if (huboChoque) {
                mensaje = "¡Vaya tortazo! Los dos os habéis chocado a la vez.";
            } else {
                mensaje = "¡Increíble! Empate sin choques.";
            }
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
        if (typeof cw !== 'undefined') {
            cw.mostrarModalGameOver(yoGano, mensaje, datos.puntosA, datos.puntosB, this.soyJugadorA);
        } else {
            alert((yoGano ? "GANASTE" : "PERDISTE") + "\n" + mensaje);
        }
    }
    this.reiniciarPartida = function () {
        this.juegoTerminado = false;
        this.obstaculos = [];
        this.particulas = [];
        this.personajeA = { x: 100, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 };
        this.personajeB = { x: 100, y: this.sueloY, vy: 0, saltando: false, puntuacion: 0, contadorSaltos: 0 };
        this.musicaFondo.currentTime = 0;
        this.musicaFondo.play().catch(e => console.log("Haz click en la web para activar audio"));
        this.videoFondo.currentTime = 0;
        this.videoFondo.play().catch(e => console.log("Error video fondo:", e));
        if (this.bucle) cancelAnimationFrame(this.bucle);
        this.bucle = requestAnimationFrame(() => this.actualizar());
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
    this.crearPolvo = function (x, y) {
        for (let i = 0; i < 10; i++) {
            this.particulas.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * -3,
                vida: 30 + Math.random() * 20,
                tamano: 5 + Math.random() * 5,
                color: "white"
            });
        }
    }
    this.gestionarParticulas = function () {
        for (let i = this.particulas.length - 1; i >= 0; i--) {
            let p = this.particulas[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vida--;
            p.tamano *= 0.95;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, Math.max(0, p.tamano), 0, Math.PI * 2);
            this.ctx.fill();
            if (p.vida <= 0 || p.tamano < 0.5) {
                this.particulas.splice(i, 1);
            }
        }
    }
}