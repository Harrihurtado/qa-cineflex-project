const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');
const LoginPage = require('./pages/LoginPage');
const CarteleraPage = require('./pages/CarteleraPage');
const ReservaPage = require('./pages/ReservaPage');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USUARIO = { email: 'cliente@cineflex.com', password: 'Cine123*' };
const TARJETA_OK = { titular: 'QA Tester', numero: '4111111111111111', vencimiento: '12/30', cvv: '123' };
const TARJETA_FALSA = { ...TARJETA_OK, numero: '1234567890123456' };

describe('CineFlex - Suite UI (Selenium + POM)', function () {
  this.timeout(60000);
  let driver, login, cartelera, reserva;

  before(async () => {
    const opciones = new chrome.Options();
    if (process.env.HEADLESS === 'true') {
      opciones.addArguments('--headless=new', '--no-sandbox', '--window-size=1366,768');
    }
    if (process.env.CHROME_BIN) opciones.setChromeBinaryPath(process.env.CHROME_BIN);
    const builder = new Builder().forBrowser('chrome').setChromeOptions(opciones);
    if (process.env.CHROMEDRIVER) builder.setChromeService(new chrome.ServiceBuilder(process.env.CHROMEDRIVER));
    driver = await builder.build();
    login = new LoginPage(driver, BASE_URL);
    cartelera = new CarteleraPage(driver, BASE_URL);
    reserva = new ReservaPage(driver);
  });

  after(async () => { if (driver) await driver.quit(); });
  beforeEach(async () => { await login.abrir(); });

  async function iniciarSesionValida() {
    await login.iniciarSesion(USUARIO.email, USUARIO.password);
    await cartelera.esperarCarga();
  }

  async function llegarAlPago() {
    await iniciarSesionValida();
    await cartelera.seleccionarPelicula(0);
    await reserva.esperarAsientos();
    await reserva.seleccionarPrimerAsientoLibre();
    await reserva.continuarAlPago();
  }

  describe('Login', () => {
    it('CP01 - Muestra la vista de inicio de sesión', async () => {
      assert.strictEqual(await login.obtenerTitulo(), 'Iniciar sesión');
    });

    it('CP02 - Credenciales inválidas muestran error con contador', async () => {
      await login.intentarLoginFallido('otro@cineflex.com', 'malaClave');
      assert.ok((await login.obtenerMensaje()).includes('Intento 1 de 3'));
    });

    it('CP03 - Campos vacíos muestran mensaje de obligatorios', async () => {
      await login.intentarLoginFallido('', '');
      assert.ok((await login.obtenerMensaje()).includes('obligatorios'));
    });

    it('CP04 - Bloqueo preventivo tras 3 intentos fallidos', async () => {
      for (let i = 0; i < 3; i++) await login.intentarLoginFallido('ataque@cineflex.com', 'clave' + i);
      assert.ok((await login.obtenerMensaje()).includes('bloqueada'));
      assert.strictEqual(await login.botonIngresarHabilitado(), false);
    });

    it('CP05 - Login exitoso renderiza el título "Cartelera" en el DOM', async () => {
      await iniciarSesionValida();
      assert.strictEqual(await cartelera.obtenerTitulo(), 'Cartelera');
    });
  });

  describe('Cartelera', () => {
    it('CP06 - Lista al menos 3 películas', async () => {
      await iniciarSesionValida();
      assert.ok(await cartelera.contarPeliculas() >= 3);
    });

    it('CP07 - Cada película tiene título y botón Comprar', async () => {
      await iniciarSesionValida();
      const titulos = await cartelera.obtenerTitulosPeliculas();
      assert.ok(titulos.every(t => t.trim().length > 0));
      assert.strictEqual(await cartelera.contarBotonesComprar(), titulos.length);
    });

    it('CP08 - El botón "Cerrar sesión" es visible tras el login', async () => {
      await iniciarSesionValida();
      assert.strictEqual(await cartelera.botonCerrarSesionVisible(), true);
    });
  });

  describe('Reserva y pago', () => {
    it('CP09 - Seleccionar película abre el mapa de asientos correcto', async () => {
      await iniciarSesionValida();
      const [primerTitulo] = await cartelera.obtenerTitulosPeliculas();
      await cartelera.seleccionarPelicula(0);
      await reserva.esperarAsientos();
      assert.strictEqual(await reserva.obtenerPeliculaSeleccionada(), primerTitulo);
    });

    it('CP10 - Los asientos ocupados están deshabilitados', async () => {
      await iniciarSesionValida();
      await cartelera.seleccionarPelicula(0);
      await reserva.esperarAsientos();
      const estados = await reserva.estadoAsientosOcupados();
      assert.ok(estados.length > 0);
      assert.ok(estados.every(habilitado => habilitado === false));
    });

    it('CP11 - "Continuar al pago" solo se habilita tras elegir asiento', async () => {
      await iniciarSesionValida();
      await cartelera.seleccionarPelicula(0);
      await reserva.esperarAsientos();
      assert.strictEqual(await reserva.botonContinuarHabilitado(), false);
      await reserva.seleccionarPrimerAsientoLibre();
      assert.strictEqual(await reserva.botonContinuarHabilitado(), true);
    });

    it('CP12 - Tarjeta falsa es rechazada con mensaje de error', async () => {
      await llegarAlPago();
      await reserva.llenarFormularioPago(TARJETA_FALSA);
      await reserva.hacerClicComprar();
      assert.ok((await reserva.obtenerMensajePago()).includes('Pago rechazado'));
    });

    it('CP13 - E2E: compra completa muestra el ticket virtual', async () => {
      await iniciarSesionValida();
      await cartelera.seleccionarPelicula(0);
      await reserva.esperarAsientos();
      const asiento = await reserva.seleccionarPrimerAsientoLibre();
      await reserva.continuarAlPago();
      await reserva.llenarFormularioPago(TARJETA_OK);
      await reserva.hacerClicComprar();
      await reserva.esperarTicket();
      const ticket = await reserva.obtenerTextoTicket();
      assert.ok(ticket.includes('TCK-'));
      assert.ok(ticket.includes(`Asiento ${asiento}`));
    });
  });

  describe('Navegación segura', () => {
    it('CP14 - "Cerrar sesión" regresa al login', async () => {
      await iniciarSesionValida();
      await cartelera.cerrarSesion();
      await login.esperarVista();
      assert.strictEqual(await login.estaVisible(), true);
    });

    it('CP15 - Botón "Atrás" tras cerrar sesión NO muestra la cartelera', async () => {
      await iniciarSesionValida();
      await cartelera.cerrarSesion();
      await login.esperarVista();
      await cartelera.volverAtras();
      await driver.sleep(500);
      assert.strictEqual(await cartelera.estaVisible(), false);
      assert.strictEqual(await login.estaVisible(), true);
    });

    it('CP16 - Acceso directo a /#/cartelera sin sesión redirige al login', async () => {
      await cartelera.abrirDirecto();
      await driver.sleep(500);
      assert.strictEqual(await cartelera.estaVisible(), false);
      assert.strictEqual(await login.estaVisible(), true);
    });
  });
});
