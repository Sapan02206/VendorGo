// WhatsApp Bot Integration for Vendor Onboarding
// This simulates WhatsApp bot functionality for the demo

// Import Intelligent AI
const IntelligentAI = typeof require !== 'undefined' ? require('./services/intelligentAI.js') : null;

class WhatsAppBot {
    constructor() {
        this.conversations = new Map();
        this.vendorStates = new Map();
        this.aiEngine = new AIVendorEngine();
        this.intelligentAI = IntelligentAI ? new IntelligentAI() : new IntelligentAIFallback();
    }

    // Simulate receiving WhatsApp message
    async receiveMessage(phoneNumber, message, messageType = 'text', mediaData = null) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        // Add message to conversation
        conversation.messages.push({
            timestamp: new Date().toISOString(),
            from: 'vendor',
            type: messageType,
            content: message,
            mediaData: mediaData
        });

        // Process message and generate response
        const response = await this.processMessage(phoneNumber, message, messageType, mediaData);
        
        // Add bot response to conversation
        conversation.messages.push({
            timestamp: new Date().toISOString(),
            from: 'bot',
            type: 'text',
            content: response
        });

        return response;
    }

    getOrCreateConversation(phoneNumber) {
        if (!this.conversations.has(phoneNumber)) {
            this.conversations.set(phoneNumber, {
                phoneNumber: phoneNumber,
                messages: [],
                vendorProfile: null,
                onboardingStep: 'welcome'
            });
        }
        return this.conversations.get(phoneNumber);
    }

    async processMessage(phoneNumber, message, messageType, mediaData) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        const step = conversation.onboardingStep;

        // Only check for AI help if:
        // 1. It's clearly a question (starts with how/what/why etc.)
        // 2. OR it's a problem report (contains "not working", "error", etc.)
        // 3. AND it's not during critical onboarding steps
        const criticalSteps = ['collect_name', 'collect_business_type', 'collect_location', 'confirm_profile', 'change_name'];
        const shouldCheckAI = !criticalSteps.includes(step) && this.isQuestionOrHelpRequest(message) && !this.isCommand(message);
        
        if (shouldCheckAI) {
            return this.handleIntelligentQuery(phoneNumber, message);
        }

        switch (step) {
            case 'welcome':
                return await this.handleWelcome(phoneNumber, message);
            
            case 'collect_name':
                return this.handleNameCollection(phoneNumber, message);
            
            case 'collect_business_type':
                return this.handleBusinessTypeCollection(phoneNumber, message);
            
            case 'collect_location':
                return this.handleLocationCollection(phoneNumber, message);
            
            case 'collect_products':
                return this.handleProductCollection(phoneNumber, message, messageType, mediaData);
            
            case 'confirm_profile':
                return this.handleProfileConfirmation(phoneNumber, message);
            
            case 'change_name':
                return this.handleOngoingSupport(phoneNumber, message, messageType, mediaData);
            
            case 'completed':
                return this.handleOngoingSupport(phoneNumber, message, messageType, mediaData);
            
            default:
                return "I didn't understand that. Type 'help' for assistance.";
        }
    }

    // Check if message is a question or help request
    isQuestionOrHelpRequest(message) {
        const msg = message.toLowerCase().trim();
        
        // Exclude specific commands that should NOT trigger AI
        const excludedCommands = [
            'done', 'finish', 'complete', 'yes', 'no', 'start', 'cancel',
            'show products', 'list products', 'my products',
            'delete shop', 'close shop', 'remove shop',
            'check status', 'diagnose', 'check shop'
        ];
        
        // If it's a command, don't treat as question
        if (excludedCommands.some(cmd => msg === cmd || msg.startsWith(cmd))) {
            return false;
        }
        
        // If it's a product format (has price), don't treat as question
        if (msg.match(/₹|rs\.?\s*\d|rupees?\s*\d/i)) {
            return false;
        }
        
        // If it's a delete command, don't treat as question
        if (msg.startsWith('delete ') && !msg.includes('?')) {
            return false;
        }
        
        // Question indicators
        const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'can', 'do', 'does', 'is', 'are', 'will', 'would', 'could', 'should'];
        const startsWithQuestion = questionWords.some(word => msg.startsWith(word + ' '));
        
        // Help indicators
        const helpWords = ['help', 'assist', 'support', 'explain', 'tell me', 'show me', 'guide'];
        const containsHelp = helpWords.some(word => msg.includes(word));
        
        // Problem indicators (but not during onboarding)
        const problemWords = ['problem', 'issue', 'error', 'not working', 'doesn\'t work', 'can\'t', 'unable', 'not showing', 'not appearing'];
        const hasProblem = problemWords.some(word => msg.includes(word));
        
        // Question marks
        const hasQuestionMark = msg.includes('?');
        
        return startsWithQuestion || containsHelp || hasProblem || hasQuestionMark;
    }

    // Check if message is a command (not a question)
    isCommand(message) {
        const msg = message.toLowerCase().trim();
        
        const commands = [
            'show products', 'list products', 'my products',
            'delete shop', 'close shop', 'remove shop',
            'check status', 'diagnose', 'check shop',
            'change name', 'rename shop', 'edit name',
            'orders', 'help', 'start', 'done', 'yes', 'no', 'cancel'
        ];
        
        // Check if it's a command
        if (commands.some(cmd => msg === cmd || msg.startsWith(cmd))) {
            return true;
        }
        
        // Check if it's a delete product command
        if (msg.startsWith('delete ') && !msg.includes('?')) {
            return true;
        }
        
        // Check if it's adding products (has price)
        if (msg.match(/₹|rs\.?\s*\d|rupees?\s*\d/i)) {
            return true;
        }
        
        return false;
    }

    // Handle intelligent queries using AI
    handleIntelligentQuery(phoneNumber, message) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        // Build context for AI
        const context = {
            hasShop: conversation.onboardingStep === 'completed',
            products: conversation.vendorProfile?.products || [],
            location: conversation.vendorProfile?.location || null,
            vendorId: conversation.realVendorId || null,
            vendorName: conversation.vendorProfile?.name || null,
            phone: phoneNumber,
            upiId: conversation.vendorProfile?.phone ? conversation.vendorProfile.phone.replace(/\D/g, '') + '@paytm' : null,
            isOpen: true,
            status: 'active',
            onboardingStep: conversation.onboardingStep
        };
        
        // Analyze intent
        const intent = this.intelligentAI.analyzeIntent(message, context);
        
        // Generate response
        const response = this.intelligentAI.generateResponse(intent, message, context);
        
        return response;
    }

    async handleWelcome(phoneNumber, message) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        if (message.toLowerCase().includes('start') || message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
            // First, check if this phone number already has a shop
            const normalizedPhone = phoneNumber.replace(/\D/g, '');
            
            try {
                // Check database for existing vendor
                const response = await fetch(`/api/vendors?phone=${normalizedPhone}`);
                const data = await response.json();
                
                if (data.vendors && data.vendors.length > 0) {
                    // Vendor exists! Skip onboarding
                    const existingVendor = data.vendors[0];
                    console.log('✅ Existing vendor found:', existingVendor._id);
                    
                    // Store vendor info
                    conversation.realVendorId = existingVendor._id;
                    conversation.vendorProfile = {
                        name: existingVendor.name,
                        phone: phoneNumber,
                        category: existingVendor.category,
                        location: existingVendor.location?.address?.street || 'Set',
                        products: existingVendor.products || [],
                        realVendorId: existingVendor._id
                    };
                    conversation.onboardingStep = 'completed';
                    
                    // Show welcome back message
                    return `👋 Welcome back, ${existingVendor.name}!

✅ Your shop is already active!

📊 **Shop Status:**
• Name: ${existingVendor.name}
• Products: ${existingVendor.products?.length || 0}
• Status: ${existingVendor.isCurrentlyOpen ? '🟢 OPEN' : '🔴 CLOSED'}
• Location: ${existingVendor.location?.address?.street || 'Set'}

💡 **What you can do:**
• "change name" - Change shop name
• "show products" - View all products
• "Samosa ₹15" - Add new product
• "delete [product]" - Remove product
• "delete shop" - Remove entire shop
• Ask any question - AI will help!

🛒 **Customer App:** http://localhost:3000/

How can I help you today?`;
                } else {
                    // New vendor - start onboarding
                    console.log('🆕 New vendor, starting onboarding');
                    conversation.onboardingStep = 'collect_name';
                    
                    return `🎉 Welcome to VendorGo! 

I'll help you create your digital storefront in just 2 minutes.

First, what's your name or business name?`;
                }
            } catch (error) {
                console.error('Error checking existing vendor:', error);
                // If check fails, proceed with onboarding
                conversation.onboardingStep = 'collect_name';
                
                return `🎉 Welcome to VendorGo! 

I'll help you create your digital storefront in just 2 minutes.

First, what's your name or business name?`;
            }
        }
        
        return `👋 Hello! I'm your VendorGo assistant. 

I help street vendors and small businesses get online presence.

Type "start" to begin creating your digital store!`;
    }

    // Helper method to send bot message (for async responses)
    sendBotMessage(phoneNumber, message) {
        // This would be implemented in the UI layer
        // For now, we'll just log it
        console.log(`Bot message for ${phoneNumber}:`, message);
    }

    handleNameCollection(phoneNumber, message) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        if (message.trim().length < 2) {
            return "Please enter a valid name for your business.";
        }

        if (!conversation.vendorProfile) {
            conversation.vendorProfile = {};
        }
        
        conversation.vendorProfile.name = message.trim();
        conversation.onboardingStep = 'collect_business_type';
        
        return `Great! Nice to meet you, ${message.trim()}! 👋

What type of business do you run? 

Reply with:
1️⃣ Food & Beverages
2️⃣ Clothing & Fashion  
3️⃣ Electronics & Gadgets
4️⃣ Accessories & Others

Just type the number or category name.`;
    }

    handleBusinessTypeCollection(phoneNumber, message) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        const msg = message.toLowerCase().trim();
        
        let category = '';
        if (msg.includes('1') || msg.includes('food') || msg.includes('beverage')) {
            category = 'food';
        } else if (msg.includes('2') || msg.includes('cloth') || msg.includes('fashion')) {
            category = 'clothing';
        } else if (msg.includes('3') || msg.includes('electronic') || msg.includes('gadget')) {
            category = 'electronics';
        } else if (msg.includes('4') || msg.includes('accessor') || msg.includes('other')) {
            category = 'accessories';
        } else {
            return `Please select a valid category:

1️⃣ Food & Beverages
2️⃣ Clothing & Fashion  
3️⃣ Electronics & Gadgets
4️⃣ Accessories & Others`;
        }

        conversation.vendorProfile.category = category;
        conversation.onboardingStep = 'collect_location';
        
        return `Perfect! ${this.getCategoryName(category)} business it is! 🏪

Now, where is your business located? 

Please share your location or describe where customers can find you.

Example: "Near City Mall, MG Road" or "Street 5, Sector 12"`;
    }

    handleLocationCollection(phoneNumber, message) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        if (message.trim().length < 5) {
            return "Please provide a more detailed location so customers can find you easily.";
        }

        conversation.vendorProfile.location = message.trim();
        conversation.vendorProfile.phone = phoneNumber;
        conversation.onboardingStep = 'collect_products';
        
        return `Excellent! Location saved: ${message.trim()} 📍

Now let's add your products! This is the exciting part! 🛍️

You can:
📝 Type your products (e.g., "Samosa ₹10, Tea ₹5, Sandwich ₹25")
📸 Send photos of your products
🎤 Send voice message describing what you sell

What would you like to do?`;
    }

    handleProductCollection(phoneNumber, message, messageType, mediaData) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        if (!conversation.vendorProfile.products) {
            conversation.vendorProfile.products = [];
        }

        // Check for completion keywords first
        if (messageType === 'text' && 
            (message.toLowerCase().includes('done') || 
             message.toLowerCase().includes('finish') || 
             message.toLowerCase().includes('complete'))) {
            
            if (conversation.vendorProfile.products.length === 0) {
                return `You haven't added any products yet! 

Please add at least one product first:

**Formats:**
• Single: "Samosa ₹10"
• Multiple: "Samosa ₹10, Tea Rs 5, Coffee ₹15"

**Supported:**
• ₹ symbol
• Rs or rs
• Rupees or rupees`;
            }
            
            conversation.onboardingStep = 'confirm_profile';
            return this.generateProfileSummary(conversation.vendorProfile);
        }

        if (messageType === 'text') {
            // Parse text for products
            const products = this.aiEngine.extractProductsFromText(message);
            
            if (products.length > 0) {
                conversation.vendorProfile.products.push(...products);
                const productList = products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
                
                const countMsg = products.length > 1 ? `${products.length} products` : 'this product';
                
                return `Great! I found ${countMsg}: 📦

${productList}

Want to add more? 
• Type more products
• Send photos
• Type "done" when finished

**Tip:** Add multiple at once:
"Item1 ₹10, Item2 Rs 20, Item3 ₹30"`;
            } else {
                return `❌ I couldn't find product information in that format.

📝 **Please use one of these:**

**Single Product:**
• "Samosa ₹15"
• "Tea Rs 10"
• "Coffee rupees 20"

**Multiple Products (comma-separated):**
• "Samosa ₹15, Tea Rs 10"
• "Burger Rs 50, Fries ₹30, Coke ₹25"

**Examples:**
✅ "Masala Dosa ₹40"
✅ "Idli Rs 30, Vada ₹35"
✅ "iPhone 15 ₹80000, Samsung S24 Rs 75000"

Try again!`;
            }
        } else if (messageType === 'image') {
            // Simulate AI image processing
            const products = this.aiEngine.extractProductsFromImage(mediaData);
            conversation.vendorProfile.products.push(...products);
            
            const productList = products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
            return `Amazing photo! 📸 I can see these products:

${productList}

Send more photos or type "done" when you've added all products.`;
        } else if (messageType === 'voice') {
            // Simulate voice processing
            const products = this.aiEngine.extractProductsFromVoice(message);
            conversation.vendorProfile.products.push(...products);
            
            const productList = products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
            return `Got it from your voice message! 🎤

${productList}

Add more products or type "done" to finish.`;
        }

        return "Send more products, photos, or type 'done' when finished!";
    }

    handleProfileConfirmation(phoneNumber, message) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        const msg = message.toLowerCase().trim();
        
        if (msg.includes('yes') || msg.includes('confirm') || msg.includes('correct')) {
            // Check if vendor already exists first
            this.checkAndCreateVendor(conversation.vendorProfile);
            conversation.onboardingStep = 'completed';
            
            const storeUrl = `https://vendorgo.app/store/${this.generateStoreId(phoneNumber)}`;
            
            return `🎉 CONGRATULATIONS! Your digital store is LIVE! 

🌐 Your Store Link: ${storeUrl}

✅ What you now have:
• Digital storefront visible to customers
• Google Maps presence  
• Online ordering system
• Payment integration
• Customer reviews system

📈 Start sharing your link with customers!

🛒 Customer App: http://localhost:3000/

Need help? Just message me anytime! 💬`;
        } else if (msg.includes('no') || msg.includes('change') || msg.includes('edit')) {
            conversation.onboardingStep = 'collect_products';
            return `No problem! Let's update your products. 

Send me the correct product information:`;
        }
        
        return `Please reply with "Yes" to confirm or "No" to make changes.`;
    }

    // Check if vendor exists, if yes load it, if no create it
    checkAndCreateVendor(profile) {
        const normalizedPhone = profile.phone.replace(/\D/g, '');
        
        // First check if vendor exists
        fetch(`/api/vendors?phone=${normalizedPhone}`)
            .then(response => response.json())
            .then(data => {
                if (data.vendors && data.vendors.length > 0) {
                    // Vendor exists! Load existing vendor
                    const existingVendor = data.vendors[0];
                    console.log('✅ Vendor already exists:', existingVendor._id);
                    
                    // Store vendor ID
                    const conversation = this.conversations.get(profile.phone);
                    if (conversation) {
                        conversation.realVendorId = existingVendor._id;
                        conversation.vendorProfile.realVendorId = existingVendor._id;
                    }
                    
                    // Update products if new ones were added
                    if (profile.products && profile.products.length > 0) {
                        this.updateVendorProducts(existingVendor._id, profile.products);
                    }
                    
                    alert(`✅ Welcome back!\n\nYour shop already exists.\nVendor ID: ${existingVendor._id}\nName: ${existingVendor.name}\n\nYour products have been updated!\n\nRefresh the Customer PWA to see your store.`);
                } else {
                    // Vendor doesn't exist, create new one
                    this.createVendorProfile(profile);
                }
            })
            .catch(error => {
                console.error('Error checking vendor:', error);
                // If check fails, try to create anyway
                this.createVendorProfile(profile);
            });
    }

    // Update existing vendor's products
    updateVendorProducts(vendorId, products) {
        const productData = products.map(p => ({
            name: p.name,
            price: p.price,
            description: p.description || p.name,
            available: true
        }));

        fetch(`/api/vendors/${vendorId}/products/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: productData })
        })
        .then(response => response.json())
        .then(result => {
            console.log('✅ Updated existing vendor products:', result);
        })
        .catch(error => {
            console.error('❌ Failed to update vendor products:', error);
        });
    }

    handleOngoingSupport(phoneNumber, message, messageType, mediaData) {
        const msg = message.toLowerCase();
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        // ONLY check for AI help if it's clearly a question or problem
        // Don't intercept normal commands
        if (this.isQuestionOrHelpRequest(message) && !this.isCommand(message)) {
            return this.handleIntelligentQuery(phoneNumber, message);
        }
        
        // Change shop name
        if (msg.includes('change name') || msg.includes('rename shop') || msg.includes('edit name')) {
            conversation.onboardingStep = 'change_name';
            return `✏️ **Change Shop Name**

Current name: ${conversation.vendorProfile?.name || 'Not set'}

What would you like to rename your shop to?

Type the new name or "cancel" to keep current name.`;
        }
        
        // Handle name change input
        if (conversation.onboardingStep === 'change_name') {
            if (msg === 'cancel') {
                conversation.onboardingStep = 'completed';
                return `❌ Name change cancelled.

Your shop name remains: ${conversation.vendorProfile?.name}

Type "help" for more options.`;
            }
            
            const newName = message.trim();
            
            if (newName.length < 2) {
                return `❌ Name too short. Please enter a valid shop name (at least 2 characters).`;
            }
            
            const oldName = conversation.vendorProfile?.name || 'Unknown';
            conversation.vendorProfile.name = newName;
            
            // Update in database if vendor exists
            if (conversation.realVendorId) {
                this.updateVendorName(conversation.realVendorId, newName);
            }
            
            conversation.onboardingStep = 'completed';
            
            return `✅ **Shop Name Updated!**

Old name: ${oldName}
New name: ${newName}

Your shop name has been changed successfully!

Type "help" for more options.`;
        }
        
        // Delete entire shop
        if (msg.includes('delete shop') || msg.includes('close shop permanently') || msg.includes('remove shop')) {
            return `⚠️ Are you sure you want to PERMANENTLY DELETE your entire shop?

This will remove:
• All your products
• Your store from the map
• All customer access
• Your digital presence

Type "YES DELETE SHOP" to confirm or "cancel" to keep your shop.`;
        }
        
        // Confirm shop deletion
        if (msg === 'yes delete shop') {
            if (conversation.realVendorId) {
                this.deleteVendorShop(conversation.realVendorId);
            }
            
            // Clear conversation
            this.conversations.delete(phoneNumber);
            
            return `🗑️ Your shop has been permanently deleted.

All products and store information have been removed.

If you want to start again, type "start" to create a new shop.

Thank you for using VendorGo! 👋`;
        }
        
        // Diagnostic command - check shop status
        if (msg.includes('check status') || msg.includes('diagnose') || msg.includes('check shop')) {
            return this.runDiagnostics(phoneNumber);
        }
        
        // Show products list
        if (msg.includes('show products') || msg.includes('list products') || msg.includes('my products')) {
            if (!conversation.vendorProfile || !conversation.vendorProfile.products || conversation.vendorProfile.products.length === 0) {
                return `📦 You don't have any products yet.

Add products by typing:
"Product Name ₹Price" or "Product Name Rs Price"

Examples:
• Single: "Samosa ₹15"
• Multiple: "Samosa ₹15, Tea Rs 10, Coffee ₹20"`;
            }
            
            const productList = conversation.vendorProfile.products.map((p, index) => 
                `${index + 1}. ${p.name} - ₹${p.price}`
            ).join('\n');
            
            return `📦 Your Products:

${productList}

💡 Commands:
• Add: "Product ₹Price" or "Product Rs Price"
• Add Multiple: "Item1 ₹10, Item2 Rs 20"
• Delete: "delete [product name]"
• Delete Shop: "delete shop"
• Help: "help"`;
        }
        
        // Delete product
        if (msg.includes('delete ') && !msg.includes('delete shop')) {
            const productName = message.substring(message.toLowerCase().indexOf('delete ') + 7).trim();
            
            if (!conversation.vendorProfile || !conversation.vendorProfile.products) {
                return `❌ No products found to delete.`;
            }
            
            const productIndex = conversation.vendorProfile.products.findIndex(p => 
                p.name.toLowerCase().includes(productName.toLowerCase())
            );
            
            if (productIndex === -1) {
                return `❌ Product "${productName}" not found.

Type "show products" to see your product list.`;
            }
            
            const deletedProduct = conversation.vendorProfile.products.splice(productIndex, 1)[0];
            
            // Update real vendor if exists
            if (conversation.realVendorId) {
                this.updateRealVendorProducts(conversation.realVendorId, conversation.vendorProfile.products);
            }
            
            return `✅ Deleted "${deletedProduct.name}" from your store.

Remaining products: ${conversation.vendorProfile.products.length}

Type "show products" to see updated list.`;
        }
        
        // Add new products
        const products = this.aiEngine.extractProductsFromText(message);
        if (products.length > 0) {
            if (!conversation.vendorProfile.products) {
                conversation.vendorProfile.products = [];
            }
            
            conversation.vendorProfile.products.push(...products);
            
            // Update real vendor if exists
            if (conversation.realVendorId) {
                this.updateRealVendorProducts(conversation.realVendorId, conversation.vendorProfile.products);
            }
            
            const productList = products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
            return `✅ Added ${products.length} product${products.length > 1 ? 's' : ''}:

${productList}

Total products: ${conversation.vendorProfile.products.length}

Type "show products" to see all products.`;
        }
        
        // If no products found, provide helpful error message
        if (message.trim().length > 3 && !msg.includes('help') && !msg.includes('orders')) {
            return `❌ I couldn't find any products in your message.

📝 Please use one of these formats:

**Single Product:**
• "Samosa ₹15"
• "Tea Rs 10"
• "Coffee rupees 20"

**Multiple Products (comma-separated):**
• "Samosa ₹15, Tea Rs 10, Coffee ₹20"
• "Burger Rs 50, Fries ₹30, Coke ₹25"

**Examples:**
✅ "Masala Dosa ₹40"
✅ "Idli Rs 30, Vada ₹35, Coffee ₹15"
✅ "iPhone 15 ₹80000, Samsung S24 Rs 75000"

Try again with the correct format!`;
        }
        
        if (msg.includes('add product') || msg.includes('new product')) {
            return `To add new products:

📝 Type: "Product Name ₹Price"
📸 Send photo with price
🎤 Voice message with details

Example: "Masala Chai ₹8"`;
        }
        
        if (msg.includes('orders') || msg.includes('order')) {
            return `📊 Your recent orders:

• 3 new orders today
• ₹450 total sales
• 4.5⭐ average rating

Check your full dashboard: http://localhost:3000/vendor-dashboard.html?vendorId=${this.generateStoreId(phoneNumber)}`;
        }
        
        if (msg.includes('help')) {
            return `🆘 VendorGo Help:

**Shop Management:**
• "change name" - Change shop name
• "show products" - View all products
• "delete shop" - Remove entire shop

**Product Management:**
• "Samosa ₹15" - Add single product
• "Tea Rs 10, Coffee ₹20" - Add multiple products
• "delete samosa" - Remove a product

**Supported Price Formats:**
• ₹ symbol: "Samosa ₹15"
• Rs: "Tea Rs 10"
• Rupees: "Coffee rupees 20"

**Diagnostics & Help:**
• "check status" - Run shop diagnostics
• "My shop is not showing" - AI will fix it
• "Products not adding" - AI will help
• Ask any question - AI understands!

**Other Commands:**
• "orders" - Check recent orders
• "help" - Show this message

**AI Assistant:**
💡 Just describe any problem in plain English!
I'll diagnose and fix it automatically.

Examples:
• "Customers can't see my shop"
• "My products aren't showing"
• "How do I change prices?"

What do you need help with?`;
        }
        
        const vendorName = conversation.vendorProfile?.name || 'Vendor';
        return `Hi ${vendorName}! 👋

Your store is running well! 📈

Recent activity:
• ${conversation.vendorProfile?.products?.length || 0} products listed
• Store is OPEN

💡 Commands:
• "show products" - View products
• "add [item] ₹[price]" - Add product
• "delete [item]" - Remove product
• "help" - More options`;
    }

    generateProfileSummary(profile) {
        const productList = profile.products.map(p => `• ${p.name} - ₹${p.price}`).join('\n');
        
        return `🎯 Here's your digital store preview:

👤 **${profile.name}**
📍 ${profile.location}  
🏪 ${this.getCategoryName(profile.category)}

🛍️ **Products:**
${productList}

Is this correct? Reply "Yes" to go live or "No" to make changes.`;
    }

    createVendorProfile(profile) {
        // Normalize phone number
        const normalizedPhone = profile.phone.replace(/\D/g, '');
        
        // Generate proper coordinates for the vendor
        let coordinates = [77.5946, 12.9716]; // Default: Bangalore
        
        // Add some randomization to coordinates
        coordinates = [
            77.5946 + (Math.random() - 0.5) * 0.1,
            12.9716 + (Math.random() - 0.5) * 0.1
        ];
        
        // Create real vendor in database
        const vendorData = {
            name: profile.name,
            businessName: profile.name,
            phone: normalizedPhone,
            category: profile.category,
            location: {
                type: 'Point',
                coordinates: coordinates,
                address: { 
                    street: profile.location || 'Location via WhatsApp'
                }
            },
            products: profile.products.map(p => ({
                name: p.name,
                price: p.price,
                description: p.description || p.name,
                available: true,
                category: profile.category
            })),
            isCurrentlyOpen: true,
            isVerified: true,
            status: 'active',
            onboardingSource: 'whatsapp',
            createdVia: 'whatsapp',
            digitalPresence: {
                hasOnlinePresence: true,
                whatsappEnabled: true,
                autoGenerated: true,
                totalOrders: 0,
                completedOrders: 0,
                rating: { average: 0, count: 0 }
            },
            paymentMethods: {
                cash: true,
                upi: true,
                upiId: normalizedPhone.slice(-10) + '@paytm'
            }
        };

        console.log('🚀 Creating vendor via API:', vendorData);

        // Send to backend API to create real vendor
        fetch('/api/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendorData)
        })
        .then(response => {
            console.log('📡 API Response status:', response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(JSON.stringify(err));
                });
            }
            return response.json();
        })
        .then(vendor => {
            console.log('✅ Real vendor created successfully:', vendor);
            console.log('📍 Vendor ID:', vendor._id);
            console.log('📍 Vendor location:', vendor.location);
            console.log('📦 Products:', vendor.products);
            
            // Store the real vendor ID for future reference
            const conversation = this.conversations.get(profile.phone);
            if (conversation) {
                conversation.realVendorId = vendor._id;
                conversation.vendorProfile.realVendorId = vendor._id;
                console.log('💾 Stored vendor ID in conversation:', vendor._id);
            }
            
            // Alert user that vendor is live
            alert(`✅ Vendor created successfully!\n\nVendor ID: ${vendor._id}\nName: ${vendor.name}\nProducts: ${vendor.products.length}\n\nRefresh the Customer PWA to see your store!`);
        })
        .catch(error => {
            console.error('❌ Failed to create real vendor:', error);
            console.error('Error details:', error.message);
            
            // Parse error message if it's JSON
            try {
                const errorData = JSON.parse(error.message);
                console.error('Error data:', errorData);
                
                // Check if phone number already registered
                if (errorData.error && errorData.error.includes('already registered')) {
                    console.log('📱 Phone already registered, this should have been caught earlier');
                    
                    // Try to get the existing vendor ID and use it
                    const normalizedPhone = profile.phone.replace(/\D/g, '');
                    fetch(`/api/vendors?phone=${normalizedPhone}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.vendors && data.vendors.length > 0) {
                                const existingVendor = data.vendors[0];
                                const conversation = this.conversations.get(profile.phone);
                                if (conversation) {
                                    conversation.realVendorId = existingVendor._id;
                                    conversation.vendorProfile.realVendorId = existingVendor._id;
                                }
                                alert(`✅ Welcome back!\n\nYour shop already exists.\nVendor ID: ${existingVendor._id}\n\nRefresh the Customer PWA to see your store.`);
                            }
                        })
                        .catch(err => {
                            console.error('Error fetching existing vendor:', err);
                            alert(`⚠️ This phone number is already registered.\n\nPlease use the "Start Fresh Demo" button to reset.`);
                        });
                } else if (errorData.errors) {
                    const errorMessages = errorData.errors.map(e => `${e.path}: ${e.msg}`).join('\n');
                    alert(`❌ Validation Error:\n\n${errorMessages}\n\nPlease check the console for details.`);
                } else if (errorData.error) {
                    alert(`❌ Error: ${errorData.error}\n\nCheck console for details.`);
                }
            } catch (e) {
                alert(`❌ Error creating vendor: ${error.message}\n\nCheck console for details.`);
            }
        });
        
        return vendorData;
    }

    generateStoreId(phoneNumber) {
        // Use the real vendor ID if available, otherwise generate from phone
        const conversation = this.conversations.get(phoneNumber);
        if (conversation && conversation.realVendorId) {
            return conversation.realVendorId;
        }
        return 'demo_' + phoneNumber.replace(/[^0-9]/g, '').slice(-10);
    }

    // Update real vendor products in database
    updateRealVendorProducts(vendorId, products) {
        const productData = products.map(p => ({
            name: p.name,
            price: p.price,
            description: p.description || p.name,
            available: true
        }));

        fetch(`/api/vendors/${vendorId}/products/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: productData })
        })
        .then(response => response.json())
        .then(result => {
            console.log('✅ Updated real vendor products:', result);
        })
        .catch(error => {
            console.error('❌ Failed to update real vendor products:', error);
        });
    }

    // Update vendor name in database
    updateVendorName(vendorId, newName) {
        fetch(`/api/vendors/${vendorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: newName,
                businessName: newName
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log('✅ Updated vendor name:', result);
            alert(`✅ Shop name changed to: ${newName}\n\nRefresh the Customer PWA to see the updated name.`);
        })
        .catch(error => {
            console.error('❌ Failed to update vendor name:', error);
            alert('❌ Failed to update shop name. Please try again.');
        });
    }

    // Delete entire vendor shop
    deleteVendorShop(vendorId) {
        fetch(`/api/vendors/${vendorId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (response.ok) {
                console.log('✅ Vendor shop deleted:', vendorId);
                alert('✅ Your shop has been permanently deleted from the system.');
            } else {
                console.error('❌ Failed to delete vendor shop');
            }
        })
        .catch(error => {
            console.error('❌ Error deleting vendor shop:', error);
        });
    }

    // Run diagnostics on vendor shop
    runDiagnostics(phoneNumber) {
        const conversation = this.getOrCreateConversation(phoneNumber);
        
        let report = '🔍 **Shop Diagnostic Report:**\n\n';
        let issues = [];
        let fixes = [];
        
        // Check 1: Shop created?
        if (!conversation.realVendorId) {
            report += '❌ **Shop Status:** Not created\n';
            issues.push('Shop not in database');
            fixes.push('Complete onboarding: type "start"');
        } else {
            report += `✅ **Shop Status:** Created (ID: ${conversation.realVendorId})\n`;
        }
        
        // Check 2: Products?
        const productCount = conversation.vendorProfile?.products?.length || 0;
        if (productCount === 0) {
            report += '❌ **Products:** None added\n';
            issues.push('No products');
            fixes.push('Add products: "Product ₹Price"');
        } else {
            report += `✅ **Products:** ${productCount} item(s)\n`;
        }
        
        // Check 3: Location?
        if (conversation.vendorProfile?.location) {
            report += `✅ **Location:** ${conversation.vendorProfile.location}\n`;
        } else {
            report += '❌ **Location:** Not set\n';
            issues.push('Location missing');
        }
        
        // Check 4: Vendor name?
        if (conversation.vendorProfile?.name) {
            report += `✅ **Name:** ${conversation.vendorProfile.name}\n`;
        } else {
            report += '❌ **Name:** Not set\n';
        }
        
        report += '\n';
        
        // Summary
        if (issues.length === 0) {
            report += '🎉 **All checks passed!**\n\n';
            report += '**Your shop should be visible.**\n\n';
            report += '**If not showing in Customer PWA:**\n';
            report += '1. Open: http://localhost:3000/\n';
            report += '2. Click "🔄 Refresh" button\n';
            report += '3. Look for your shop on the map\n\n';
            report += '**Still not visible?**\n';
            report += 'Tell me: "My shop is not showing"\n';
            report += 'I\'ll investigate and fix it!';
        } else {
            report += `⚠️ **Found ${issues.length} issue(s):**\n`;
            issues.forEach((issue, i) => {
                report += `${i + 1}. ${issue}\n`;
            });
            report += '\n**Recommended Fixes:**\n';
            fixes.forEach((fix, i) => {
                report += `${i + 1}. ${fix}\n`;
            });
            report += '\n**Need help?** Just ask me!';
        }
        
        return report;
    }

    getCategoryName(category) {
        const categories = {
            food: 'Food & Beverages',
            clothing: 'Clothing & Fashion',
            electronics: 'Electronics & Gadgets',
            accessories: 'Accessories & Others'
        };
        return categories[category] || category;
    }
}

