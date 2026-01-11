// WhatsApp AI Service - The Brain of Vendor Onboarding
const Vendor = require('../models/Vendor');
const logger = require('../utils/logger');

class WhatsAppAI {
    constructor() {
        this.onboardingStates = new Map(); // Track vendor onboarding progress
    }

    // Main message processor - handles ALL vendor interactions
    async processVendorMessage(phone, message, messageType = 'text') {
        try {
            console.log(`📱 Processing ${messageType} from ${phone}: ${message}`);
            
            const vendorState = this.getVendorState(phone);
            
            // Check if vendor already exists
            let vendor = await Vendor.findOne({ phone });
            
            if (!vendor && this.isGreeting(message)) {
                return await this.startOnboarding(phone);
            }
            
            if (!vendor) {
                // New vendor - start onboarding
                return await this.handleOnboarding(phone, message, vendorState);
            } else {
                // Existing vendor - handle updates
                return await this.handleVendorUpdate(vendor, message);
            }
            
        } catch (error) {
            logger.error('WhatsApp AI processing error:', error);
            return this.getErrorResponse();
        }
    }

    // AI-powered product extraction from natural language
    extractProductsFromText(text) {
        const products = [];
        
        // Clean the text first
        const cleanText = text.toLowerCase().trim();
        
        // Simple AI patterns - in production, use proper NLP
        const patterns = [
            // "samsung s25 ultra ₹50,000" or "samosa ₹15"
            /([a-zA-Z][a-zA-Z\s\d]+?)\s+(?:₹|rs\.?|rupees?)\s*([\d,]+)/gi,
            // "₹50,000 samsung s25 ultra" or "₹10 samosa"
            /(?:₹|rs\.?|rupees?)\s*([\d,]+)\s+([a-zA-Z][a-zA-Z\s\d]+)/gi,
            // "samsung s25 ultra - 50,000" or "samosa: 15"
            /([a-zA-Z][a-zA-Z\s\d]+?)\s*[-:]\s*([\d,]+)/gi,
            // "samsung s25 ultra 50000" (simple format)
            /([a-zA-Z][a-zA-Z\s\d]+?)\s+([\d,]+)(?!\d)/gi
        ];
        
        patterns.forEach((pattern, index) => {
            let match;
            const textToMatch = index === 1 ? cleanText : text; // Use original case for some patterns
            
            while ((match = pattern.exec(textToMatch)) !== null) {
                let item, priceStr;
                
                if (index === 1) { // Price first patterns
                    [, priceStr, item] = match;
                } else {
                    [, item, priceStr] = match;
                }
                
                // Clean up the item name and price
                item = item.trim().replace(/[^\w\s]/g, '');
                const price = parseInt(priceStr.replace(/,/g, '')); // Remove commas from price
                
                if (item && priceStr && item.length > 1 && item.length < 40 && !this.isCommonWord(item) && price > 0 && price < 1000000) {
                    products.push({
                        name: this.capitalizeFirst(item.trim()),
                        price: price,
                        available: true,
                        category: this.inferCategory(item)
                    });
                }
            }
        });
        
        return this.deduplicateProducts(products);
    }

    // AI category inference
    inferCategory(item) {
        const foodItems = ['samosa', 'chai', 'tea', 'coffee', 'vada', 'pav', 'dosa', 'idli', 'rice', 'dal', 'curry', 'roti', 'bread', 'milk', 'lassi', 'juice'];
        const clothingItems = ['shirt', 'pant', 'saree', 'kurta', 'dress', 'jeans', 'top'];
        const electronicItems = ['mobile', 'phone', 'charger', 'headphone', 'speaker', 'watch'];
        
        const itemLower = item.toLowerCase();
        
        if (foodItems.some(food => itemLower.includes(food))) return 'food';
        if (clothingItems.some(cloth => itemLower.includes(cloth))) return 'clothing';
        if (electronicItems.some(elec => itemLower.includes(elec))) return 'electronics';
        
        return 'other';
    }

    // Onboarding flow states
    async startOnboarding(phone) {
        this.setVendorState(phone, { step: 'name', attempts: 0 });
        
        return {
            message: "🙏 Namaste! Welcome to VendorGo!\n\nI'll help you create your digital shop in 2 minutes.\n\nWhat's your name or shop name?",
            nextStep: 'name'
        };
    }

    async handleOnboarding(phone, message, state) {
        switch (state.step) {
            case 'name':
                return await this.handleNameStep(phone, message, state);
            case 'products':
                return await this.handleProductsStep(phone, message, state);
            case 'location':
                return await this.handleLocationStep(phone, message, state);
            default:
                return this.startOnboarding(phone);
        }
    }

    async handleNameStep(phone, message, state) {
        const name = this.extractName(message);
        
        if (!name) {
            state.attempts++;
            if (state.attempts > 2) {
                return this.getErrorResponse();
            }
            return {
                message: "Please tell me your name or shop name. For example: 'Raj' or 'Raj Tea Stall'",
                nextStep: 'name'
            };
        }
        
        this.setVendorState(phone, { 
            step: 'products', 
            name: name,
            attempts: 0 
        });
        
        return {
            message: `Great ${name}! 👍\n\nNow tell me what you sell and the prices.\n\nFor example:\n"Samosa 10 rupees, Chai 5 rupees, Vada Pav 15 rupees"\n\nJust speak naturally!`,
            nextStep: 'products'
        };
    }

