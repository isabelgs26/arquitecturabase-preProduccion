const modelo = require("./modelo.js");

const testUser = {
  email: 'test@example.com',
  password: 'password123',
  nombre: 'TestName',
  apellidos: 'TestSurname'
};

describe('Sistema asíncrono (MongoDB)', () => {
  let sistema;

  beforeEach(async () => {

    sistema = new modelo.Sistema({ test: true });
  });

  it('Debe devolver el modo test y tener funciones asíncronas', () => {
    expect(sistema.test).toBe(true);
    expect(typeof sistema.registrarUsuario).toBe('function');
  });


  it('registrarUsuario (registro) debe fallar si se intenta registrar dos veces', (done) => {
    let userExists = false;

    sistema.cad.buscarUsuario = (criterio, callback) => {
      if (userExists) {
        callback(testUser);
      } else {
        callback(undefined);
      }
    };

    sistema.cad.insertarUsuario = (obj, callback) => {
      userExists = true;
      callback({ email: obj.email });
    };


    sistema.registrarUsuario(testUser, (res1) => {
      expect(res1.email).toEqual(testUser.email);

      sistema.registrarUsuario(testUser, (res2) => {
        expect(res2.email).toEqual(-1);
        done();
      });
    });
  });

  it('loginUsuario debe encontrar y comparar la contraseña correctamente', (done) => {

    const MOCKED_HASH = '$2b$10$tK4u651L18A4W6S7I8h456789l0jH0G6fB7F3D';
    const MOCKED_USER = { ...testUser, confirmada: true, password: MOCKED_HASH };

    sistema.cad.buscarUsuario = (criterio, callback) => {
      expect(criterio.confirmada).toBe(true);
      callback(MOCKED_USER);
    };

    sistema.loginUsuario({ email: testUser.email, password: testUser.password }, (res) => {


      expect(res.email).toEqual(testUser.email);


      done();
    });
  });
});