const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Get all vendors with filtering and pagination
router.get('/', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Return demo data when database is not connected
      const demoVendors = [
        {
          _id: 'demo1',
          name: "Raj's Street Food",
          businessName: "Raj's Street Food Empire",
          phone: '+91 9876543210',
          category: 'food',
          location: 'MG Road, Bangalore',
          isOnline: true,
          rating: 4.8,
          totalOrders: 150,
          views: 500,
          products: [
            { name: 'Pani Puri', price: 30 },
            { name: 'Bhel Puri', price: 40 }
          ],
          createdAt: new Date(),
          createdVia: 'web'
        },
        {
          _id: 'demo2',
          name: "Fashion Street",
          businessName: "Fashion Street Boutique",
          phone: '+91 9876543211',
          category: 'clothing',
          location: 'Brigade Road, Bangalore',
          isOnline: false,
          rating: 4.5,
          totalOrders: 80,
          views: 300,
          products: [
            { name: 'T-Shirt', price: 299 },
            { name: 'Jeans', price: 899 }
          ],
          createdAt: new Date(),
          createdVia: 'whatsapp'
        }
      ];
      
      return res.json({
        vendors: demoVendors,
        pagination: {
          current: 1,
          pages: 1,
          total: demoVendors.length,
          limit: 20
        }
      });
    }

    const {
      category,
      latitude,
      longitude,
      radius = 10,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { status: 'active' };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { 'products.name': { $regex: search, $options: 'i' } },
        { 'location.address.street': { $regex: search, $options: 'i' } }
      ];
    }

    // Location-based filtering - simplified for demo
    if (latitude && longitude) {
      // For demo purposes, just return all vendors
      // In production, use proper geospatial queries with correct indexes
      console.log(`Location filter requested: ${latitude}, ${longitude}, radius: ${radius}km`);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const vendors = await Vendor.find(query)
      .select('-password -verificationToken -passwordResetToken')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vendor.countDocuments(query);

    // Add distance if location provided
    if (latitude && longitude) {
      vendors.forEach(vendor => {
        vendor._doc.distance = vendor.getDistanceFrom(
          parseFloat(longitude),
          parseFloat(latitude)
        );
      });
    }

    res.json({
      vendors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Get vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .select('-password -verificationToken -passwordResetToken');
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Increment profile views
    vendor.analytics.profileViews += 1;
    await vendor.save();

    res.json(vendor);
  } catch (error) {
    logger.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// Create new vendor (registration - no auth required)
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('businessName').trim().isLength({ min: 2, max: 150 }).withMessage('Business name must be 2-150 characters'),
  body('phone').trim().isLength({ min: 8, max: 20 }).withMessage('Phone number required'),
  body('category').isIn(['food', 'clothing', 'electronics', 'accessories', 'services', 'other']).withMessage('Invalid category'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Invalid coordinates'),
  body('location.address.street').trim().isLength({ min: 3 }).withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = req.body.phone.replace(/\D/g, '');
    
    // Check if phone number already exists
    const existingVendor = await Vendor.findOne({ phone: normalizedPhone });
    if (existingVendor) {
      console.log('⚠️ Phone number already registered:', normalizedPhone);
      return res.status(400).json({ error: 'Phone number already registered', vendorId: existingVendor._id });
    }

    // Create vendor with normalized phone
    const vendorData = {
      ...req.body,
      phone: normalizedPhone
    };
    
    const vendor = new Vendor(vendorData);
    await vendor.save();

    console.log('✅ New vendor created:', vendor._id, vendor.name);
    console.log('📍 Location:', vendor.location.coordinates);
    console.log('📦 Products:', vendor.products.length);

    logger.info(`New vendor registered: ${vendor._id}`);
    res.status(201).json(vendor);
  } catch (error) {
    console.error('❌ Error creating vendor:', error);
    logger.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor', details: error.message });
  }
});

// Update vendor profile (no auth required - phone-based identity)
router.put('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'businessName', 'description', 'category', 'subCategory',
      'location', 'businessHours', 'deliveryOptions', 'paymentMethods',
      'notifications'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    await vendor.save();

    res.json(vendor);
  } catch (error) {
    logger.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Bulk update vendor products (for WhatsApp bot)
router.put('/:id/products/bulk', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Replace all products with new ones
    vendor.products = req.body.products || [];
    await vendor.save();

    res.json({ 
      message: 'Products updated successfully',
      productCount: vendor.products.length 
    });
  } catch (error) {
    logger.error('Error bulk updating products:', error);
    res.status(500).json({ error: 'Failed to update products' });
  }
});

