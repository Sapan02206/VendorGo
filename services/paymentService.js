// Frictionless Payment Service - UPI Integration
const logger = require('../utils/logger');

class PaymentService {
    constructor() {
        this.upiProviders = {
            'paytm': 'paytm',
            'phonepe': 'phonepe',
            'googlepay': 'tez',
            'bhim': 'bhimupi'
        };
    }

    // Generate UPI payment link for one-tap payments
    generateUPIPaymentLink(orderData) {
        try {
            const {
                vendorUPIId,
                amount,
                vendorName,
                orderNumber,
                customerPhone
            } = orderData;

            // Use vendor's UPI ID or default demo UPI ID
            const upiId = vendorUPIId || 'vendor@paytm';
            
            // Create transaction note
            const transactionNote = `Order ${orderNumber} from ${vendorName}`;
            
            // Generate UPI payment URL
            const upiParams = new URLSearchParams({
                pa: upiId,                    // Payee address (UPI ID)
                am: amount.toString(),        // Amount
                tn: transactionNote,          // Transaction note
                cu: 'INR',                   // Currency
                mc: '5411',                  // Merchant category code (grocery stores)
                tr: orderNumber              // Transaction reference
            });

            const upiLink = `upi://pay?${upiParams.toString()}`;
            
            logger.info(`Generated UPI link for order ${orderNumber}: ${amount} to ${upiId}`);
            
            return {
                upiLink,
                qrCodeData: upiLink,
                paymentDetails: {
                    payeeUPI: upiId,
                    amount: amount,
                    currency: 'INR',
                    note: transactionNote,
                    reference: orderNumber
                }
            };
            
        } catch (error) {
            logger.error('UPI link generation error:', error);
            throw new Error('Failed to generate payment link');
        }
    }

    // Generate multiple UPI app links for better compatibility
    generateMultipleUPILinks(orderData) {
        const baseLink = this.generateUPIPaymentLink(orderData);
        const { paymentDetails } = baseLink;
        
        const appLinks = {
            // Generic UPI link (works with all UPI apps)
            generic: baseLink.upiLink,
            
            // Specific app deep links
            paytm: `paytmmp://pay?pa=${paymentDetails.payeeUPI}&am=${paymentDetails.amount}&tn=${encodeURIComponent(paymentDetails.note)}&cu=INR`,
            phonepe: `phonepe://pay?pa=${paymentDetails.payeeUPI}&am=${paymentDetails.amount}&tn=${encodeURIComponent(paymentDetails.note)}&cu=INR`,
            googlepay: `tez://upi/pay?pa=${paymentDetails.payeeUPI}&am=${paymentDetails.amount}&tn=${encodeURIComponent(paymentDetails.note)}&cu=INR`,
            bhim: `bhim://pay?pa=${paymentDetails.payeeUPI}&am=${paymentDetails.amount}&tn=${encodeURIComponent(paymentDetails.note)}&cu=INR`
        };
        
        return {
            ...baseLink,
            appLinks
        };
    }

