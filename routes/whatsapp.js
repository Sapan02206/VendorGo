// WhatsApp Integration Routes - Vendor Onboarding Interface
const express = require('express');
const router = express.Router();
const { VendorDigitalTwin } = require('../services/digitalTwin');
const WhatsAppService = require('../services/whatsappService');
const logger = require('../utils/logger');

// WhatsApp Webhook - Receives messages from vendors
router.post('/webhook', async (req, res) => {
    try {
        console.log('📱 WhatsApp webhook received:', JSON.stringify(req.body, null, 2));
        
        // For demo purposes, we'll simulate WhatsApp webhook format
        const { phone, message, messageType = 'text', mediaData } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message required' });
        }
        
        // Process message through Digital Twin
        const digitalTwin = new VendorDigitalTwin();
        const result = await digitalTwin.processVendorInput(phone, message, messageType, mediaData);
        
        // Send response back to WhatsApp (in production)
        const whatsappService = new WhatsAppService();
        if (whatsappService.isClientReady()) {
            await whatsappService.sendMessage(phone, result.response);
        }
        
        res.json({
            success: true,
            response: result.response,
            vendor: {
                id: result.vendor._id,
                name: result.vendor.name,
                storeUrl: `${req.protocol}://${req.get('host')}/store/${result.vendor._id}`
            },
            timestamp: new Date().toISOString()
        });
        
        logger.info(`WhatsApp response sent to ${phone}:`, result.response);
        
    } catch (error) {
        logger.error('WhatsApp webhook error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: "Sorry, I couldn't process your message right now. Please try again."
        });
    }
});

// Demo endpoint - Simulate vendor sending message
router.post('/demo/send', async (req, res) => {
    try {
        const { phone, message, messageType = 'text', mediaData } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message required' });
        }
        
        console.log(`📱 DEMO: Vendor ${phone} says: "${message}"`);
        
        // Process through Digital Twin
        const digitalTwin = new VendorDigitalTwin();
        const result = await digitalTwin.processVendorInput(phone, message, messageType, mediaData);
        
        res.json({
            success: true,
            vendor: { phone },
            input: { message, messageType },
            aiResponse: {
                message: result.response,
                vendorId: result.vendor._id,
                storeUrl: `${req.protocol}://${req.get('host')}/store/${result.vendor._id}`,
                completed: result.vendor.products && result.vendor.products.length > 0
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Demo send error:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            message: "Sorry, I couldn't understand that. Please try again."
        });
    }
});

// Customer query endpoint - AI agent responds to customer questions
router.post('/customer-query', async (req, res) => {
    try {
        const { vendorId, query, customerContext } = req.body;
        
        if (!vendorId || !query) {
            return res.status(400).json({ error: 'Vendor ID and query required' });
        }
        
        const digitalTwin = new VendorDigitalTwin(vendorId);
        const response = await digitalTwin.handleCustomerQuery(vendorId, query, customerContext);
        
        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Customer query error:', error);
        res.status(500).json({ 
            error: 'Failed to process query',
            response: "Sorry, I couldn't process your question right now."
        });
    }
});

// Get vendor onboarding status
router.get('/status/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const Vendor = require('../models/Vendor');
        
        const vendor = await Vendor.findOne({ phone });
        
        if (vendor) {
            res.json({
                onboarded: true,
                vendor: {
                    id: vendor._id,
                    name: vendor.name,
                    products: vendor.products.length,
                    storeUrl: `${req.protocol}://${req.get('host')}/store/${vendor._id}`,
                    isOpen: vendor.isCurrentlyOpen
                }
            });
        } else {
            res.json({
                onboarded: false,
                message: 'Vendor not found. Send "Hi" to start onboarding.'
            });
        }
        
    } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// WhatsApp verification (for production webhook setup)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Verify webhook (use your own verify token)
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('✅ WhatsApp webhook verified');
        res.status(200).send(challenge);
    } else {
        console.log('❌ WhatsApp webhook verification failed');
        res.sendStatus(403);
    }
});

module.exports = router;