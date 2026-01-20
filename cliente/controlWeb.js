function ControlWeb() {
    let cw = this;
    this.partidasCache = [];
    this.comprobarSesion = function () {
        let nick = $.cookie("nick");
        if (nick) {
            cw.mostrarHome(nick);
            if (!ws.email) {
                ws.email = $.cookie("email");
            }
        } else {
            cw.mostrarAcceso();
            cw.ocultarBotonCerrarSesion();
        }
    };
    this.mostrarAcceso = function () {
        this.limpiar();
        this.ocultarBotonCerrarSesion();
        let html = `
        <div class="card mt-3" style="max-width: 500px; margin: 0 auto;">
            <div class="card-body">
                <h5 class="text-center mb-4" style="color: black">Acceder al Sistema</h5>
                <div class="form-group">
                    <label for="emailAcceso" style="color: white">Email:</label>
                    <input type="email" class="form-control" id="emailAcceso" placeholder="tu@email.com" style="color: black; background: white;">
                </div>
                <div class="form-group">
                    <label for="passwordAcceso" style="color: white">Contraseña:</label>
                    <input type="password" class="form-control" id="passwordAcceso" placeholder="Tu contraseña" style="color: black; background: white;">
                </div>
                <button id="btnLogin" class="btn btn-primary btn-block mb-2">Iniciar Sesión</button>
                <button id="btnMostrarRegistro" class="btn btn-outline-secondary btn-block">Quiero Registrarme</button>
                <hr>
                <div style="text-align:center; margin-top: 15px;">
                    <p style="color: white; margin-bottom: 10px;">O inicia sesión con:</p>
                    <a href="/auth/google" class="btn btn-block" style="background: white; color: #333; border: 1px solid #ddd; font-weight: 600; display: flex; align-items: center; justify-content: center;">
                        <img src="https://img.icons8.com/color/48/google-logo.png" alt="" style="height:24px; margin-right: 10px;">
                        Iniciar sesión con Google
                    </a>
                </div>
            </div>
        </div>`;
        $("#au").html(html);
        $("#btnLogin").on("click", function (e) {
            e.preventDefault();
            let email = $("#emailAcceso").val().trim();
            let password = $("#passwordAcceso").val().trim();
            if (email && password) {
                rest.loginUsuario(email, password);
            } else {
                cw.mostrarMensaje("Por favor, completa todos los campos para iniciar sesión", "error");
            }
        });
        $("#btnMostrarRegistro").on("click", function (e) {
            e.preventDefault();
            cw.mostrarRegistro();
        });
    };
    this.mostrarRegistro = function () {
        this.limpiar();
        $("#au").load("./registro.html", function () {
            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();
                let email = $("#email").val().trim();
                let pwd = $("#pwd").val().trim();
                let nombre = $("#nombre").val().trim();
                let apellidos = $("#apellidos").val().trim();
                if (email && pwd) {
                    rest.registrarUsuario(email, pwd, nombre, apellidos);
                } else {
                    cw.mostrarMensaje("Rellena email y contraseña.", "error");
                }
            });
        });
    };
    this.mostrarHome = function (nick) {
        this.limpiar();
        this.mostrarBotonCerrarSesion();
        let nickUsuario = nick || $.cookie("nick");
        cw.mostrarMensaje("Bienvenido de nuevo, " + nickUsuario, "exito");
        this.mostrarCrearPartida();
    };
    this.salir = function () {
        $.removeCookie("nick");
        $.removeCookie("email");
        location.reload();
    };
    this.mostrarBotonCerrarSesion = function () {
        $("#menuJugar").show();
        $("#menuGestion").show();
        $("#cerrarSesionItem").show();
        $(".nav-item").first().hide();
    };
    this.ocultarBotonCerrarSesion = function () {
        $("#menuJugar").hide();
        $("#menuGestion").hide();
        $("#cerrarSesionItem").hide();
        $(".nav-item").first().show();
    };
    this.mostrarCrearPartida = function () {
        this.limpiar();
        let html = `
        <div id="zonaPartidas" class="row justify-content-center">
            <div class="col-md-8">
                <div class="card mt-4">
                    <div class="card-header text-center">
                        <h3>🎮 Zona de Juego</h3>
                    </div>
                    <div class="card-body text-center">
                        <h5>Crear una nueva partida</h5>
                        <button id="btnCrearPartida" class="btn btn-success btn-lg mb-4">Crear Partida</button>
                        <hr>
                        <h5>Unirse a una partida existente</h5>
                        <div id="listaPartidas" class="mt-3">
                            <div class="alert alert-secondary">Buscando partidas disponibles...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        $("#au").html(html);
        $("#btnCrearPartida").on("click", function () {
            ws.crearPartida();
        });
        if (cw.partidasCache.length > 0) {
            cw.mostrarListaPartidas(cw.partidasCache);
        }
    };
    this.mostrarListaPartidas = function (lista) {
        cw.partidasCache = lista;
        let listaDiv = $("#listaPartidas");
        if (listaDiv.length === 0) {
            return;
        }
        listaDiv.empty();
        if (lista.length === 0) {
            listaDiv.html('<div class="alert alert-info">No hay partidas disponibles en este momento. ¡Crea una tú!</div>');
        } else {
            let ul = '<div class="list-group">';
            lista.forEach(function (partida) {
                ul += `
                <div class="list-group-item d-flex justify-content-between align-items-center" style="background: rgba(0,0,0,0.5); color: white; margin-bottom: 5px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="min-width: 0; margin-right: 10px;"> <div class="text-truncate" title="${partida.creador}">
                            <strong>Creador:</strong> ${partida.creador}
                        </div>
                        <small class="text-white-50">Código: ${partida.codigo}</small>
                    </div>
                    <button class="btn btn-primary btn-sm" style="flex-shrink: 0;" onclick="ws.unirAPartida('${partida.codigo}')">Unirse</button>
                </div>`;
            });
            ul += '</div>';
            listaDiv.html(ul);
        }
    };
    this.mostrarEsperandoRival = function () {
        this.limpiar();
        let codigoStr = ws.codigo || '...';
        let html = `
        <div class="card mt-4 text-center" style="max-width: 600px; margin: 0 auto;">
            <div class="card-header">
                <h3>⌛ Esperando rival...</h3>
            </div>
            <div class="card-body">
                <p class="mb-3">Comparte este código con un amigo:</p>
                <div class="d-flex justify-content-center align-items-center mb-4">
                    <h2 class="mb-0">
                        <span id="codigoPartida" class="badge badge-primary p-3" 
                              style="cursor:pointer; font-size: 2rem;" 
                              title="Click para copiar" data-toggle="tooltip">
                            ${codigoStr}
                        </span>
                    </h2>
                </div>
                <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                <p class="text-muted">Esperando conexión...</p>
                <hr>
                <button id="btnCancelarPartida" class="btn btn-danger">Cancelar Partida</button>
                <div id="copiadoMsg" class="mt-3 text-success font-weight-bold" style="display:none;">
                    ¡Código copiado!
                </div>
            </div>
        </div>`;
        $("#au").html(html);
        $("#btnCancelarPartida").on("click", function () {
            ws.cancelarPartida();
            cw.mostrarCrearPartida();
        });
        $("#codigoPartida").on("click", function () {
            let codigo = $(this).text().trim();
            navigator.clipboard.writeText(codigo).then(() => {
                $("#copiadoMsg").fadeIn().delay(1000).fadeOut();
            });
        });
    };
    this.mostrarEsperandoInicio = function (codigo, esCreador) {
        this.limpiar();
        console.log("[mostrarEsperandoInicio] codigo:", codigo, "esCreador:", esCreador);
        let html = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-success text-white text-center">
                            <h3>✅ ¡Partida Completa!</h3>
                        </div>
                        <div class="card-body text-center">
                            <p class="lead">Ambos jugadores están conectados.</p>
                            <p><strong>Código:</strong> ${codigo}</p>
                            <hr>
                            ${esCreador ?
                '<button id="btnIniciarJuego" class="btn btn-success btn-lg btn-block pulse-button">🎮 INICIAR JUEGO</button>' :
                '<div class="alert alert-info">⏳ Esperando que el creador inicie la partida...</div>'
            }
                            <button id="btnCancelarPartida" class="btn btn-outline-danger mt-3">Salir</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        $("#au").html(html);
        if (esCreador) {
            $("#btnIniciarJuego").show();
            $("#btnIniciarJuego").on("click", function () {
                ws.iniciarJuego();
            });
        } else {
            $("#btnIniciarJuego").hide();
        }
        $("#btnCancelarPartida").click(function () {
            ws.cancelarPartida(codigo);
            cw.mostrarCrearPartida();
        });
    };
    this.mostrarObtenerUsuarios = function () {
        this.limpiar();
        let html = `
        <div class="card">
            <div class="card-header"><h3>Listado de Usuarios</h3></div>
            <div class="card-body">
                 <button id="btnOU" class="btn btn-info mb-3">Refrescar Lista</button>
                 <div id="listaUsuarios"></div>
            </div>
        </div>`;
        $("#au").html(html);
        const cargarUsuarios = () => {
            $.getJSON("/obtenerUsuarios", function (data) {
                let listaDiv = $("#listaUsuarios");
                listaDiv.empty();
                if (data.length === 0) {
                    listaDiv.html('<div class="alert alert-warning">No hay usuarios registrados</div>');
                } else {
                    let tabla = `
                    <div class="table-responsive">
                        <table class="table table-striped table-dark">
                            <thead><tr><th>Nick</th><th>Email</th><th>ID</th></tr></thead>
                            <tbody>`;
                    data.forEach(u => {
                        tabla += `<tr><td>${u.nombre || u.nick}</td><td>${u.email}</td><td><small>${u._id}</small></td></tr>`;
                    });
                    tabla += `</tbody></table></div>`;
                    listaDiv.html(tabla);
                }
            });
        };
        $("#btnOU").on("click", cargarUsuarios);
        cargarUsuarios();
    };
    this.mostrarNumeroUsuarios = function () {
        this.limpiar();
        let html = `
        <div class="card text-center" style="max-width: 400px; margin: 0 auto;">
            <div class="card-body">
                <h3>Estadísticas</h3>
                <button id="btnNU" class="btn btn-warning btn-lg mt-3">Ver Número de Usuarios</button>
            </div>
        </div>`;
        $("#au").html(html);
        $("#btnNU").on("click", function () {
            rest.numeroUsuarios();
        });
    };
    this.mostrarUsuarioActivo = function () {
        this.limpiar();
        let html = `
        <div class="card" style="max-width: 500px; margin: 0 auto;">
             <div class="card-header"><h3>Consultar Estado</h3></div>
             <div class="card-body">
                <div class="form-group">
                    <label>Email del usuario:</label>
                    <input type="text" class="form-control" id="emailConsultar" placeholder="usuario@email.com" style="color:black; background:white;">
                </div>
                <button id="btnUA" class="btn btn-secondary btn-block">Consultar</button>
                <div id="resultadoEstado" class="mt-3"></div>
             </div>
        </div>`;
        $("#au").html(html);
        $("#btnUA").on("click", function () {
            let email = $("#emailConsultar").val().trim();
            if (email) {
                $.getJSON("/usuarioActivo/" + email, function (data) {
                    let resultado = data.activo
                        ? `<div class="alert alert-success">✅ El usuario <strong>${email}</strong> está ACTIVO</div>`
                        : `<div class="alert alert-danger">❌ El usuario <strong>${email}</strong> NO está activo o no existe</div>`;
                    $("#resultadoEstado").html(resultado);
                });
            } else cw.mostrarMensaje("Introduce un email válido", "error");
        });
    };
    this.mostrarCierrePorAbandono = function () {
        this.limpiar();
        let html = `
        <style>
            .btn-hover-effect {
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .btn-hover-effect:before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                transform: translate(-50%, -50%);
                transition: width 0.6s, height 0.6s;
            }
            .btn-hover-effect:hover:before {
                width: 300px;
                height: 300px;
            }
            .btn-hover-effect:hover {
                transform: translateY(-3px) scale(1.05);
                box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
            }
        </style>
        <div class="modal fade show" id="modalAbandono" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false" style="display: block; background: rgba(0,0,0,0.7);">
            <div class="modal-dialog modal-dialog-centered" role="document" style="max-width: 480px; transform: scale(0.8);">
                <div class="modal-content text-center" style="background: linear-gradient(145deg, #1a1f35 0%, #0f1419 100%); color: white; border: 2px solid #ef4444; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
                    <div class="modal-header justify-content-center text-white" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 18px 18px 0 0; padding: 25px;">
                        <h2 class="modal-title font-weight-bold" style="font-size: 2.2rem; text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(255,255,255,0.3);">🚫 Partida Finalizada</h2>
                    </div>
                    <div class="modal-body" style="padding: 40px 35px; background: rgba(15,20,25,0.5);">
                        <h4 class="mb-4" style="color: #93c5fd; font-size: 1.4rem; font-weight: 700; text-shadow: 0 0 10px rgba(147, 197, 253, 0.5);">Tu rival ha abandonado la partida</h4>
                        <p style="color: #cbd5e1; font-size: 1.1rem; line-height: 1.6; margin-bottom: 0;">
                            La partida ha terminado porque el otro jugador se desconectó o canceló el juego.
                        </p>
                    </div>
                    <div class="modal-footer justify-content-center" style="border: none; padding: 20px 35px 35px; background: rgba(0,0,0,0.2);">
                        <button id="btnVolverJugar" class="btn btn-lg btn-hover-effect" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-weight: 700; min-width: 200px; border: none; box-shadow: 0 5px 20px rgba(59, 130, 246, 0.4); position: relative;">
                            Volver a Jugar 🎮
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        $("#au").html(html);
        $("#btnVolverJugar").on("click", function () {
            $("#modalAbandono").remove();
            cw.mostrarCrearPartida();
        });
    };
    this.mostrarModalGameOver = function (yoGano, mensaje, puntosA, puntosB, soyJugadorA) {
        let titulo = yoGano ? "¡VICTORIA! 🏆" : (mensaje.includes("EMPATE") ? "¡EMPATE! 🤝" : "¡DERROTA! 💀");
        let colorHeader = yoGano ? "#10b981" : (mensaje.includes("EMPATE") ? "#f59e0b" : "#ef4444");
        let colorBg = yoGano ? "rgba(16, 185, 129, 0.15)" : (mensaje.includes("EMPATE") ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)");

        let nombreJugadorA = soyJugadorA ? "Tú" : "Rival";
        let nombreJugadorB = soyJugadorA ? "Rival" : "Tú";

        const maxPuntos = 2000;
        const porcentajeA = Math.min((puntosA / maxPuntos) * 100, 100);
        const porcentajeB = Math.min((puntosB / maxPuntos) * 100, 100);

        const colorBarraA = soyJugadorA ? "#3b82f6" : "#8b5cf6";
        const colorBarraB = soyJugadorA ? "#8b5cf6" : "#3b82f6";

        let html = `
            <style>
                .btn-hover-effect {
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                .btn-hover-effect:before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.3);
                    transform: translate(-50%, -50%);
                    transition: width 0.6s, height 0.6s;
                }
                .btn-hover-effect:hover:before {
                    width: 300px;
                    height: 300px;
                }
                .btn-hover-effect:hover {
                    transform: translateY(-3px) scale(1.05);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
                }
                .confetti {
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: #f0f;
                    position: absolute;
                    animation: confetti-fall 3s linear forwards;
                    z-index: 9999;
                }
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
                .custom-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255,255,255,0.1);
                    border-top-color: #f59e0b;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            <div class="modal fade" id="modalGameOver" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
              <div class="modal-dialog modal-dialog-centered" role="document" style="max-width: 560px; transform: scale(0.8);">
                <div class="modal-content text-center" style="background: linear-gradient(145deg, #1a1f35 0%, #0f1419 100%); color: white; border: 2px solid ${colorHeader}; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
                  <div class="modal-header justify-content-center text-white" style="background: ${colorHeader}; border: none; border-radius: 18px 18px 0 0; padding: 25px;">
                    <h2 class="modal-title font-weight-bold" style="font-size: 2.2rem; text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(255,255,255,0.3);">${titulo}</h2>
                  </div>
                  <div class="modal-body" style="padding: 35px; background: ${colorBg};">
                    <h4 class="mb-4" id="mensajeFin" style="color: #ffffff; font-size: 1.3rem; font-weight: 600; text-shadow: 1px 1px 3px rgba(0,0,0,0.7);">${mensaje}</h4>
                    
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 style="color: ${colorBarraA}; margin: 0; font-weight: 700; font-size: 1.3rem; text-shadow: 0 0 10px ${colorBarraA};">${nombreJugadorA}</h5>
                        <span style="color: #ffffff; font-weight: bold; font-size: 1.4rem; background: ${colorBarraA}; padding: 5px 15px; border-radius: 10px; box-shadow: 0 0 15px ${colorBarraA};">${puntosA}</span>
                      </div>
                      <div style="background: rgba(0,0,0,0.4); border-radius: 12px; height: 35px; overflow: hidden; border: 2px solid rgba(255,255,255,0.2); box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">
                        <div class="progress-bar-animated" style="background: linear-gradient(90deg, ${colorBarraA}, ${colorBarraA}dd); height: 100%; width: 0%; border-radius: 10px; transition: width 1s ease-out; box-shadow: 0 0 20px ${colorBarraA}, inset 0 0 10px rgba(255,255,255,0.3);" data-width="${porcentajeA}"></div>
                      </div>
                    </div>
                    
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 style="color: ${colorBarraB}; margin: 0; font-weight: 700; font-size: 1.3rem; text-shadow: 0 0 10px ${colorBarraB};">${nombreJugadorB}</h5>
                        <span style="color: #ffffff; font-weight: bold; font-size: 1.4rem; background: ${colorBarraB}; padding: 5px 15px; border-radius: 10px; box-shadow: 0 0 15px ${colorBarraB};">${puntosB}</span>
                      </div>
                      <div style="background: rgba(0,0,0,0.4); border-radius: 12px; height: 35px; overflow: hidden; border: 2px solid rgba(255,255,255,0.2); box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">
                        <div class="progress-bar-animated" style="background: linear-gradient(90deg, ${colorBarraB}, ${colorBarraB}dd); height: 100%; width: 0%; border-radius: 10px; transition: width 1s ease-out; box-shadow: 0 0 20px ${colorBarraB}, inset 0 0 10px rgba(255,255,255,0.3);" data-width="${porcentajeB}"></div>
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer justify-content-center" style="border: none; padding: 20px 35px 35px; background: rgba(0,0,0,0.2);">
                    <button type="button" class="btn btn-lg btn-hover-effect" id="btnReiniciarJuego" style="background: linear-gradient(135deg, ${colorHeader}, ${colorHeader}dd); color: white; font-weight: 700; min-width: 200px; border: none; box-shadow: 0 5px 20px ${colorHeader}66; transition: all 0.3s; position: relative;">
                        VOLVER A JUGAR 🔄
                    </button>
                    <button type="button" class="btn btn-lg btn-hover-effect" id="btnSalirAlMenu" style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; font-weight: 600; min-width: 130px; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.4); position: relative;">
                        Salir
                    </button>
                  </div>
                </div>
              </div>
            </div>`;
        $("#modalGameOver").remove();
        $("body").append(html);

        $("#modalGameOver").modal("show");

        if (yoGano && mensaje !== "¡Empate!") {
            setTimeout(() => {
                const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
                for (let i = 0; i < 50; i++) {
                    setTimeout(() => {
                        const confetti = $('<div class="confetti"></div>');
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        confetti.css({
                            left: Math.random() * window.innerWidth + 'px',
                            top: '-20px',
                            background: color,
                            animationDelay: Math.random() * 0.5 + 's',
                            animationDuration: (Math.random() * 2 + 2) + 's'
                        });
                        $('body').append(confetti);
                        setTimeout(() => confetti.remove(), 4000);
                    }, i * 30);
                }
            }, 300);
        }

        setTimeout(() => {
            $(".progress-bar-animated").each(function () {
                const targetWidth = $(this).attr("data-width");
                $(this).css("width", targetWidth + "%");
            });
        }, 200);

        $("#btnReiniciarJuego").off("click").on("click", function () {
            if (ws && ws.socket) ws.socket.emit("solicitarRevancha");
            let footer = $(this).closest('.modal-footer');
            footer.html(`
                <div class="w-100 text-center" style="padding: 20px;">
                    <div class="custom-spinner"></div>
                    <h5 style="color: #f59e0b; margin-top: 20px; font-weight: 600; text-shadow: 0 0 10px rgba(245, 158, 11, 0.5);">⏳ Esperando contestación del rival...</h5>
                </div>
            `);
        });
        $("#btnSalirAlMenu").off("click").on("click", function () {
            if (ws && ws.socket) {
                ws.socket.emit("salirDespuesDeFin");
            }
            setTimeout(() => location.reload(), 300);
        });
    };
    this.mostrarSolicitudRivalRevancha = function () {
        let modal = $("#modalGameOver");
        if (!modal.hasClass('show')) modal.modal('show');
        let header = modal.find('.modal-header');
        header.removeClass('bg-danger bg-success bg-warning').addClass('bg-info');
        header.css('background', 'linear-gradient(135deg, #06b6d4, #0891b2)');
        header.find('.modal-title').html("⚔️ REVANCHA SOLICITADA").css({ 'text-shadow': '0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(255,255,255,0.3)', 'font-size': '2.2rem' });
        $("#mensajeFin").html("Tu rival quiere volver a jugar. ¿Aceptas?");
        let footer = modal.find('.modal-footer');
        footer.html(`
            <button id="btnAceptarRevancha" class="btn btn-success btn-lg mr-3">Aceptar ✅</button>
            <button id="btnRechazarRevancha" class="btn btn-danger btn-lg">Rechazar ❌</button>
        `);
        $("#btnAceptarRevancha").off("click").on("click", function () {
            if (ws && ws.socket) ws.socket.emit("aceptarRevancha");
            footer.html('<div class="text-success font-weight-bold">¡Aceptando...!</div>');
        });
        $("#btnRechazarRevancha").off("click").on("click", function () {
            if (ws && ws.socket) ws.socket.emit("rechazarRevancha");
            $("#modalGameOver").modal("hide");
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
            cw.mostrarHome($.cookie("nick"));
        });
    };
    this.mostrarRivalaceptaRevancha = function () {
        let modal = $("#modalGameOver");
        let footer = modal.find('.modal-footer');
        footer.html(`
            <div class="text-center" style="padding: 20px;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(16, 185, 129, 0.3); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 15px;"></div>
                <h5 style="color: #10b981; font-weight: 700; text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);">✅ ¡Rival listo! Reiniciando...</h5>
            </div>
        `);
    };
    this.mostrarRivalRechazoRevancha = function () {
        $("#modalGameOver").modal("hide");
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
        let html = `
        <div class="modal fade" id="modalAtencion" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
            <div class="modal-dialog modal-dialog-centered" role="document" style="max-width: 400px; transform: scale(0.8);">
                <div class="modal-content" style="background-color: #1a1a2e; color: white; border: 1px solid #444;">
                    <div class="modal-header" style="border-bottom: none;">
                        <h5 class="modal-title" style="color: #a8a8ff; font-weight: bold;">Atención</h5>
                    </div>
                    <div class="modal-body text-center">
                        <div style="font-size: 3rem; margin-bottom: 10px;">❌</div>
                        <h4 style="font-weight: bold; margin-bottom: 15px;">Revancha Rechazada</h4>
                        <p>Tu rival ha rechazado la solicitud de revancha.</p>
                        <p class="text-muted" style="font-size: 0.9em;">Puedes intentar desafiar a otro jugador cuando lo desees.</p>
                    </div>
                    <div class="modal-footer" style="border-top: none; justify-content: center;">
                        <button type="button" id="btnCerrarRechazo" class="btn btn-danger btn-lg" style="min-width: 120px;">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        $("#modalAtencion").remove();
        $("body").append(html);
        $("#modalAtencion").modal("show");
        $("#btnCerrarRechazo").on("click", function () {
            $("#modalAtencion").modal("hide");
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
            cw.mostrarHome($.cookie("nick"));
        });
    };
    this.mostrarRivalAbandonoRevancha = function () {
        this.limpiar();
        cw.mostrarMensaje("El rival se ha desconectado durante la revancha", "error");
        setTimeout(() => {
            cw.mostrarHome($.cookie("nick"));
        }, 2000);
    }
    this.mostrarEliminarUsuario = function () {
        this.limpiar();
        let html = `
        <div class="card border-danger" style="max-width: 500px; margin: 0 auto;">
             <div class="card-header bg-danger text-white"><h3>Eliminar Usuario</h3></div>
             <div class="card-body">
                <p class="text-danger">¡Cuidado! Esta acción es irreversible.</p>
                <div class="form-group">
                    <label style="color:black">Email a eliminar:</label>
                    <input type="text" class="form-control" id="emailEliminar" placeholder="usuario@email.com" style="color:black; background:white;">
                </div>
                <button id="btnEU" class="btn btn-outline-danger btn-block">Eliminar Definitivamente</button>
             </div>
        </div>`;
        $("#au").html(html);
        $("#btnEU").on("click", function () {
            let email = $("#emailEliminar").val().trim();
            if (email) rest.eliminarUsuario(email);
            else cw.mostrarMensaje("Introduce un email válido", "error");
        });
    };
    this.mostrarPantallaJuego = function (soyJugadorA) {
        this.limpiar();
        $("#juego").show();
        juego.iniciar(soyJugadorA);
    };
    this.limpiar = function () {
        $("#au").empty();
        $("#msg").remove();
        $("#juego").hide();
    };
    this.mostrarMensaje = function (msg, tipo = "info") {
        let colorBg, colorBorder, icon;
        if (tipo === "exito") {
            colorBg = "linear-gradient(135deg, #10b981, #059669)";
            colorBorder = "#10b981";
            icon = "✅";
        } else if (tipo === "error") {
            colorBg = "linear-gradient(135deg, #ef4444, #dc2626)";
            colorBorder = "#ef4444";
            icon = "❌";
        } else {
            colorBg = "linear-gradient(135deg, #3b82f6, #2563eb)";
            colorBorder = "#3b82f6";
            icon = "ℹ️";
        }

        $("#msg").remove();
        let html = `
        <style>
            @keyframes slideDown {
                from { transform: translateY(-100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(-100px); opacity: 0; }
            }
            .toast-custom {
                animation: slideDown 0.5s ease-out;
            }
            .toast-custom.hiding {
                animation: slideUp 0.5s ease-in;
            }
        </style>
        <div id="msg" class="toast-custom" style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background: ${colorBg};
            color: white;
            padding: 18px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${colorBorder}66;
            border: 2px solid ${colorBorder};
            font-size: 1.1rem;
            font-weight: 600;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            min-width: 300px;
            text-align: center;
        ">
            <span style="margin-right: 10px; font-size: 1.3rem;">${icon}</span>
            ${msg}
        </div>`;
        $("body").prepend(html);
        setTimeout(() => {
            $("#msg").addClass('hiding');
            setTimeout(() => $("#msg").remove(), 500);
        }, 3000);
    };
    this.mostrarModal = function (m) {
        $("#msg").remove();
        let mensaje = m || "Ha ocurrido un error desconocido (mensaje vacío)";
        let cadena = "<div id='msgModal'>" + mensaje + "</div>";
        $('#mBody').html(cadena);
        $('#miModal').modal();
    };
    this.usuarioLogueado = function (usuario) {
        if (usuario.email) {
            ws.email = usuario.email;
            $.cookie("nick", usuario.nick);
            $.cookie("email", usuario.email);
            this.mostrarHome(usuario.nick);
        } else {
            this.mostrarMensaje("Email o contraseña incorrectos", "error");
            $("#emailAcceso").val("");
            $("#passwordAcceso").val("");
        }
    };
    this.gestionarSalidaRivalFin = function () {
        let modal = $("#modalGameOver");
        let footer = modal.find('.modal-footer');

        $("#mensajeFin").html(`
            <div class="text-center" style="padding: 10px 0;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">😔</div>
                <p style="color: #94a3b8; font-size: 1.2rem; font-weight: 600;">
                    Tu rival no quiere revancha
                </p>
            </div>
        `);

        $("#btnReiniciarJuego").remove();

        footer.html(`
            <button type="button" class="btn btn-lg" id="btnSalirAlMenu" style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; font-weight: 600; min-width: 130px; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                Salir
            </button>
        `);

        $("#btnSalirAlMenu").off("click").on("click", function () {
            setTimeout(() => location.reload(), 300);
        });
    };
}