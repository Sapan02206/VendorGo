// Implicit Vendor Identity Service
// Identity is channel-based: WhatsApp phone number = Vendor ID
const crypto = require('crypto');
const Vendor = require('../models/Vendor');
const logger = require('../utils/logger');

class VendorIdentityService {
    // Generate deterministic vendor ID from phone number
    static generateVendorId(phoneNumber) {
        const secret = process.env.VENDOR_ID_SECRET || 'vendorgo-secret-key-2024';
        const normalizedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
        
        return crypto
            .createHmac('sha256', secret)
            .update(normalizedPhone)
            .digest('hex')
            .substring(0, 24); // MongoDB ObjectId compatible length
    }

    // Get or create vendor by phone (implicit authentication)
    static async getOrCreateVendor(phoneNumber) {
        try {
            const normalizedPhone = phoneNumber.replace(/\D/g, '');
            
            // Find existing vendor by phone
            let vendor = await Vendor.findOne({ phone: normalizedPhone });
            
            if (vendor) {
                logger.info(`Vendor authenticated via WhatsApp: ${normalizedPhone}`);
                return vendor;
            }
            
            // Vendor doesn't exist - will be created during onboarding
            logger.info(`New vendor detected: ${normalizedPhone}`);
            return null;
            
        } catch (error) {
            logger.error('Vendor identity error:', error);
            throw error;
        }
    }

    // Verify vendor owns this phone number (for API calls)
    static async verifyVendorPhone(vendorId, phoneNumber) {
        try {
            const normalizedPhone = phoneNumber.replace(/\D/g, '');
            const vendor = await Vendor.findById(vendorId);
            
            if (!vendor) {
                return false;
            }
            
            return vendor.phone === normalizedPhone;
            
        } catch (error) {
            logger.error('Vendor verification error:', error);
            return false;
        }
    }

    // Get vendor by phone (no password required)
    static async getVendorByPhone(phoneNumber) {
        try {
            const normalizedPhone = phoneNumber.replace(/\D/g, '');
            return await Vendor.findOne({ phone: normalizedPhone });
        } catch (error) {
            logger.error('Get vendor error:', error);
            return null;
        }
    }
}

module.exports = VendorIdentityService;
