const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  // Fallback for local development
  serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://e-srent-yphpzl7d9-esrentals-projects.vercel.app',
      /^http:\/\/localhost:\d+$/, // allow any localhost port
      /^https:\/\/.*\.vercel\.app$/ // allow any vercel deployment
    ].filter(Boolean);
    
    if (
      !origin ||
      allowedOrigins.some(allowedOrigin =>
        allowedOrigin instanceof RegExp
          ? allowedOrigin.test(origin)
          : allowedOrigin === origin
      )
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'cache-control'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'cache-control'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.error('Request timeout');
    if (!res.headersSent) {
      res.status(504).json({ 
        error: 'Request timeout',
        details: 'The request took too long to process'
      });
    }
  });
  next();
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/categories', require('./routes/categories'));

// 404 handler
app.use((req, res, next) => {
  if (!res.headersSent) {
    res.status(404).json({ 
      error: 'Not Found',
      details: `Cannot ${req.method} ${req.url}`
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific Firebase Admin errors
  if (err.code === 'PERMISSION_DENIED') {
    return res.status(403).json({
      error: 'Permission denied',
      details: err.message
    });
  }

  if (err.code === 'INVALID_ARGUMENT') {
    return res.status(400).json({
      error: 'Invalid request',
      details: err.message
    });
  }

  // Default error response
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
