function CAD() {
    const mongo = require("mongodb").MongoClient;
    const ObjectId = require("mongodb").ObjectId;

    this.usuarios = null;

    this.conectar = async function () {
        let cad = this;
        const mongoUrl = process.env.MONGODB_URI;
        let client = new mongo(mongoUrl, { useUnifiedTopology: true });

        try {
            await client.connect();
            const database = client.db("sistema");
            cad.usuarios = database.collection("usuarios");
            console.log("Conexión a BD (cad.js) exitosa y 'cad.usuarios' asignado.");
        } catch (err) {
            console.error("Error al conectar a MongoDB (cad.js):", err);
            throw new Error("No se pudo conectar a la base de datos");
        }
    }

    this.buscarOCrearUsuario = function (usr, callback) {
        buscarOCrear(this.usuarios, usr, callback);
    }

    this.actualizarUsuario = function (obj, callback) {
        actualizar(this.usuarios, obj, callback);
    }


    this.buscarUsuario = function (criterio, callback) {
        buscar(this.usuarios, criterio, callback);
    }

    this.buscarUsuarios = function (criterio, callback) {
        buscarPlural(this.usuarios, criterio, callback);
    }

    this.insertarUsuario = function (usuario, callback) {
        insertar(this.usuarios, usuario, callback);
    }

    this.eliminarUsuario = function (criterio, callback) {
        eliminarUno(this.usuarios, criterio, callback);
    }

    this.contarUsuarios = function (criterio, callback) {
        contar(this.usuarios, criterio, callback);
    }

    function buscarOCrear(coleccion, criterio, callback) {
        const query = { email: criterio.email };
        const update = { $set: criterio };
        const options = {
            upsert: true,
            returnDocument: "after",
            projection: { email: 1, nombre: 1 }
        };

        coleccion.findOneAndUpdate(query, update, options, function (err, doc) {
            if (err) {
                console.error("DEBUG (cad.js): Error en findOneAndUpdate:", err);
                return callback(err);
            }
            if (doc && doc.value) {
                callback(doc.value);
            } else {
                callback(criterio);
            }
        });
    }

    function actualizar(coleccion, obj, callback) {
        coleccion.findOneAndUpdate(
            { _id: ObjectId(obj._id) },
            { $set: obj },
            { upsert: false, returnDocument: "after", projection: { email: 1 } },
            function (err, doc) {
                if (err) { throw err; }
                else {
                    console.log("Elemento actualizado");
                    callback({ email: doc.value.email });
                }
            }
        );
    }


    function buscar(coleccion, criterio, callback) {
        if (!coleccion) { return callback(new Error("Colección no inicializada")); }
        coleccion.find(criterio).toArray(function (error, usuarios) {
            if (error) {
                console.error("Error en 'buscar' (cad.js):", error);
                return callback(undefined);
            }
            callback(usuarios[0]);
        });
    }

    function buscarPlural(coleccion, criterio, callback) {
        if (!coleccion) { return callback(new Error("Colección no inicializada")); }
        coleccion.find(criterio).toArray(function (error, usuarios) {
            if (error) {
                console.error("Error en 'buscarPlural' (cad.js):", error);
                return callback([]);
            }
            callback(usuarios);
        });
    }

    function insertar(coleccion, elemento, callback) {
        if (!coleccion) { return callback(new Error("ColeScción no inicializada")); }
        coleccion.insertOne(elemento, function (err, result) {
            if (err) {
                console.error("Error en 'insertar' (cad.js):", err);
                return callback(null);
            }
            console.log("Nuevo elemento creado");
            callback(elemento);
        });
    }

    function eliminarUno(coleccion, criterio, callback) {
        if (!coleccion) { return callback(new Error("Colección no inicializada")); }
        coleccion.deleteOne(criterio, function (err, result) {
            if (err) {
                console.error("Error en 'eliminarUno' (cad.js):", err);
                return callback({ eliminado: 0 });
            }
            callback({ eliminado: result.deletedCount });
        });
    }

    function contar(coleccion, criterio, callback) {
        if (!coleccion) { return callback(new Error("Colección no inicializada")); }
        coleccion.countDocuments(criterio, function (err, count) {
            if (err) {
                console.error("Error en 'contar' (cad.js):", err);
                return callback({ num: 0 });
            }
            callback({ num: count });
        });
    }
}

module.exports.CAD = CAD;