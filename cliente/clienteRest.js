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
                    console.log("Usuario " + data.nick + " ha sido registrado");
                    cw.limpiar();
                    cw.mostrarModal("Usuario registrado con éxito. Inicia sesión para acceder al sistema.", "exito");
                    cw.mostrarAcceso();
                } else {
                    console.log("No se pudo registrar el usuario");
                    cw.mostrarModal("Error: El usuario (email) ya existe", "error");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Status: " + textStatus);
                console.log("Error: " + errorThrown);
                cw.mostrarModal("Error en el servidor al registrar.", "error");
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
                    $.cookie("nick", data.nick);
                    ws.email = data.email;
                    cw.limpiar();
                    cw.mostrarHome(data.nick);
                }
                else {
                    console.log("Usuario o clave incorrectos");
                    cw.mostrarModal("Email o contraseña incorrectos", "error");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Status: " + textStatus);
                console.log("Error: " + errorThrown);
                cw.mostrarModal("Error en el servidor al iniciar sesión.", "error");
            },
            contentType: 'application/json'
        });
    }

    this.numeroUsuarios = function () {
        $.getJSON("/numeroUsuarios", function (data) {
            let numero = data && data.num !== undefined ? data.num : 0;
            if ($("#resultadoNumero").length) {
                $("#resultadoNumero").html("Número total de usuarios: <strong>" + numero + "</strong>");
                $("#resultadoNumero").show();
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            cw.mostrarModal("Error de seguridad o de conexión al consultar el número de usuarios.", "error");
            console.error("Error al obtener número de usuarios:", textStatus, errorThrown);
        });
    }

    this.usuarioActivo = function (email) {
        $.getJSON("/usuarioActivo/" + email, function (data) {
            if (data.activo) {
                console.log("El usuario " + email + " está activo");
            } else {
                console.log("El usuario " + email + " NO está activo");
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            cw.mostrarModal("Error de seguridad o de conexión al consultar el estado del usuario.", "error");
            console.error("Error al obtener estado:", textStatus, errorThrown);
        });
    }

    this.eliminarUsuario = function (email) {
        $.getJSON("/eliminarUsuario/" + email, function (data) {
            if (data.eliminado > 0) {
                console.log("Usuario " + email + " eliminado correctamente");
                cw.mostrarModal("Usuario " + email + " eliminado de la BD", "exito");
            } else {
                console.log("No se pudo eliminar el usuario " + email);
                cw.mostrarModal("No se pudo eliminar el usuario " + email, "error");
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            cw.mostrarModal("Error de seguridad o de conexión al intentar eliminar el usuario.", "error");
            console.error("Error al eliminar usuario:", textStatus, errorThrown);
        });
    }
}