// AI Engine for processing vendor data
class AIVendorEngine {
    extractProductsFromText(text) {
        const products = [];
        
        // Clean the text first
        const cleanText = text.trim();
        
        // Enhanced regex patterns for product extraction
        // Support: ₹, Rs, Rupees, rupees, rs
        const patterns = [
            // "samsung s25 ultra ₹50,000" or "samosa ₹15"
            /([a-zA-Z][a-zA-Z\s\d]{1,40}?)\s+₹\s*([\d,]+)/gi,
            // "samsung s25 ultra rs 50,000" or "samosa rs 15"
            /([a-zA-Z][a-zA-Z\s\d]{1,40}?)\s+rs\.?\s*([\d,]+)/gi,
            // "samsung s25 ultra rupees 50000" or "samosa rupees 15"
            /([a-zA-Z][a-zA-Z\s\d]{1,40}?)\s+rupees?\s*([\d,]+)/gi
        ];
        
        // Try each pattern
        patterns.forEach(pattern => {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            while ((match = regex.exec(text)) !== null) {
                const name = match[1].trim();
                const priceStr = match[2].replace(/,/g, ''); // Remove commas
                const price = parseInt(priceStr);
                
                // Better validation
                if (this.isValidProduct(name, price)) {
                    products.push({
                        name: this.capitalizeWords(name),
                        price: price,
                        description: `${name}`
                    });
                }
            }
        });
        
        return this.deduplicateProducts(products);
    }
    
