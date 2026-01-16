const modelo = require("./modelo.js");

describe('El sistema', function () {
  let sistema;

  beforeEach(function () {
    sistema = new modelo.Sistema();
  });

  it('agregar usuario', function () {
    let resultado = sistema.agregarUsuario('juan');
    expect(resultado.nick).toEqual('juan');
    expect(sistema.numeroUsuarios().num).toEqual(1);
  });

  it('eliminar usuario', function () {
    sistema.agregarUsuario('juan');
    let resultado = sistema.eliminarUsuario('juan');
    expect(resultado.eliminado).toBe(true);
    expect(sistema.numeroUsuarios().num).toEqual(0);
  });

  it('obtener usuario', function () {
    sistema.agregarUsuario('juan');
    const usuarios = sistema.obtenerUsuarios();
    expect(usuarios['juan']).toBeDefined();
  });

  it('usuario activo', function () {
    sistema.agregarUsuario('juan');
    expect(sistema.usuarioActivo('juan').activo).toBe(true);
    expect(sistema.usuarioActivo('pedro').activo).toBe(false);
  });
});