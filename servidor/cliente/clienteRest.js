function ClienteRest(controlWeb) {
    let cw = controlWeb;

    this.obtenerUsuarios = function () {
        $.getJSON("/obtenerUsuarios", function (data) {
            console.log("Lista de usuarios:", data);
        }).fail(function (jqXHR, textStatus, errorThrown) {
            cw.mostrarModal("Error al obtener usuarios. Acceso no autorizado o fallo del servidor.", "error");
            console.error("Error al obtener usuarios:", textStatus, errorThrown);
        });
    }

    this.registrarUsuario = function (email, password, nombre, apellidos) {
        $.ajax({
            type: 'POST',
            url: '/registrarUsuario',
            data: JSON.stringify({
                "email": email,
                "password": password,
                "nombre": nombre,
                "apellidos": apellidos
            }),
            success: function (data) {
                if (data.nick != -1) {
                    console.log("Usuario registrado");
                    cw.limpiar();
                    cw.mostrarModal("Registro exitoso. Por favor inicia sesión.", "exito");
                    cw.mostrarAcceso();
                } else {
                    cw.mostrarModal("El usuario ya existe", "error");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                cw.mostrarModal("Error de conexión al registrar.", "error");
            },
            contentType: 'application/json'
        });
    }

    this.loginUsuario = function (email, password) {
        $.ajax({
            type: 'POST',
            url: '/loginUsuario',
            data: JSON.stringify({ "email": email, "password": password }),
            success: function (data) {
                if (data.nick !== "nook" && data.nick !== -1) {
                    console.log("Usuario " + data.nick + " ha iniciado sesión");
                    data.email = email;
                    cw.usuarioLogueado(data);
                }
                else {
                    cw.mostrarModal("Email o contraseña incorrectos", "error");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                cw.mostrarModal("Error de conexión al iniciar sesión.", "error");
            },
            contentType: 'application/json'
        });
    }



    this.numeroUsuarios = function () {
        $.getJSON("/numeroUsuarios", function (data) {
            let numero = (data && data.num !== undefined) ? data.num : 0;
            cw.mostrarMensaje("Hay " + numero + " usuarios registrados.");
        });
    }

    this.usuarioActivo = function (email) {
        $.getJSON("/usuarioActivo/" + email, function (data) {
            console.log("Usuario activo: " + data.activo);
        });
    }

    this.eliminarUsuario = function (email) {
        $.getJSON("/eliminarUsuario/" + email, function (data) {
            if (data.resultados > 0) {
                cw.mostrarMensaje("Usuario eliminado correctamente.", "exito");
            } else {
                cw.mostrarMensaje("No se pudo eliminar.", "error");
            }
        });
    }
}