const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on role
    let user;
    if (decoded.role === 'vendor') {
      user = await Vendor.findById(decoded.id).select('-password');
    } else if (decoded.role === 'customer') {
      user = await Customer.findById(decoded.id).select('-password');
    } else {
      return res.status(401).json({ error: 'Invalid token role' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: 'Account not verified' });
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(401).json({ error: 'Account suspended or inactive' });
    }

    req.user = {
      id: user._id,
      role: decoded.role,
      name: user.name,
      phone: user.phone,
      email: user.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is a vendor
const requireVendor = (req, res, next) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ error: 'Access denied. Vendor role required.' });
  }
  next();
};

// Middleware to check if user is a customer
const requireCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Access denied. Customer role required.' });
  }
  next();
};

// Middleware to check if user is admin (for future use)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

// Optional auth - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.role === 'vendor') {
      user = await Vendor.findById(decoded.id).select('-password');
    } else if (decoded.role === 'customer') {
      user = await Customer.findById(decoded.id).select('-password');
    }

    if (user && user.isVerified && user.status === 'active') {
      req.user = {
        id: user._id,
        role: decoded.role,
        ...user.toObject()
      };
    }
    
    next();
  } catch (error) {
    // Ignore auth errors in optional auth
    next();
  }
};

module.exports = {
  auth,
  requireVendor,
  requireCustomer,
  requireAdmin,
  optionalAuth
};