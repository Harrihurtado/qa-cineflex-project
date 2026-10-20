const { By, until } = require('selenium-webdriver');

/**
 * Page Object: Flujo de compra (asientos, pago y ticket)
 * Solo localizadores y acciones. SIN aserciones.
 */
class ReservaPage {
  constructor(driver) {
    this.driver = driver;
    this.vistaAsientos = By.css('#vista-asientos.activa');
    this.peliculaSeleccionada = By.id('pelicula-seleccionada');
    this.asientosLibres = By.css('#mapa-asientos .asiento.libre');
    this.asientosOcupados = By.css('#mapa-asientos .asiento.ocupado');
    this.btnContinuar = By.id('btn-continuar-pago');
    this.vistaPago = By.css('#vista-pago.activa');
    this.inputTitular = By.id('input-titular');
    this.inputTarjeta = By.id('input-tarjeta');
    this.inputVencimiento = By.id('input-vencimiento');
    this.inputCvv = By.id('input-cvv');
    this.btnPagar = By.id('btn-pagar');
    this.msgPago = By.id('msg-pago');
    this.vistaTicket = By.css('#vista-ticket.activa');
    this.ticket = By.id('ticket-virtual');
  }

  async esperarAsientos() {
    await this.driver.wait(until.elementLocated(this.vistaAsientos), 5000);
    await this.driver.wait(until.elementLocated(this.asientosLibres), 5000);
  }

  async obtenerPeliculaSeleccionada() { return this.driver.findElement(this.peliculaSeleccionada).getText(); }

  async seleccionarPrimerAsientoLibre() {
    const asiento = await this.driver.findElement(this.asientosLibres);
    const codigo = await asiento.getText();
    await asiento.click();
    return codigo;
  }

  async estadoAsientosOcupados() {
    const elementos = await this.driver.findElements(this.asientosOcupados);
    return Promise.all(elementos.map(e => e.isEnabled()));
  }

  async botonContinuarHabilitado() { return this.driver.findElement(this.btnContinuar).isEnabled(); }

  async continuarAlPago() {
    await this.driver.findElement(this.btnContinuar).click();
    await this.driver.wait(until.elementLocated(this.vistaPago), 5000);
  }

  async llenarFormularioPago({ titular, numero, vencimiento, cvv }) {
    const campos = [
      [this.inputTitular, titular], [this.inputTarjeta, numero],
      [this.inputVencimiento, vencimiento], [this.inputCvv, cvv]
    ];
    for (const [localizador, valor] of campos) {
      const campo = await this.driver.findElement(localizador);
      await campo.clear();
      await campo.sendKeys(valor);
    }
  }

  async hacerClicComprar() { await this.driver.findElement(this.btnPagar).click(); }

  async obtenerMensajePago() {
    const msg = await this.driver.findElement(this.msgPago);
    await this.driver.wait(async () => (await msg.getText()) !== '', 5000);
    return msg.getText();
  }

  async esperarTicket() { await this.driver.wait(until.elementLocated(this.vistaTicket), 5000); }
  async obtenerTextoTicket() { return this.driver.findElement(this.ticket).getText(); }
}

module.exports = ReservaPage;
