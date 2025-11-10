function ControlWeb() {
    let cw = this;

    this.comprobarSesion = function () {
        let nick = $.cookie("nick");

        if (nick) {
            cw.mostrarHome(nick);
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
    };

    this.salir = function () {
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
}