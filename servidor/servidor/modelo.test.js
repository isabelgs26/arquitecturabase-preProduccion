const modelo = require("./modelo.js");
describe.skip('El sistema (legado)', () => {
  let sistema;

  beforeEach(() => {
    sistema = new modelo.Sistema({ test: true });
  });

  it('agregar usuario', () => {
    let resultado = sistema.agregarUsuario('juan');
    expect(resultado.nick).toEqual('juan');
    expect(sistema.numeroUsuarios().num).toEqual(1);
  });

  it('eliminar usuario', () => {
    sistema.agregarUsuario('juan');
    let resultado = sistema.eliminarUsuario('juan');
    expect(resultado.eliminado).toBe(true);
    expect(sistema.numeroUsuarios().num).toEqual(0);
  });

  it('obtener usuario', () => {
    sistema.agregarUsuario('juan');
    const usuarios = sistema.obtenerUsuarios();
    expect(usuarios['juan']).toBeDefined();
  });

  it('usuario activo', () => {
    sistema.agregarUsuario('juan');
    expect(sistema.usuarioActivo('juan').activo).toBe(true);
    expect(sistema.usuarioActivo('pedro').activo).toBe(false);
  });
});

describe("Pruebas de las partidas (en memoria)", () => {
  let sistema;
  let usr, usr2, usr3;

  beforeEach(() => {
    sistema = new modelo.Sistema({ test: true });

    usr = { "nick": "Pepe", "email": "pepe@pepe.es" };
    usr2 = { "nick": "Pepa", "email": "pepa@pepa.es" };
    usr3 = { "nick": "Pepo", "email": "pepo@pepo.es" };

    sistema.agregarUsuario(usr);
    sistema.agregarUsuario(usr2);
    sistema.agregarUsuario(usr3);
  });

  it("Usuarios y partidas en el sistema", () => {
    expect(Object.keys(sistema.usuarios).length).toEqual(3);
    expect(sistema.obtenerPartidasDisponibles().length).toEqual(0);
  });

  it("Crear partida", () => {
    let codigo = sistema.crearPartida("pepe@pepe.es");
    expect(codigo).toBeDefined();
    expect(sistema.obtenerPartidasDisponibles().length).toEqual(1);
    expect(sistema.partidas[codigo].jugadores[0].email).toEqual("pepe@pepe.es");
  });

  it("Unir a partida", () => {
    let codigo = sistema.crearPartida("pepe@pepe.es");
    let res = sistema.unirAPartida("pepa@pepa.es", codigo);
    expect(res).toEqual(codigo);
    expect(sistema.partidas[codigo].jugadores.length).toEqual(2);
    expect(sistema.partidas[codigo].jugadores[1].email).toEqual("pepa@pepa.es");
  });

  it("Un tercer usuario no puede unirse", () => {
    let codigo = sistema.crearPartida("pepe@pepe.es");
    sistema.unirAPartida("pepa@pepa.es", codigo);
    let res = sistema.unirAPartida("pepo@pepo.es", codigo);
    expect(res).toEqual(-1);
    expect(sistema.partidas[codigo].jugadores.length).toEqual(2);
  });

  it("Obtener partidas", () => {
    expect(sistema.obtenerPartidasDisponibles().length).toEqual(0);

    let codigo = sistema.crearPartida("pepe@pepe.es");
    expect(sistema.obtenerPartidasDisponibles().length).toEqual(1);
    expect(sistema.obtenerPartidasDisponibles()[0].creador).toEqual("pepe@pepe.es");

    sistema.unirAPartida("pepa@pepa.es", codigo);
    expect(sistema.obtenerPartidasDisponibles().length).toEqual(0);
  });
});