const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const { auth, requireCustomer, requireVendor } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const WhatsAppService = require('../services/whatsappService');

// Create guest order (no authentication required)
router.post('/guest', [
  body('vendorId').isMongoId().withMessage('Invalid vendor ID'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customerInfo.phone').isLength({ min: 8, max: 15 }).withMessage('Phone number must be 8-15 digits'),
  body('paymentMethod').isIn(['cash', 'upi']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vendorId, items, customerInfo, paymentMethod, total } = req.body;

    // Verify vendor exists and is active
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'active') {
      return res.status(404).json({ error: 'Vendor not found or inactive' });
    }

    // Verify all products exist and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = vendor.products.id(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found` });
      }

      if (!product.available) {
        return res.status(400).json({ error: `Product ${product.name} is not available` });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });
    }

    // Generate order number
    const orderNumber = 'ORD' + Date.now().toString().slice(-8);

    // Create order
    const order = new Order({
      vendor: vendorId,
      items: orderItems,
      subtotal: subtotal,
      total: total || subtotal,
      customerInfo: {
        name: customerInfo.name || 'Customer',
        phone: customerInfo.phone,
        address: customerInfo.address || ''
      },
      payment: {
        method: paymentMethod,
        amount: total || subtotal,
        status: paymentMethod === 'cash' ? 'pending' : 'processing'
      },
      orderNumber: orderNumber,
      status: 'placed',
      source: 'web'
    });

    await order.save();

    // Generate UPI payment link if needed
    let paymentLink = null;
    if (paymentMethod === 'upi') {
      const PaymentService = require('../services/paymentService');
      const paymentService = new PaymentService();
      
      const paymentData = paymentService.generateUPIPaymentLink({
        vendorUPIId: vendor.upiId || 'vendor@paytm',
        amount: total || subtotal,
        vendorName: vendor.name,
        orderNumber: orderNumber,
        customerPhone: customerInfo.phone
      });
      
      paymentLink = paymentData.upiLink;
    }

    // Update vendor analytics
    vendor.analytics.totalOrders = (vendor.analytics.totalOrders || 0) + 1;
    vendor.analytics.totalRevenue = (vendor.analytics.totalRevenue || 0) + (total || subtotal);
    await vendor.save();

    // Send notifications to customer and vendor
    try {
      const whatsappService = new WhatsAppService();
      
      // Notify customer
      if (customerInfo.phone) {
        await whatsappService.sendOrderConfirmation(customerInfo.phone, {
          orderNumber: order.orderNumber,
          vendorName: vendor.name,
          items: orderItems,
          total: total || subtotal,
          vendorPhone: vendor.phone,
          paymentMethod: paymentMethod
        });
      }
      
      // Notify vendor
      await whatsappService.sendNewOrderNotification(vendor.phone, {
        orderNumber: order.orderNumber,
        customerName: customerInfo.name || 'Customer',
        customerPhone: customerInfo.phone,
        items: orderItems,
        total: total || subtotal,
        paymentMethod: paymentMethod
      });
      
    } catch (notificationError) {
      logger.error('Notification error:', notificationError);
      // Don't fail the order if notifications fail
    }

    logger.info(`Guest order created: ${order._id} for vendor: ${vendor.name}`);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        items: order.items,
        customerInfo: order.customerInfo,
        payment: order.payment,
        paymentLink: paymentLink,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    logger.error('Guest order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Create new order
router.post('/', auth, requireCustomer, [
  body('vendorId').isMongoId().withMessage('Invalid vendor ID'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('delivery.type').isIn(['pickup', 'delivery']).withMessage('Invalid delivery type'),
  body('payment.method').isIn(['cash', 'upi', 'card']).withMessage('Invalid payment method'),
  body('customerInfo.name').trim().isLength({ min: 2 }).withMessage('Customer name required'),
  body('customerInfo.phone').matches(/^(\+91|91)?[6-9]\d{9}$/).withMessage('Invalid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vendorId, items, delivery, payment, customerInfo, specialInstructions } = req.body;

    // Verify vendor exists and is active
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'active') {
      return res.status(404).json({ error: 'Vendor not found or inactive' });
    }

    if (!vendor.acceptsOnlineOrders) {
      return res.status(400).json({ error: 'Vendor is not accepting online orders' });
    }

    // Verify all products exist and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = vendor.products.id(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }

      if (!product.available) {
        return res.status(400).json({ error: `Product ${product.name} is not available` });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productPrice: product.price,
        quantity: item.quantity,
        variant: item.variant,
        specialInstructions: item.specialInstructions,
        subtotal: itemSubtotal
      });
    }

    // Calculate delivery fee
    let deliveryFee = 0;
    if (delivery.type === 'delivery') {
      deliveryFee = vendor.deliveryOptions.deliveryFee || 0;
    }

    // Calculate taxes (simplified - 5% GST for food, 18% for others)
    const taxRate = vendor.category === 'food' ? 0.05 : 0.18;
    const taxAmount = subtotal * taxRate;

    const total = subtotal + deliveryFee + taxAmount;

    // Create order
    const order = new Order({
      customer: req.user.id,
      vendor: vendorId,
      items: orderItems,
      subtotal,
      taxes: {
        total: taxAmount
      },
      deliveryFee,
      total,
      customerInfo,
      delivery,
      payment: {
        method: payment.method,
        amount: total,
        status: payment.method === 'cash' ? 'pending' : 'processing'
      },
      specialInstructions,
      source: 'web'
    });

    await order.save();

    // Update vendor's order count
    vendor.digitalPresence.totalOrders += 1;
    await vendor.save();

    // Update customer's order stats
    const customer = await Customer.findById(req.user.id);
    if (customer) {
      await customer.updateOrderStats(total, vendorId);
    }

    // Send WhatsApp notification to vendor
    try {
      const whatsappService = new WhatsAppService();
      if (whatsappService.isClientReady()) {
        await whatsappService.sendOrderNotification(vendor.phone, order);
      }
    } catch (whatsappError) {
      logger.warn('Failed to send WhatsApp notification:', whatsappError);
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`vendor-${vendorId}`).emit('new-order', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        customerName: order.customerInfo.name
      });
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        estimatedReadyTime: order.estimatedReadyTime
      }
    });

    logger.info(`New order placed: ${order.orderNumber} by customer ${req.user.id}`);
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get orders by phone number (for guest customers)
router.get('/by-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone || phone.length < 8) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    const orders = await Order.find({ 
      'customerInfo.phone': phone 
    })
    .populate('vendor', 'name businessName phone location')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        items: order.items,
        customerInfo: order.customerInfo,
        vendor: order.vendor,
        payment: order.payment,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }))
    });

  } catch (error) {
    logger.error('Get orders by phone error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendor', 'name businessName phone location')
      .populate('customer', 'name phone');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    const hasAccess = 
      order.customer._id.toString() === req.user.id ||
      order.vendor._id.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get user's orders (customer or vendor)
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = req.query;

    const query = {};
    
    // Filter by user role
    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    } else if (req.user.role === 'vendor') {
      query.vendor = req.user.id;
    }

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
      .populate('vendor', 'name businessName phone location')
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
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (vendor only)
router.patch('/:id/status', auth, requireVendor, [
  body('status').isIn([
    'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'
  ]).withMessage('Invalid status'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, note, estimatedReadyTime } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if vendor owns this order
    if (order.vendor.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate status transition
    const validTransitions = {
      placed: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['out_for_delivery', 'delivered', 'cancelled'],
      out_for_delivery: ['delivered', 'cancelled'],
      delivered: ['completed'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({ 
        error: `Cannot change status from ${order.status} to ${status}` 
      });
    }

    // Update order
    await order.updateStatus(status, note, 'vendor');

    if (estimatedReadyTime && status === 'confirmed') {
      order.estimatedReadyTime = new Date(estimatedReadyTime);
      await order.save();
    }

    // Update vendor stats
    if (status === 'completed') {
      const vendor = await Vendor.findById(order.vendor);
      if (vendor) {
        vendor.digitalPresence.completedOrders += 1;
        await vendor.save();
      }
    }

    // Emit real-time notification to customer
    const io = req.app.get('io');
    if (io) {
      io.to(`customer-${order.customer}`).emit('order-update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        note
      });
    }

    // Send WhatsApp/SMS notifications to customer
    try {
      const whatsappService = new WhatsAppService();
      const vendor = await Vendor.findById(order.vendor);
      
      if (order.customerInfo && order.customerInfo.phone) {
        await whatsappService.sendOrderStatusUpdate(order.customerInfo.phone, {
          orderNumber: order.orderNumber,
          status: order.status,
          vendorName: vendor?.name || 'Vendor',
          vendorPhone: vendor?.phone || 'N/A',
          note: note
        });
      }
    } catch (notificationError) {
      logger.error('Status update notification error:', notificationError);
      // Don't fail the status update if notifications fail
    }

    res.json({
      message: 'Order status updated successfully',
      order: {
        id: order._id,
        status: order.status,
        estimatedReadyTime: order.estimatedReadyTime
      }
    });

    logger.info(`Order ${order.orderNumber} status updated to ${status} by vendor ${req.user.id}`);
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order
router.patch('/:id/cancel', auth, [
  body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Cancellation reason required (5-500 characters)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has permission to cancel
    const canCancel = 
      order.customer.toString() === req.user.id ||
      order.vendor.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!canCancel) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if order can be cancelled
    if (!order.canBeCancelled) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    await order.cancelOrder(reason, req.user.role);

    // Emit real-time notifications
    const io = req.app.get('io');
    if (io) {
      if (req.user.role === 'customer') {
        io.to(`vendor-${order.vendor}`).emit('order-cancelled', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason
        });
      } else {
        io.to(`customer-${order.customer}`).emit('order-cancelled', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason
        });
      }
    }

    res.json({
      message: 'Order cancelled successfully',
      order: {
        id: order._id,
        status: order.status,
        cancellation: order.cancellation
      }
    });

    logger.info(`Order ${order.orderNumber} cancelled by ${req.user.role} ${req.user.id}: ${reason}`);
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Add message to order
router.post('/:id/messages', auth, [
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message required (1-500 characters)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    const hasAccess = 
      order.customer.toString() === req.user.id ||
      order.vendor.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await order.addMessage(req.user.role, message);

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      const targetRoom = req.user.role === 'customer' 
        ? `vendor-${order.vendor}` 
        : `customer-${order.customer}`;
      
      io.to(targetRoom).emit('order-message', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        from: req.user.role,
        message,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    logger.error('Error adding order message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add review to order (customer only)
router.post('/:id/review', auth, requireCustomer, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment, images } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if customer owns this order
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed orders' });
    }

    // Check if already reviewed
    if (order.review.rating) {
      return res.status(400).json({ error: 'Order already reviewed' });
    }

    // Add review to order
    order.review = {
      rating,
      comment,
      images: images || [],
      reviewedAt: new Date()
    };
    await order.save();

    // Add review to vendor
    const vendor = await Vendor.findById(order.vendor);
    if (vendor) {
      vendor.digitalPresence.reviews.push({
        customer: req.user.id,
        rating,
        comment
      });
      vendor.updateRating();
      await vendor.save();
    }

    // Add review to customer's profile
    const customer = await Customer.findById(req.user.id);
    if (customer) {
      await customer.addReview(order.vendor, order._id, rating, comment, images);
    }

    res.json({ message: 'Review added successfully' });

    logger.info(`Review added for order ${order.orderNumber} by customer ${req.user.id}`);
  } catch (error) {
    logger.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;