    isValidProduct(name, price) {
        // Validate product name and price
        return (
            name.length > 1 && 
            name.length < 50 && 
            price > 0 && 
            price < 10000000 && // Allow up to 1 crore
            !this.isCommonWord(name) &&
            !name.match(/^\d+$/) && // Not just numbers
            !name.toLowerCase().includes('done') &&
            !name.toLowerCase().includes('finish') &&
            !name.toLowerCase().includes('complete')
        );
    }
    
    isCommonWord(word) {
        const common = [
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their',
            'sell', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'can', 'may', 'might', 'must', 'done', 'want', 'need', 'like',
            'get', 'got', 'make', 'made', 'add', 'new', 'product', 'item'
        ];
        return common.includes(word.toLowerCase()) || word.length < 2;
    }
    
    capitalizeWords(str) {
        // Capitalize first letter of each word
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
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
    
    extractProductsFromImage(imageData) {
        // Simulate AI image recognition
        const sampleProducts = [
            { name: 'Samosa', price: 15, description: 'Crispy fried samosa' },
            { name: 'Tea', price: 10, description: 'Hot masala tea' },
            { name: 'Sandwich', price: 30, description: 'Grilled sandwich' },
            { name: 'Burger', price: 50, description: 'Veg burger' },
            { name: 'Pizza Slice', price: 40, description: 'Cheese pizza slice' }
        ];
        
        // Return 2-3 random products to simulate AI detection
        const numProducts = Math.floor(Math.random() * 3) + 2;
        const shuffled = sampleProducts.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numProducts);
    }
    
