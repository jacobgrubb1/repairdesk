require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { sanitize } = require('./middleware/sanitize');
const { csrfProtection } = require('./middleware/csrf');
const { authLimiter, publicLimiter, generalLimiter } = require('./middleware/rateLimit');

// Route imports
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const customerRoutes = require('./routes/customers');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const templateRoutes = require('./routes/templates');
const storeRoutes = require('./routes/store');
const paymentRoutes = require('./routes/payments');
const checklistRoutes = require('./routes/checklist');
const tagRoutes = require('./routes/tags');
const warrantyRoutes = require('./routes/warranties');
const publicRoutes = require('./routes/public');
const photoRoutes = require('./routes/photos');
const supplierRoutes = require('./routes/suppliers');
const partRoutes = require('./routes/parts');
const suggestionRoutes = require('./routes/suggestions');
const orgRoutes = require('./routes/org');
const searchRoutes = require('./routes/search');
const cannedResponseRoutes = require('./routes/cannedResponses');
const stripeWebhookRoute = require('./routes/stripeWebhook');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Middleware stack
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cookieParser());

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoute);

app.use(express.json({ limit: '5mb' }));
app.use(cors({
  origin: isProduction ? process.env.FRONTEND_URL : 'http://localhost:5173',
  credentials: true,
}));
app.use(requestLogger);
app.use(sanitize);

// ---------------------------------------------------------------------------
// Public routes (no CSRF)
// ---------------------------------------------------------------------------
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/auth', authLimiter, authRoutes);

// ---------------------------------------------------------------------------
// CSRF protection for all subsequent routes
// ---------------------------------------------------------------------------
app.use(csrfProtection);

// ---------------------------------------------------------------------------
// General rate limiter for remaining API routes
// ---------------------------------------------------------------------------
app.use(generalLimiter);

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------
app.use('/api/tickets', ticketRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/store', storeRoutes);
app.use('/api', paymentRoutes);
app.use('/api', checklistRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', warrantyRoutes);
app.use('/api', photoRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/parts', partRoutes);
app.use('/api', suggestionRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/canned-responses', cannedResponseRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ---------------------------------------------------------------------------
// Production: serve client build & SPA catch-all
// ---------------------------------------------------------------------------
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server & graceful shutdown
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    db.pool.end().then(() => process.exit(0));
  });
});