    // Verify payment status (simplified for demo)
    async verifyPayment(transactionId, orderNumber) {
        try {
            // In production, integrate with payment gateway API
            // For demo, simulate payment verification
            
            logger.info(`Verifying payment ${transactionId} for order ${orderNumber}`);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo, randomly simulate success/failure
            const isSuccess = Math.random() > 0.1; // 90% success rate
            
            if (isSuccess) {
                return {
                    status: 'success',
                    transactionId,
                    amount: 0, // Would be actual amount from payment gateway
                    timestamp: new Date().toISOString(),
                    paymentMethod: 'UPI',
                    gatewayResponse: {
                        code: '00',
                        message: 'Transaction successful'
                    }
                };
            } else {
                return {
                    status: 'failed',
                    transactionId,
                    timestamp: new Date().toISOString(),
                    error: 'Payment failed',
                    gatewayResponse: {
                        code: '01',
                        message: 'Transaction failed'
                    }
                };
            }
            
        } catch (error) {
            logger.error('Payment verification error:', error);
            return {
                status: 'error',
                transactionId,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    // Generate QR code data for offline payments
    generateQRCode(orderData) {
        const upiData = this.generateUPIPaymentLink(orderData);
        
        // QR code contains the same UPI payment string
        return {
            qrData: upiData.upiLink,
            format: 'UPI_QR',
            size: '300x300',
            instructions: [
                'Open any UPI app (Paytm, PhonePe, Google Pay, etc.)',
                'Scan this QR code',
                'Verify payment details',
                'Enter your UPI PIN',
                'Payment complete!'
            ]
        };
    }

    // Handle payment callback/webhook
    async handlePaymentCallback(callbackData) {
        try {
            const {
                transactionId,
                orderNumber,
                status,
                amount,
                signature
            } = callbackData;
            
            // Verify signature (in production)
            // const isValidSignature = this.verifySignature(callbackData);
            
            logger.info(`Payment callback received for order ${orderNumber}: ${status}`);
            
            // Update order status based on payment result
            const Order = require('../models/Order');
            const order = await Order.findOne({ orderNumber });
            
            if (order) {
                order.payment.status = status === 'success' ? 'completed' : 'failed';
                order.payment.transactionId = transactionId;
                order.payment.completedAt = new Date();
                
                if (status === 'success') {
                    order.status = 'confirmed';
                } else {
                    order.status = 'payment_failed';
                }
                
                await order.save();
                
                // Send notifications
                await this.sendPaymentNotifications(order, status);
            }
            
            return {
                success: true,
                orderNumber,
                status
            };
            
        } catch (error) {
            logger.error('Payment callback handling error:', error);
            throw error;
        }
    }

    // Send payment notifications
    async sendPaymentNotifications(order, paymentStatus) {
        try {
            const WhatsAppService = require('./whatsappService');
            const whatsappService = new WhatsAppService();
            
            if (paymentStatus === 'success') {
                // Notify vendor
                await whatsappService.sendMessage(order.vendor.phone, 
                    `💰 Payment received!\n\nOrder #${order.orderNumber}\nAmount: ₹${order.total}\nCustomer: ${order.customerInfo.name}\n\nPlease start preparing the order.`
                );
                
                // Notify customer (if phone provided)
                if (order.customerInfo.phone) {
                    await whatsappService.sendMessage(order.customerInfo.phone,
                        `✅ Payment successful!\n\nOrder #${order.orderNumber}\nAmount: ₹${order.total}\nVendor: ${order.vendor.name}\n\nYour order is confirmed!`
                    );
                }
            } else {
                // Notify customer of payment failure
                if (order.customerInfo.phone) {
                    await whatsappService.sendMessage(order.customerInfo.phone,
                        `❌ Payment failed for order #${order.orderNumber}\n\nPlease try again or contact the vendor directly.`
                    );
                }
            }
            
        } catch (error) {
            logger.error('Payment notification error:', error);
            // Don't throw error - notifications are not critical
        }
    }

    // Get supported payment methods for a vendor
    getSupportedPaymentMethods(vendor) {
        const methods = [];
        
        // UPI is always supported
        methods.push({
            type: 'upi',
            name: 'UPI Payment',
            description: 'Pay using any UPI app',
            icon: '📱',
            enabled: true,
            processingFee: 0
        });
        
        // Cash on delivery
        if (vendor.paymentMethods?.cash) {
            methods.push({
                type: 'cash',
                name: 'Cash on Delivery',
                description: 'Pay when you receive',
                icon: '💵',
                enabled: true,
                processingFee: 0
            });
        }
        
        // Cards (if enabled)
        if (vendor.paymentMethods?.cards) {
            methods.push({
                type: 'card',
                name: 'Credit/Debit Card',
                description: 'Pay using your card',
                icon: '💳',
                enabled: true,
                processingFee: 2 // 2% processing fee
            });
        }
        
        return methods;
    }

    // Calculate total amount including fees
    calculateTotalWithFees(subtotal, paymentMethod, vendor) {
        let total = subtotal;
        
        const methods = this.getSupportedPaymentMethods(vendor);
        const method = methods.find(m => m.type === paymentMethod);
        
        if (method && method.processingFee > 0) {
            const fee = (subtotal * method.processingFee) / 100;
            total = subtotal + fee;
        }
        
        return {
            subtotal,
            processingFee: total - subtotal,
            total: Math.round(total * 100) / 100 // Round to 2 decimal places
        };
    }
}

module.exports = PaymentService;