function ControlWeb() {
    let cw = this;

    this.comprobarSesion = function () {
        let nick = $.cookie("nick");

        if (nick) {
            cw.mostrarHome(nick);

            if (!ws.email) {
                let email = $.cookie("email");
                ws.email = email;
                console.log("Email recuperado de la cookie:", ws.email);
            }
        } else {
            cw.mostrarAcceso();
            cw.ocultarBotonCerrarSesion();
        }
    };

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
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
                    cw.mostrarMensaje("Por favor, rellena todos los campos. El email y la contraseña son obligatorios.", "error");
                }
            });
        });
    };

    this.mostrarBotonCerrarSesion = function () {
        $(".nav-item").hide();
        $("#cerrarSesionItem").show();
        $(".nav-item").not(':first').not('#cerrarSesionItem').show();
        $("#navInicio").show();
    };

    this.ocultarBotonCerrarSesion = function () {
        $(".nav-item").hide();
        $(".nav-item").first().show();
        $("#cerrarSesionItem").hide();
        $("#navInicio").show();
    };

    this.mostrarAcceso = function () {
        this.limpiar();
        this.ocultarBotonCerrarSesion();

        let html = `
    <div class="card mt-3">
        <div class="card-body">
            <h5>Acceder al Sistema</h5>
            
            <div class="form-group">
                <label for="emailAcceso">Email:</label>
                <input type="email" class="form-control" id="emailAcceso" placeholder="tu@email.com">
            </div>
            
            <div class="form-group">
                <label for="passwordAcceso">Contraseña:</label>
                <input type="password" class="form-control" id="passwordAcceso" placeholder="Tu contraseña">
            </div>

            <button id="btnLogin" class="btn btn-primary mr-2">Iniciar Sesión</button>
            <button id="btnMostrarRegistro" class="btn btn-outline-secondary">Quiero Registrarme</button>

            <hr>
            
            <div style="text-align:center">
                <p>O inicia sesión con:</p>
                <a href="/auth/google">
                    <img src="/img/inicioGoogle.png" style="height:40px;">
                </a>
            </div>
        </div>
    </div>`;

        $("#au").append(html);

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

    this.mostrarHome = function (nick) {
        this.limpiar();
        this.mostrarBotonCerrarSesion();
        let nickUsuario = nick || $.cookie("nick");
        cw.mostrarMensaje("Bienvenido de nuevo, " + nickUsuario, "exito");
        this.mostrarCrearPartida();

    };

    this.salir = function () {
        $.removeCookie("nick");
        location.reload();
        cw.mostrarAcceso();
    };

    this.mostrarObtenerUsuarios = function () {
        this.limpiar();
        this.mostrarBotonCerrarSesion();
        let html = `
        <div id="mOU" class="form-group">
            <button id="btnOU" class="btn btn-info">Obtener Lista de Usuarios</button>
            <div id="listaUsuarios" class="mt-3"></div>
        </div>`;
        $("#au").html(html);

        $("#btnOU").on("click", function () {
            $.getJSON("/obtenerUsuarios", function (data) {
                let listaDiv = $("#listaUsuarios");
                listaDiv.empty();

                if (data.length === 0) {
                    listaDiv.html('<div class="alert alert-warning">No hay usuarios registrados en la base de datos</div>');
                } else {
                    let tabla = `
                    <div class="card mt-3">
                        <div class="card-header"><h5>Usuarios Registrados en MongoDB</h5></div>
                        <div class="card-body">
                            <table class="table table-striped">
                                <thead><tr><th>Nombre</th><th>Email</th><th>ID</th></tr></thead>
                                <tbody>`;

                    data.forEach(function (u) {
                        tabla += `<tr><td>${u.nombre || u.nick}</td><td>${u.email}</td><td>${u._id}</td></tr>`;
                    });

                    tabla += `</tbody></table></div></div>`;
                    listaDiv.html(tabla);
                }
            });
        });
    };

    this.mostrarEliminarUsuario = function () {
        this.limpiar();
        this.mostrarBotonCerrarSesion();
        let html = `
        <div id="mEU" class="form-group">
            <label for="emailEliminar">Email a eliminar:</label>
            <input type="text" class="form-control" id="emailEliminar" placeholder="usuario@email.com">
            <button id="btnEU" class="btn btn-danger mt-2">Eliminar Usuario</button>
        </div>`;
        $("#au").html(html);

        $("#btnEU").on("click", function () {
            let email = $("#emailEliminar").val().trim();
            if (email) rest.eliminarUsuario(email);
            else cw.mostrarMensaje("Por favor, introduce un email válido", "error");
        });
    };

    this.mostrarNumeroUsuarios = function () {
        this.limpiar();
        this.mostrarBotonCerrarSesion();
        let html = `
        <div id="mNU" class="form-group">
            <button id="btnNU" class="btn btn-warning">Consultar Número de Usuarios</button>
            <div id="resultadoNumero" class="mt-3 alert alert-info" style="display:none;"></div>
        </div>`;
        $("#au").html(html);

        $("#btnNU").on("click", function () {
            rest.numeroUsuarios();
        });
    };

    this.mostrarUsuarioActivo = function () {
        this.limpiar();
        this.mostrarBotonCerrarSesion();
        let html = `
        <div id="mUA" class="form-group">
            <label for="emailConsultar">Consultar estado de usuario:</label>
            <input type="text" class="form-control" id="emailConsultar" placeholder="Introduce el email">
            <button id="btnUA" class="btn btn-secondary mt-2">Consultar Estado</button>
            <div id="resultadoEstado" class="mt-3"></div>
        </div>`;
        $("#au").html(html);

        $("#btnUA").on("click", function () {
            let email = $("#emailConsultar").val().trim();
            if (email) {
                $.getJSON("/usuarioActivo/" + email, function (data) {
                    let resultado = data.activo
                        ? `<div class="alert alert-success">El usuario <strong>${email}</strong> está ACTIVO</div>`
                        : `<div class="alert alert-danger">El usuario <strong>${email}</strong> no existe</div>`;
                    $("#resultadoEstado").html(resultado);
                });
            } else cw.mostrarMensaje("Introduce un email válido", "error");
        });
    };

    this.limpiar = function () {
        $("#au").empty();
    };

    this.mostrarMensaje = function (msg, tipo = "info") {
        let claseAlerta = "alert-info";
        if (tipo === "exito") {
            claseAlerta = "alert-success";
        } else if (tipo === "error") {
            claseAlerta = "alert-danger";
        }

        $("#msg").remove();

        let html = `<div id="msg" class="alert ${claseAlerta} alert-dismissible fade show" role="alert">
                        ${msg}
                        <button type="button" class="close" data-dismiss="alert" aria-label="Close"> 
                        <span aria-hidden="true">&times;</span>
                        </button>
                    </div>`;

        $(".container").prepend(html);
    };
    this.mostrarModal = function (m) {
        $("#msg").remove();
        let cadena = "<div id='msg'>" + m + "</div>";
        $('#mBody').append(cadena)
        $('#miModal').modal();
    }
    // --- FUNCIONES PARA LA GESTIÓN DE PARTIDAS ---
    this.mostrarCrearPartida = function () {
        // Añadimos un botón para crear partidas si no existe
        if ($("#btnCrearPartida").length === 0) {
            let html = `
            <div id="zonaPartidas" class="card mt-4">
                <div class="card-body">
                    <h5>Partidas</h5>
                    <button id="btnCrearPartida" class="btn btn-success">Crear Partida</button>
                    <hr>
                    <h6>Partidas Disponibles:</h6>
                    <div id="listaPartidas">No hay partidas disponibles.</div>
                </div>
            </div>`;
            $("#au").append(html);

            $("#btnCrearPartida").on("click", function () {
                ws.crearPartida();
            });
        }
    };

    this.mostrarEsperandoRival = function () {
        this.limpiar();
        let html = `
        <div class="card mt-4 text-center">
            <div class="card-body">
                <h3>⌛ Esperando rival...</h3>
                <p class="mb-3">Compartir código con un amigo</p>
                <div class="d-flex justify-content-center align-items-center mb-2">
                    <h2 class="mb-0 d-flex align-items-center">
                        <span id="codigoPartida" class="badge badge-primary" style="font-size:1.6rem; padding:0.6rem 1rem; cursor:pointer; user-select:text;" title="Selecciona o haz click para copiar" data-toggle="tooltip">` + (ws && ws.codigo ? (ws.codigo) : '') + `</span>
                    </h2>
                </div>
                <p class="text-muted">o espera a que otro rival se una.</p>
                <div class="spinner-border text-primary" role="status"></div>
                <br><br>
                <button id="btnCancelarPartida" class="btn btn-danger">Cancelar</button>
                <div id="copiadoMsg" class="mt-3 text-success" style="display:none; font-weight:600;">Código copiado al portapapeles</div>
            </div>
        </div>`;
        $("#au").append(html);
        $("#btnCancelarPartida").on("click", function () {
            ws.cancelarPartida();
            cw.mostrarHome();
        });

        // Inicializar tooltip y copiar al hacer click o al seleccionar el código
        try { $("#codigoPartida").tooltip(); } catch (e) { /* tooltip optional */ }
        $("#codigoPartida").on("mouseup click", function (e) {
            // Si hay selección (p. ej. usuario ha seleccionado el texto), usarla
            let sel = '';
            try { sel = window.getSelection().toString().trim(); } catch (ex) { sel = ''; }
            const codigo = sel && sel.length > 0 ? sel : ((ws && ws.codigo) ? ws.codigo.toString().trim() : '');
            if (!codigo) return;

            // Intentar navigator.clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codigo).then(function () {
                    $("#copiadoMsg").show().delay(1500).fadeOut();
                }).catch(function () {
                    const ta = document.createElement('textarea');
                    ta.value = codigo;
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); $("#copiadoMsg").show().delay(1500).fadeOut(); } catch (e) { }
                    document.body.removeChild(ta);
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = codigo;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); $("#copiadoMsg").show().delay(1500).fadeOut(); } catch (e) { }
                document.body.removeChild(ta);
            }
        });
    };

    this.mostrarListaPartidas = function (lista) {
        // Actualizamos la lista de partidas visibles
        let listaDiv = $("#listaPartidas");
        listaDiv.empty();

        if (lista.length === 0) {
            listaDiv.html("No hay partidas disponibles.");
        } else {
            let ul = '<ul class="list-group">';
            lista.forEach(function (partida) {
                ul += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        Partida de ${partida.creador} (Código: ${partida.codigo})
                        <button class="btn btn-primary btn-sm" onclick="ws.unirAPartida('${partida.codigo}')">Unirse</button>
                       </li>`;
            });
            ul += '</ul>';
            listaDiv.html(ul);
        }
    };
}