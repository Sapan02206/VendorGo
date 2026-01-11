// WhatsApp Service - Demo Mode (No actual WhatsApp integration)
const axios = require('axios');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.demoMode = process.env.WHATSAPP_DEMO_MODE === 'true' || true;
  }

  async initialize() {
    if (this.demoMode) {
      logger.info('WhatsApp Service initialized in DEMO mode');
      this.isReady = true;
      return true;
    }
    
    // In production, you would initialize actual WhatsApp client here
    logger.info('WhatsApp Service: Real integration not implemented');
    return false;
  }

  isClientReady() {
    return this.isReady;
  }

  async sendOrderNotification(phone, order) {
    if (this.demoMode) {
      logger.info(`DEMO: Would send WhatsApp notification to ${phone} for order ${order.orderNumber}`);
      return { success: true, demo: true };
    }
    
    // In production, send actual WhatsApp message
    return { success: false, error: 'Real WhatsApp not configured' };
  }

  async sendOrderConfirmation(customerPhone, orderData) {
    const message = `🎉 *Order Confirmed!*

📋 *Order #${orderData.orderNumber}*
🏪 *Vendor:* ${orderData.vendorName}
📱 *Vendor Contact:* ${orderData.vendorPhone}

📦 *Items:*
${orderData.items.map(item => `• ${item.productName} x${item.quantity} - ₹${item.subtotal}`).join('\n')}

💰 *Total:* ₹${orderData.total}

⏰ *Estimated Time:* 15-30 minutes
📍 *Status:* Order placed, waiting for vendor confirmation

We'll keep you updated on your order status!

Thank you for using VendorGo! 🚀`;

    if (this.demoMode) {
      logger.info(`DEMO: Customer notification sent to ${customerPhone}`);
      logger.info(`Message: ${message}`);
      
      // Simulate SMS as well
      logger.info(`DEMO: SMS sent to ${customerPhone}: Order #${orderData.orderNumber} confirmed. Total: ₹${orderData.total}. Vendor: ${orderData.vendorName}`);
      
      return { success: true, demo: true, message };
    }
    
    return await this.sendMessage(customerPhone, message);
  }

  async sendNewOrderNotification(vendorPhone, orderData) {
    const message = `🔔 *New Order Received!*

📋 *Order #${orderData.orderNumber}*
👤 *Customer:* ${orderData.customerName}
📱 *Customer Phone:* ${orderData.customerPhone}

📦 *Items:*
${orderData.items.map(item => `• ${item.productName} x${item.quantity} - ₹${item.subtotal}`).join('\n')}

💰 *Total:* ₹${orderData.total}

⚡ *Action Required:* Please confirm this order in your VendorGo dashboard

Login to your dashboard to manage this order: http://localhost:5000

VendorGo - Digital Presence Platform 🚀`;

    if (this.demoMode) {
      logger.info(`DEMO: Vendor notification sent to ${vendorPhone}`);
      logger.info(`Message: ${message}`);
      
      // Simulate SMS as well
      logger.info(`DEMO: SMS sent to ${vendorPhone}: New order #${orderData.orderNumber} from ${orderData.customerName}. Total: ₹${orderData.total}`);
      
      return { success: true, demo: true, message };
    }
    
    return await this.sendMessage(vendorPhone, message);
  }

  async sendOrderStatusUpdate(customerPhone, orderData) {
    const statusMessages = {
      'confirmed': '✅ Your order has been confirmed by the vendor!',
      'preparing': '👨‍🍳 Your order is being prepared!',
      'ready': '🎉 Your order is ready for pickup!',
      'out_for_delivery': '🚚 Your order is out for delivery!',
      'delivered': '✅ Your order has been delivered!',
      'completed': '🎊 Order completed! Thank you for using VendorGo!'
    };

    const statusMessage = statusMessages[orderData.status] || `Order status updated to: ${orderData.status}`;
    
    const message = `📱 *Order Update*

📋 *Order #${orderData.orderNumber}*
🏪 *Vendor:* ${orderData.vendorName}

${statusMessage}

${orderData.status === 'ready' ? '📍 Please contact the vendor for pickup details.' : ''}
${orderData.status === 'out_for_delivery' ? '📍 Your order will arrive soon!' : ''}

Vendor Contact: ${orderData.vendorPhone}

VendorGo - Digital Presence Platform 🚀`;

    if (this.demoMode) {
      logger.info(`DEMO: Status update sent to ${customerPhone}`);
      logger.info(`Message: ${message}`);
      
      // Simulate SMS as well
      logger.info(`DEMO: SMS sent to ${customerPhone}: Order #${orderData.orderNumber} - ${statusMessage}`);
      
      return { success: true, demo: true, message };
    }
    
    return await this.sendMessage(customerPhone, message);
  }

  async sendMessage(phone, message) {
    if (this.demoMode) {
      logger.info(`DEMO: Would send WhatsApp message to ${phone}: ${message}`);
      return { success: true, demo: true };
    }
    
    return { success: false, error: 'Real WhatsApp not configured' };
  }

  async processIncomingMessage(message) {
    if (this.demoMode) {
      logger.info('DEMO: Processing incoming WhatsApp message');
      return { processed: true, demo: true };
    }
    
    return { processed: false };
  }

  async extractProductsFromMessage(message) {
    // Demo product extraction
    const demoProducts = [
      {
        name: 'Samosa',
        price: 15,
        description: 'Crispy fried samosa with potato filling'
      },
      {
        name: 'Chai',
        price: 10,
        description: 'Hot masala tea'
      }
    ];
    
    return demoProducts;
  }

  async createVendorFromWhatsApp(phoneNumber, businessInfo) {
    try {
      // Create vendor with WhatsApp source
      const vendor = new Vendor({
        name: businessInfo.name || 'WhatsApp Vendor',
        businessName: businessInfo.businessName || businessInfo.name,
        phone: phoneNumber,
        category: businessInfo.category || 'food',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716], // Default location
          address: { street: businessInfo.location || 'Location via WhatsApp' }
        },
        products: businessInfo.products || [],
        onboardingSource: 'whatsapp',
        isVerified: true,
        status: 'active',
        createdVia: 'whatsapp'
      });

      await vendor.save();
      logger.info(`Vendor created via WhatsApp: ${vendor._id}`);
      
      return vendor;
    } catch (error) {
      logger.error('Error creating vendor from WhatsApp:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
    }
    this.isReady = false;
    logger.info('WhatsApp Service disconnected');
  }
}

module.exports = WhatsAppService;