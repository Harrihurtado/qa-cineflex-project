const { By, until } = require('selenium-webdriver');

/**
 * Page Object: Cartelera
 * Solo localizadores y acciones. SIN aserciones.
 */
class CarteleraPage {
  constructor(driver, baseUrl) {
    this.driver = driver;
    this.baseUrl = baseUrl;
    this.vista = By.css('#vista-cartelera.activa');
    this.titulo = By.id('titulo-cartelera');
    this.peliculas = By.css('#lista-peliculas .pelicula');
    this.titulosPeliculas = By.css('#lista-peliculas .pelicula-titulo');
    this.botonesComprar = By.css('#lista-peliculas .btn-seleccionar');
    this.btnCerrarSesion = By.id('btn-logout');
  }

  async esperarCarga() {
    await this.driver.wait(until.elementLocated(this.vista), 5000);
    await this.driver.wait(until.elementLocated(this.peliculas), 5000);
  }

  async obtenerTitulo() { return this.driver.findElement(this.titulo).getText(); }
  async contarPeliculas() { return (await this.driver.findElements(this.peliculas)).length; }
  async contarBotonesComprar() { return (await this.driver.findElements(this.botonesComprar)).length; }

  async obtenerTitulosPeliculas() {
    const elementos = await this.driver.findElements(this.titulosPeliculas);
    return Promise.all(elementos.map(e => e.getText()));
  }

  async seleccionarPelicula(indice = 0) {
    const botones = await this.driver.findElements(this.botonesComprar);
    await botones[indice].click();
  }

  async botonCerrarSesionVisible() { return this.driver.findElement(this.btnCerrarSesion).isDisplayed(); }
  async cerrarSesion() { await this.driver.findElement(this.btnCerrarSesion).click(); }
  async volverAtras() { await this.driver.navigate().back(); }
  async abrirDirecto() { await this.driver.get(this.baseUrl + '/#/cartelera'); }
  async estaVisible() { return (await this.driver.findElements(this.vista)).length > 0; }
}

module.exports = CarteleraPage;