// Add product to vendor (no auth - WhatsApp identity)
router.post('/:id/products', uploadSingle('image'), [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().isIn(['food', 'clothing', 'electronics', 'accessories', 'services', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const product = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category || vendor.category,
      available: req.body.available !== false,
      tags: req.body.tags || [],
      variants: req.body.variants || [],
      image: req.file ? req.file.path : null,
      imagePublicId: req.file ? req.file.filename : null
    };

    vendor.products.push(product);
    await vendor.save();

    const addedProduct = vendor.products[vendor.products.length - 1];
    res.status(201).json(addedProduct);
  } catch (error) {
    logger.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product
router.put('/:id/products/:productId', auth, uploadSingle('image'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor._id.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const product = vendor.products.id(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'price', 'available', 'tags', 'variants'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    // Update image if new one is uploaded
    if (req.file) {
      product.image = req.file.path; // Cloudinary URL
      product.imagePublicId = req.file.filename; // For deletion
    }

    await vendor.save();
    res.json(product);
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (no auth - WhatsApp identity)
router.delete('/:id/products/:productId', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const product = vendor.products.id(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productName = product.name;
    vendor.products.pull(req.params.productId);
    await vendor.save();

    logger.info(`Product "${productName}" deleted from vendor ${vendor.name}`);

    res.json({ 
      message: 'Product deleted successfully',
      productName: productName
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Upload vendor images
router.post('/:id/images', auth, uploadMultiple('images', 5), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const imageUrls = req.files.map(file => ({
      url: file.secure_url,
      publicId: file.public_id,
      caption: req.body.caption || ''
    }));

    vendor.businessImages.push(...imageUrls);
    await vendor.save();

    res.json({ images: imageUrls });
  } catch (error) {
    logger.error('Error uploading images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Get vendor orders
router.get('/:id/orders', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      status,
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = req.query;

    const query = { vendor: req.params.id };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get vendor analytics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor._id.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [orderStats, popularProducts] = await Promise.all([
      Order.getOrderStats(req.params.id, startDate, new Date()),
      Order.getPopularItems(req.params.id, 10)
    ]);

    const analytics = {
      period,
      orders: orderStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        cancelledOrders: 0
      },
      popularProducts,
      profile: {
        views: vendor.analytics.profileViews,
        searchAppearances: vendor.analytics.searchAppearances,
        clickThroughs: vendor.analytics.clickThroughs
      },
      digitalPresence: vendor.digitalPresence
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching vendor analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Add review to vendor
router.post('/:id/reviews', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if user already reviewed this vendor
    const existingReview = vendor.digitalPresence.reviews.find(
      review => review.customer.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this vendor' });
    }

    const review = {
      customer: req.user.id,
      rating: req.body.rating,
      comment: req.body.comment
    };

    vendor.digitalPresence.reviews.push(review);
    vendor.updateRating();
    await vendor.save();

    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    logger.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Toggle vendor status (no auth - WhatsApp identity)
router.patch('/:id/status', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.isCurrentlyOpen = !vendor.isCurrentlyOpen;
    vendor.analytics.lastActive = new Date();
    await vendor.save();

    res.json({ 
      isOpen: vendor.isCurrentlyOpen,
      message: `Store ${vendor.isCurrentlyOpen ? 'opened' : 'closed'} successfully`
    });
  } catch (error) {
    logger.error('Error toggling vendor status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete vendor (no auth - WhatsApp identity)
router.delete('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendorName = vendor.name;
    const vendorPhone = vendor.phone;
    
    await Vendor.findByIdAndDelete(req.params.id);

    logger.info(`Vendor deleted: ${req.params.id} (${vendorName}, ${vendorPhone})`);
    console.log(`🗑️ Vendor shop deleted: ${vendorName} (${vendorPhone})`);

    res.json({ 
      message: 'Vendor deleted successfully',
      vendorName: vendorName
    });
  } catch (error) {
    logger.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

module.exports = router;