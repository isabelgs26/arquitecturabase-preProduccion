require('dotenv').config();

const express = require("express");
const path = require("path");
const passport = require("passport");
const cookieSession = require("cookie-session");
const modelo = require("./servidor/modelo.js");
const fs = require("fs");
const bodyParser = require("body-parser");

const LocalStrategy = require('passport-local').Strategy;

const sistema = new modelo.Sistema({ test: false });
const app = express();

require("./servidor/passport-setup.js");

const PORT = process.env.PORT || 3000;

// --- TAREA 2.8: Definición del Middleware haIniciado() ---
const haIniciado = function (request, response, next) {
    if (request.user) { // Passport almacena el usuario en request.user si está autenticado
        next(); // Continúa la petición
    }
    else {
        response.redirect("/") // Redirige al login si no hay sesión
    }
}
// -----------------------------------------------------------

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", function (request, response) {
    let contenido = fs.readFileSync(__dirname + "/cliente/index.html", "utf8");
    contenido = contenido.replace("GOOGLE_CLIENT_ID_PLACEHOLDER", process.env.GOOGLE_CLIENT_ID);
    response.setHeader("Content-type", "text/html");
    response.send(contenido);
});

app.use(express.static(__dirname + "/cliente"));

app.use(cookieSession({
    name: 'Sistema',
    keys: ['key1', 'key2']
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    function (email, password, done) {
        sistema.loginUsuario({ "email": email, "password": password }, function (user) {
            if (user.email === -1) {
                return done(null, false, { message: 'Email o contraseña incorrectos.' });
            } else {
                return done(null, user);
            }
        });
    }
));

app.get("/sesion", function (req, res) {
    res.json({
        autenticado: req.isAuthenticated(),
        usuario: req.user
    });
});

app.get("/cerrarSession", function (request, response, next) {
    request.session = null;
    response.clearCookie('Sistema');
    response.clearCookie('nick');
    response.redirect("/");
});

app.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get("/google/callback",
    passport.authenticate('google', {
        successRedirect: '/good',
        failureRedirect: '/'
    })
);

app.post('/oneTap/callback',
    passport.authenticate('google-one-tap', {
        successRedirect: '/good',
        failureRedirect: '/'
    })
);
app.get("/fallo", function (request, response) {
    response.send({ "nick": "nook" });
});

app.get("/good", function (request, response) {
    if (!request.user || !request.user.emails || !request.user.emails.length === 0) {
        return response.redirect('/');
    }
    let email = request.user.emails[0].value;
    let userName = request.user.displayName || email;

    sistema.usuarioGoogle({ "email": email, "nombre": userName }, function (obj) {
        response.cookie('nick', userName);
        response.redirect('/');
    });
});

app.get("/confirmarUsuario/:email/:key", function (request, response) {
    let email = request.params.email;
    let key = request.params.key;

    sistema.confirmarUsuario({ "email": email, "key": key }, function (usr) {
        if (usr.email !== -1) {
            response.cookie('nick', usr.email);
            response.redirect('/');
        } else {
            response.redirect('/');
        }
    });
});


// --- RUTAS API ASEGURADAS (Tarea 2.8) ---

// Protegida: Obtener la lista de usuarios
app.get("/obtenerUsuarios", haIniciado, function (req, res) {
    sistema.obtenerUsuarios(function (usuarios) {
        res.json(usuarios);
    });
});

app.post("/registrarUsuario", function (req, res) {
    let obj = req.body;
    sistema.registrarUsuario(obj, function (resultado) {
        res.json({ nick: resultado.email });
    });
});

app.post('/loginUsuario',
    passport.authenticate("local", {
        failureRedirect: "/fallo",
        successRedirect: "/ok"
    })
);

app.get("/ok", function (request, response) {
    let nick = request.user.nick || request.user.email;
    response.cookie('nick', nick);
    response.send({ nick: nick });
});

// Protegida: Consultar estado de usuario
app.get("/usuarioActivo/:email", haIniciado, function (req, res) {
    let email = req.params.email;
    sistema.usuarioActivo(email, function (resultado) {
        res.json(resultado);
    });
});

// Protegida: Contar número de usuarios
app.get("/numeroUsuarios", haIniciado, function (req, res) {
    sistema.numeroUsuarios(function (resultado) {
        res.json(resultado);
    });
});

// Protegida: Eliminar usuario
app.get("/eliminarUsuario/:email", haIniciado, function (req, res) {
    let email = req.params.email;
    sistema.eliminarUsuario(email, function (resultado) {
        res.json(resultado);
    });
});

sistema.inicializar().then(() => {
    console.log("Sistema inicializado con base de datos");
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
}).catch(err => {
    console.error("Error inicializando sistema:", err);
});