    async handleProductsStep(phone, message, state) {
        const products = this.extractProductsFromText(message);
        
        if (products.length === 0) {
            state.attempts++;
            if (state.attempts > 2) {
                // Create with basic info, products can be added later
                return await this.createVendorProfile(phone, state, []);
            }
            return {
                message: "I couldn't understand your products. Try like this:\n\n'Tea 5 rupees, Samosa 10 rupees'\n\nOr just tell me one item with price.",
                nextStep: 'products'
            };
        }
        
        this.setVendorState(phone, { 
            ...state,
            step: 'location', 
            products: products,
            attempts: 0 
        });
        
        const productList = products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
        
        return {
            message: `Perfect! I found these items:\n\n${productList}\n\n📍 Now share your location so customers can find you.\n\nTap the 📎 button → Location → Send Current Location`,
            nextStep: 'location'
        };
    }

    async handleLocationStep(phone, message, state) {
        // In real implementation, extract coordinates from WhatsApp location message
        // For demo, we'll use a default location
        
        const location = this.extractLocation(message) || {
            type: 'Point',
            coordinates: [77.5946, 12.9716], // Default: Bangalore
            address: { street: message || 'Location provided via WhatsApp' }
        };
        
        return await this.createVendorProfile(phone, state, state.products, location);
    }

    async createVendorProfile(phone, state, products, location) {
        try {
            const vendor = new Vendor({
                name: state.name,
                businessName: state.name,
                phone: phone,
                products: products,
                location: location,
                category: products.length > 0 ? products[0].category : 'other',
                isVerified: true,
                status: 'active',
                onboardingSource: 'whatsapp',
                createdVia: 'whatsapp',
                isCurrentlyOpen: true,
                digitalPresence: {
                    hasOnlinePresence: true,
                    whatsappEnabled: true,
                    autoGenerated: true
                }
            });
            
            await vendor.save();
            
            // Clear onboarding state
            this.clearVendorState(phone);
            
            const storeUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/store/${vendor._id}`;
            
            return {
                message: `🎉 Congratulations ${state.name}!\n\nYour digital shop is LIVE!\n\n🔗 Your store: ${storeUrl}\n\n✅ Customers can now:\n• Find you online\n• See your products\n• Order & pay instantly\n\nTo update:\n• "Add item name price"\n• "Change price to X"\n• "Closed today"\n\nYour digital presence is ready! 🚀`,
                vendorId: vendor._id,
                storeUrl: storeUrl,
                completed: true
            };
            
        } catch (error) {
            logger.error('Error creating vendor profile:', error);
            return this.getErrorResponse();
        }
    }

    // Handle updates from existing vendors
    async handleVendorUpdate(vendor, message) {
        const updateType = this.detectUpdateType(message);
        
        switch (updateType) {
            case 'add_product':
                return await this.handleAddProduct(vendor, message);
            case 'update_price':
                return await this.handleUpdatePrice(vendor, message);
            case 'status_change':
                return await this.handleStatusChange(vendor, message);
            default:
                return {
                    message: `Hi ${vendor.name}! 👋\n\nI can help you:\n• Add items: "Add samosa 10 rupees"\n• Change price: "Samosa now 12 rupees"\n• Update status: "Closed today" or "Open now"\n\nWhat would you like to do?`
                };
        }
    }

    async handleAddProduct(vendor, message) {
        const products = this.extractProductsFromText(message);
        
        if (products.length === 0) {
            return {
                message: "Please tell me the item and price. Example: 'Add samosa 10 rupees'"
            };
        }
        
        // Add new products
        vendor.products.push(...products);
        await vendor.save();
        
        const addedItems = products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
        
        return {
            message: `✅ Added to your shop:\n\n${addedItems}\n\nCustomers can see these items now!`
        };
    }

    // Utility methods
    isGreeting(message) {
        const greetings = ['hi', 'hello', 'namaste', 'hey', 'start', 'begin'];
        return greetings.some(greeting => 
            message.toLowerCase().includes(greeting)
        );
    }

    extractName(message) {
        // Simple name extraction - in production, use proper NLP
        const cleaned = message.trim().replace(/[^\w\s]/g, '');
        if (cleaned.length > 2 && cleaned.length < 50) {
            return this.capitalizeFirst(cleaned);
        }
        return null;
    }

    detectUpdateType(message) {
        const msg = message.toLowerCase();
        
        if (msg.includes('add') || msg.includes('new')) return 'add_product';
        if (msg.includes('price') || msg.includes('cost')) return 'update_price';
        if (msg.includes('closed') || msg.includes('open')) return 'status_change';
        
        return 'general';
    }

    // State management
    getVendorState(phone) {
        return this.onboardingStates.get(phone) || { step: 'start', attempts: 0 };
    }

    setVendorState(phone, state) {
        this.onboardingStates.set(phone, state);
    }

    clearVendorState(phone) {
        this.onboardingStates.delete(phone);
    }

    // Helper methods
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    isCommonWord(word) {
        const common = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their', 'sell', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'ultra', 'plus', 'done', 'want', 'need', 'like', 'get', 'got', 'make', 'made'];
        return common.includes(word.toLowerCase()) || word.length < 2;
    }

    deduplicateProducts(products) {
        const seen = new Set();
        return products.filter(product => {
            const key = product.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    extractLocation(message) {
        // In real implementation, parse WhatsApp location data
        // For demo, return null to use default
        return null;
    }

    getErrorResponse() {
        return {
            message: "Sorry, I couldn't understand. Please try again or type 'help' for assistance."
        };
    }
}

module.exports = new WhatsAppAI();