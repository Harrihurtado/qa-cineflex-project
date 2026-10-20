const { By, until } = require('selenium-webdriver');

/**
 * Page Object: Login
 * Solo localizadores y acciones. SIN aserciones.
 */
class LoginPage {
  constructor(driver, baseUrl) {
    this.driver = driver;
    this.baseUrl = baseUrl;
    // Localizadores (IDs y CSS Selectors)
    this.vistaLogin = By.css('#vista-login.activa');
    this.titulo = By.id('titulo-login');
    this.inputEmail = By.id('input-email');
    this.inputPassword = By.id('input-password');
    this.btnIngresar = By.id('btn-login');
    this.mensaje = By.id('msg-login');
  }

  async abrir() {
    await this.driver.get(this.baseUrl + '/');
    await this.driver.executeScript('sessionStorage.clear();');
    await this.driver.navigate().refresh();
    await this.esperarVista();
  }

  async esperarVista() {
    await this.driver.wait(until.elementLocated(this.vistaLogin), 5000);
  }

  async ingresarCredenciales(email, password) {
    const campoEmail = await this.driver.findElement(this.inputEmail);
    await campoEmail.clear();
    await campoEmail.sendKeys(email);
    const campoPassword = await this.driver.findElement(this.inputPassword);
    await campoPassword.clear();
    await campoPassword.sendKeys(password);
  }

  async hacerClicIngresar() {
    await this.driver.findElement(this.btnIngresar).click();
  }

  async iniciarSesion(email, password) {
    await this.ingresarCredenciales(email, password);
    await this.hacerClicIngresar();
  }

  async intentarLoginFallido(email, password) {
    const msg = await this.driver.findElement(this.mensaje);
    const anterior = await msg.getText();
    await this.iniciarSesion(email, password);
    await this.driver.wait(async () => (await msg.getText()) !== anterior, 5000);
  }

  async obtenerTitulo() { return this.driver.findElement(this.titulo).getText(); }
  async obtenerMensaje() { return this.driver.findElement(this.mensaje).getText(); }
  async botonIngresarHabilitado() { return this.driver.findElement(this.btnIngresar).isEnabled(); }
  async estaVisible() { return (await this.driver.findElements(this.vistaLogin)).length > 0; }
}

module.exports = LoginPage;
