function ControlWeb() {
    let cw = this;

    this.comprobarSesion = function () {
        let nick = $.cookie("nick");

        if (nick) {
            cw.mostrarHome(nick);
            if (!ws.email) {
                let email = $.cookie("email");
                ws.email = email;
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
    };

    this.mostrarListaPartidas = function (lista) {
        let listaDiv = $("#listaPartidas");
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

        let codigoStr = (ws && ws.codigo) ? ws.codigo : '...';

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
            $("#btnIniciarJuego").click(function () {
                ws.iniciarJuego(codigo);
            });
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
        <div class="card border-danger text-center" style="max-width: 500px; margin: 0 auto;">
            <div class="card-header bg-danger text-white">
                <h3>🚫 Partida Finalizada</h3>
            </div>
            <div class="card-body">
                <h5 class="card-title text-danger">Tu rival ha abandonado la partida</h5>
                <p class="card-text text-dark">
                    La partida se ha cerrado porque el otro jugador se desconectó o canceló el juego.
                </p>
                <hr>
                <p class="text-muted">¿Qué quieres hacer ahora?</p>
                <button id="btnVolverJugar" class="btn btn-primary btn-lg btn-block">
                    Volver a Jugar
                </button>
            </div>
        </div>`;

        $("#au").html(html);

        $("#btnVolverJugar").on("click", function () {
            cw.mostrarCrearPartida();
        });
    };
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
        $("#listaUsuarios").remove();
        $("#fmRegistro").remove();
        $("#juego").hide();
    };

    this.mostrarMensaje = function (msg, tipo = "info") {
        let claseAlerta = (tipo === "exito") ? "alert-success" : (tipo === "error") ? "alert-danger" : "alert-info";

        $("#msg").remove();

        let html = `
        <div id="msg" class="alert ${claseAlerta} alert-dismissible fade show fixed-top text-center" role="alert" style="z-index: 9999; margin: 0;">
            ${msg}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close"> 
                <span aria-hidden="true">&times;</span>
            </button>
        </div>`;

        $("body").prepend(html);

        setTimeout(() => { $("#msg").alert('close'); }, 3000);
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
}