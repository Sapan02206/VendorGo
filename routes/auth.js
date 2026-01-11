const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId, role = 'customer') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Unified Registration (for API client compatibility)
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone').isLength({ min: 8, max: 15 }).withMessage('Phone number must be 8-15 digits'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['customer', 'vendor']).withMessage('Role must be customer or vendor')
], async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, password, role, businessName, category, location } = req.body;

    if (role === 'vendor') {
      // Vendor registration
      const existingVendor = await Vendor.findOne({ phone });
      if (existingVendor) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }

      if (email) {
        const existingEmail = await Vendor.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      const vendor = new Vendor({
        name,
        businessName: businessName || name,
        phone,
        email,
        password: password || 'defaultpassword123', // Default password for form registration
        category: category || 'other',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716], // Default to Bangalore
          address: { street: location || 'Location to be updated' }
        },
        isVerified: true,
        status: 'active',
        onboardingSource: 'web'
      });

      await vendor.save();

      const token = generateToken(vendor._id, 'vendor');

      res.status(201).json({
        message: 'Vendor registered successfully',
        token,
        user: {
          id: vendor._id,
          name: vendor.name,
          businessName: vendor.businessName,
          phone: vendor.phone,
          email: vendor.email,
          category: vendor.category,
          role: 'vendor'
        }
      });

      logger.info(`New vendor registered: ${vendor._id}`);
    } else {
      // Customer registration
      const existingCustomer = await Customer.findOne({ phone });
      if (existingCustomer) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }

      if (email) {
        const existingEmail = await Customer.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      const customer = new Customer({
        name,
        phone,
        email,
        password,
        isVerified: true
      });

      await customer.save();

      const token = generateToken(customer._id, 'customer');

      res.status(201).json({
        message: 'Customer registered successfully',
        token,
        user: {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          role: 'customer'
        }
      });

      logger.info(`New customer registered: ${customer._id}`);
    }
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Customer Registration
router.post('/register/customer', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone').matches(/^(\+91|91)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, password } = req.body;

    // Check if phone already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Customer.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const customer = new Customer({
      name,
      phone,
      email,
      password,
      isVerified: true // Auto-verify for demo
    });

    await customer.save();

    const token = generateToken(customer._id, 'customer');

    res.status(201).json({
      message: 'Customer registered successfully',
      token,
      user: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        role: 'customer'
      }
    });

    logger.info(`New customer registered: ${customer._id}`);
  } catch (error) {
    logger.error('Customer registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Vendor Registration
router.post('/register/vendor', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('businessName').trim().isLength({ min: 2, max: 150 }).withMessage('Business name must be 2-150 characters'),
  body('phone').matches(/^(\+91|91)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('category').isIn(['food', 'clothing', 'electronics', 'accessories', 'services', 'other']).withMessage('Invalid category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, businessName, phone, email, password, category, location } = req.body;

    // Check if phone already exists
    const existingVendor = await Vendor.findOne({ phone });
    if (existingVendor) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Vendor.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const vendor = new Vendor({
      name,
      businessName,
      phone,
      email,
      password,
      category,
      location: location || {
        type: 'Point',
        coordinates: [77.5946, 12.9716], // Default to Bangalore
        address: { street: 'Location to be updated' }
      },
      isVerified: true, // Auto-verify for demo
      status: 'active',
      onboardingSource: 'web'
    });

    await vendor.save();

    const token = generateToken(vendor._id, 'vendor');

    res.status(201).json({
      message: 'Vendor registered successfully',
      token,
      user: {
        id: vendor._id,
        name: vendor.name,
        businessName: vendor.businessName,
        phone: vendor.phone,
        email: vendor.email,
        category: vendor.category,
        role: 'vendor'
      }
    });

    logger.info(`New vendor registered: ${vendor._id}`);
  } catch (error) {
    logger.error('Vendor registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login (works for both customers and vendors)
router.post('/login', [
  body('phone').isLength({ min: 8, max: 15 }).withMessage('Phone number must be 8-15 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password, userType = 'customer' } = req.body;

    let user;
    let role;

    if (userType === 'vendor') {
      user = await Vendor.findOne({ phone });
      role = 'vendor';
    } else {
      user = await Customer.findOne({ phone });
      role = 'customer';
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: 'Account not verified' });
    }

    // Update login analytics
    if (user.analytics) {
      user.analytics.lastLogin = new Date();
      user.analytics.loginCount = (user.analytics.loginCount || 0) + 1;
      await user.save();
    }

    const token = generateToken(user._id, role);

    const userResponse = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role
    };

    if (role === 'vendor') {
      userResponse.businessName = user.businessName;
      userResponse.category = user.category;
      userResponse.isCurrentlyOpen = user.isCurrentlyOpen;
    }

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

    logger.info(`User logged in: ${user._id} (${role})`);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    let user;
    
    if (req.user.role === 'vendor') {
      user = await Vendor.findById(req.user.id).select('-password -verificationToken -passwordResetToken');
    } else {
      user = await Customer.findById(req.user.id).select('-password -verificationToken -passwordResetToken');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/me', auth, async (req, res) => {
  try {
    let user;
    const allowedUpdates = ['name', 'email'];
    
    if (req.user.role === 'vendor') {
      user = await Vendor.findById(req.user.id);
      allowedUpdates.push('businessName', 'description', 'businessHours', 'notifications');
    } else {
      user = await Customer.findById(req.user.id);
      allowedUpdates.push('preferences', 'notifications');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update only allowed fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verificationToken;
    delete userResponse.passwordResetToken;

    res.json(userResponse);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').isLength({ min: 6 }).withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    let user;
    if (req.user.role === 'vendor') {
      user = await Vendor.findById(req.user.id);
    } else {
      user = await Customer.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', auth, async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.id} (${req.user.role})`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get('/verify', auth, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

// Request password reset (simplified for demo)
router.post('/forgot-password', [
  body('phone').matches(/^(\+91|91)?[6-9]\d{9}$/).withMessage('Invalid phone number'),
  body('userType').isIn(['customer', 'vendor']).withMessage('Invalid user type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, userType } = req.body;

    let user;
    if (userType === 'vendor') {
      user = await Vendor.findOne({ phone });
    } else {
      user = await Customer.findOne({ phone });
    }

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If the phone number is registered, you will receive reset instructions' });
    }

    // Generate reset token (in production, send via SMS)
    const resetToken = Math.random().toString(36).substr(2, 8).toUpperCase();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // In production, send SMS with reset token
    logger.info(`Password reset requested for ${phone}, token: ${resetToken}`);

    res.json({ 
      message: 'Reset token generated',
      resetToken // Remove this in production
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('phone').matches(/^(\+91|91)?[6-9]\d{9}$/).withMessage('Invalid phone number'),
  body('resetToken').isLength({ min: 6 }).withMessage('Reset token required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('userType').isIn(['customer', 'vendor']).withMessage('Invalid user type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, resetToken, newPassword, userType } = req.body;

    let user;
    if (userType === 'vendor') {
      user = await Vendor.findOne({ 
        phone,
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() }
      });
    } else {
      user = await Customer.findOne({ 
        phone,
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() }
      });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;