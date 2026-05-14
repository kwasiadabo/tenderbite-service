const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const swaggerUi     = require('swagger-ui-express');
const swaggerSpec   = require('./config/swagger');
const productRoutes = require('./routes/products.routes');
const orderRoutes   = require('./routes/order.routes');
const pricesRoute   = require('./routes/pricesRoute.routes');
const errorHandler  = require('./middleware/error.middleware');

const app = express();

// ── Security & parsing ────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
//app.use(cors());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString() }),
);

// ── Swagger docs ──────────────────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Products API Docs',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/productprices', pricesRoute);              
app.use('/api/orders', orderRoutes);                          

// ── 404 catch-all ─────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' }),
);

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;