const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'cineflex-secret';

// ---------- Seguridad perimetral y trazabilidad ----------
// CSP desactivado solo porque el frontend mock usa <script> inline
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- Datos simulados ----------
const USUARIO = { email: 'cliente@cineflex.com', password: 'Cine123*' };

const peliculas = [
  { id: 1, titulo: 'Dune: Parte Tres', genero: 'Ciencia ficción', duracion: 155, precio: 18000 },
  { id: 2, titulo: 'El Último Estreno', genero: 'Acción', duracion: 128, precio: 16000 },
  { id: 3, titulo: 'Risas en Bogotá', genero: 'Comedia', duracion: 102, precio: 14000 }
];

const FILAS = ['A', 'B', 'C', 'D', 'E'];
const OCUPADOS = ['A3', 'B4', 'C2', 'D5'];
const asientos = {};
peliculas.forEach(p => {
  asientos[p.id] = FILAS.flatMap(f =>
    [1, 2, 3, 4, 5, 6].map(n => ({ codigo: `${f}${n}`, ocupado: OCUPADOS.includes(`${f}${n}`) }))
  );
});

// ---------- STUB de la pasarela bancaria (Fase A) ----------
// Reemplaza la API real del banco mientras no tengamos acceso a su sandbox.
// Cuando el banco entregue credenciales, solo se cambia esta función.
function pasarelaBancariaStub(tarjeta) {
  const TARJETAS_APROBADAS = ['4111111111111111', '5555555555554444'];
  if (tarjeta && TARJETAS_APROBADAS.includes(tarjeta.numero)) {
    return { aprobada: true, codigoAutorizacion: 'AUTH-' + Date.now() };
  }
  return { aprobada: false, motivo: 'Tarjeta rechazada por el banco' };
}

// ---------- Middleware JWT ----------
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ---------- Endpoints ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  if (email !== USUARIO.email || password !== USUARIO.password) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
  res.json({ token, usuario: { email } });
});

app.get('/api/cartelera', auth, (req, res) => res.json(peliculas));

app.get('/api/asientos/:peliculaId', (req, res) => {
  const lista = asientos[req.params.peliculaId];
  if (!lista) return res.status(404).json({ error: 'Película no encontrada' });
  res.json(lista);
});

app.post('/api/reservas', auth, (req, res) => {
  const { peliculaId, asiento, tarjeta } = req.body || {};
  if (!peliculaId || !asiento || !tarjeta) {
    return res.status(400).json({ error: 'Datos de reserva incompletos' });
  }
  const lista = asientos[peliculaId];
  const silla = lista && lista.find(a => a.codigo === asiento);
  if (!silla) return res.status(404).json({ error: 'Asiento no encontrado' });
  if (silla.ocupado) return res.status(409).json({ error: 'El asiento ya está ocupado' });

  const pago = pasarelaBancariaStub(tarjeta);
  if (!pago.aprobada) return res.status(402).json({ error: 'Pago rechazado: tarjeta inválida' });

  silla.ocupado = true;
  const pelicula = peliculas.find(p => p.id == peliculaId);
  res.status(201).json({
    ticket: { id: 'TCK-' + Date.now(), pelicula: pelicula.titulo, asiento, codigoAutorizacion: pago.codigoAutorizacion }
  });
});

app.listen(PORT, () => console.log(`CineFlex API en http://localhost:${PORT}`));
