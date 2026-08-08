require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const methodOverride = require('method-override');
const path = require('path');

const app = express();

// CRITICAL: Trust proxy for Railway/Render/Heroku
app.set('trust proxy', 1);

// Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration - Fixed for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'fpci_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600,
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native'
  }),
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: 'none'
  }
}));

app.use(flash());

// Globals
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.error       = req.flash('error');
  res.locals.user        = req.session.user || null;
  res.locals.appName     = process.env.APP_NAME || 'FPCI';
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  res.locals.appUrl = proto + '://' + host;
  next();
});

// Routes
app.use('/auth',      require('./src/routes/auth'));
app.use('/dashboard', require('./src/routes/dashboard'));
app.use('/forms',     require('./src/routes/forms'));
app.use('/branches',  require('./src/routes/branches'));
app.use('/reports',   require('./src/routes/reports'));
app.use('/admin',     require('./src/routes/admin'));
app.use('/api',       require('./src/routes/api'));

// Home
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// Debug route - shows session info
app.get('/debug-session', (req, res) => {
  res.json({
    hasSession: !!req.session.user,
    sessionID: req.sessionID,
    isProduction: process.env.NODE_ENV === 'production',
    trustProxy: app.get('trust proxy'),
    protocol: req.protocol,
    secure: req.secure,
    forwardedProto: req.headers['x-forwarded-proto']
  });
});

// 404
app.use((req, res) => {
  res.status(404).render('partials/404', { title: '404 - Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (res.headersSent) return;
  res.status(500).render('partials/error', {
    title: 'Server Error',
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 FPCI Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