    extractProductsFromVoice(voiceText) {
        // Simulate voice-to-text processing
        return this.extractProductsFromText(voiceText);
    }
}

// Fallback Intelligent AI for browser environment
class IntelligentAIFallback {
    analyzeIntent(message, context) {
        const msg = message.toLowerCase();
        
        // Simple intent detection
        if (msg.includes('how') && msg.includes('add')) {
            return { intent: 'how_to_add_products', confidence: 0.8 };
        }
        if (msg.includes('delete') && msg.includes('shop')) {
            return { intent: 'how_to_delete_shop', confidence: 0.9 };
        }
        if (msg.includes('customer') || msg.includes('find')) {
            return { intent: 'how_customers_find', confidence: 0.7 };
        }
        if (msg.includes('payment') || msg.includes('upi')) {
            return { intent: 'how_payment_works', confidence: 0.8 };
        }
        if (msg.includes('cost') || msg.includes('price') || msg.includes('free')) {
            return { intent: 'pricing_question', confidence: 0.9 };
        }
        
        return { intent: 'general_query', confidence: 0.5 };
    }
    
    generateResponse(intent, message, context) {
        switch (intent.intent) {
            case 'how_to_add_products':
                return `📦 **How to Add Products:**

**Single:** "Product Name ₹Price"
**Multiple:** "Item1 ₹10, Item2 Rs 20"

**Formats:** ₹, Rs, rupees

**Examples:**
• "Samosa ₹15"
• "Tea Rs 10, Coffee ₹20"

Try it now!`;

            case 'how_to_delete_shop':
                return `🗑️ **Delete Shop:**

1. Type: "delete shop"
2. Confirm: "YES DELETE SHOP"

⚠️ This is permanent!

Alternative: "close shop" (temporary)`;

            case 'how_customers_find':
                return `🎯 **Customer Discovery:**

✅ Your shop appears on map automatically
✅ Customers see you in PWA
✅ No extra steps needed!

**Customer App:**
http://localhost:3000/

Share this link with customers!`;

            case 'how_payment_works':
                return `💰 **Payments:**

🔐 Direct UPI to your account
✅ No commission
✅ Instant payment
💯 Keep 100% of earnings

Money goes straight to you!`;

            case 'pricing_question':
                return `💰 **Pricing:**

🆓 **100% FREE**
❌ No hidden fees
💯 Zero commission
✅ Keep all your earnings

Ready to start? Type "start"!`;

            default:
                return `👋 **I'm here to help!**

**Ask me:**
• "How do I add products?"
• "How do customers find me?"
• "How much does it cost?"
• "How do payments work?"

**Or type:**
• "start" - Create shop
• "help" - Show commands

What would you like to know?`;
        }
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WhatsAppBot, AIVendorEngine };
}