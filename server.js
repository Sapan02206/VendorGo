const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const vendorRoutes = require('./routes/vendors');
const orderRoutes = require('./routes/orders');
const whatsappRoutes = require('./routes/whatsapp');

// NO AUTH ROUTES - Identity is implicit via WhatsApp phone number
// Vendors authenticate via WhatsApp (platform handles authentication)
// Customers browse anonymously (no accounts needed)

// Import middleware
const logger = require('./utils/logger');

const app = express();

// Security middleware - TEMPORARILY DISABLED FOR DEBUGGING
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://fonts.googleapis.com"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://checkout.razorpay.com"],
//       imgSrc: ["'self'", "data:", "https:", "blob:"],
//       connectSrc: ["'self'", "https:", "wss:"],
//       fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
//       objectSrc: ["'none'"],
//       mediaSrc: ["'self'"],
//       frameSrc: ["'self'", "https://api.razorpay.com"]
//     }
//   }
// }));

// Minimal security for debugging
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP completely for debugging
}));

app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));
app.use(express.static('.'));

// Database connection with retry logic and fallback
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorgo';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    logger.info('✅ Connected to MongoDB');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Running in demo mode without database');
    
    // Don't retry connection for demo mode
    // In production, you would retry: setTimeout(connectDB, 5000);
  }
};

connectDB();

// API Routes - NO AUTHENTICATION REQUIRED
// Identity is channel-based:
// - WhatsApp interface = Vendor (authenticated by WhatsApp)
// - Web PWA = Customer (anonymous browsing, UPI for payments)
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html')); // Customer PWA
});

// Vendor Dashboard
app.get('/vendor-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/vendor-dashboard.html'));
});

// NEW: WhatsApp Vendor Onboarding Demo
app.get('/whatsapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'whatsapp-demo.html'));
});

// NEW: Individual vendor storefronts
app.get('/store/:vendorId', async (req, res) => {
  try {
    const Vendor = require('./models/Vendor');
    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) {
      return res.status(404).send('Vendor not found');
    }
    
    // Serve customer PWA with vendor pre-loaded
    res.sendFile(path.join(__dirname, 'public/index.html'));
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// WhatsApp demo
app.get('/whatsapp-demo.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'whatsapp-demo.html'));
});

// API documentation (for judges/developers)
app.get('/api', (req, res) => {
  res.json({
    name: 'VendorGo Digital Presence API',
    version: '1.0.0',
    description: 'Infrastructure for creating digital presence for street vendors',
    endpoints: {
      'POST /api/whatsapp/webhook': 'WhatsApp vendor onboarding',
      'GET /api/vendors': 'Discover nearby vendors',
      'POST /api/orders/guest': 'Place order without account',
      'GET /api/health': 'System health check'
    },
    demo: {
      'whatsapp': '/whatsapp-demo.html',
      'customer': '/',
      'store_example': '/store/[vendor-id]'
    }
  });
});

// Catch all handler for SPA
app.get('*', (req, res) => {
  // If it's an API route that doesn't exist, return 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Otherwise serve the main app
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('SIGTERM received, shutting down gracefully');
  
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed');
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  console.log('SIGINT received, shutting down gracefully');
  
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed');
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 VendorGo server running on port ${PORT}`);
  console.log(`🚀 VendorGo server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 App URL: http://localhost:${PORT}`);
  console.log(`🤖 WhatsApp Demo: http://localhost:${PORT}/whatsapp-demo.html`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;