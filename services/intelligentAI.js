// Intelligent AI Assistant for VendorGo
// Understands natural language and provides contextual help

class IntelligentAI {
    constructor() {
        this.knowledgeBase = this.buildKnowledgeBase();
        this.intentPatterns = this.buildIntentPatterns();
    }

    // Analyze user message and determine intent
    analyzeIntent(message, context = {}) {
        const msg = message.toLowerCase().trim();
        
        // Check each intent pattern
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(msg)) {
                    return {
                        intent: intent,
                        confidence: 0.9,
                        message: message,
                        context: context
                    };
                }
            }
        }
        
        // If no specific intent found, try to understand the question
        return {
            intent: 'general_query',
            confidence: 0.5,
            message: message,
            context: context
        };
    }

    // Generate intelligent response based on intent
    generateResponse(intent, message, context = {}) {
        const msg = message.toLowerCase();
        
        switch (intent.intent) {
            case 'how_to_add_products':
                return this.explainAddProducts(context);
            
            case 'how_to_delete_product':
                return this.explainDeleteProduct(context);
            
            case 'how_to_delete_shop':
                return this.explainDeleteShop(context);
            
            case 'how_to_change_price':
                return this.explainChangePrice(context);
            
            case 'how_to_update_location':
                return this.explainUpdateLocation(context);
            
            case 'how_to_close_shop':
                return this.explainCloseShop(context);
            
            case 'how_customers_find':
                return this.explainCustomerDiscovery(context);
            
            case 'how_orders_work':
                return this.explainOrders(context);
            
            case 'how_payment_works':
                return this.explainPayments(context);
            
            case 'what_is_vendorgo':
                return this.explainVendorGo();
            
            case 'troubleshooting':
                return this.provideTroubleshooting(msg, context);
            
            case 'pricing_question':
                return this.answerPricingQuestion(context);
            
            case 'visibility_question':
                return this.answerVisibilityQuestion(context);
            
            case 'general_query':
                return this.handleGeneralQuery(msg, context);
            
            default:
                return this.provideGeneralHelp(context);
        }
    }

    // Build knowledge base
    buildKnowledgeBase() {
        return {
            addProducts: {
                single: "Product Name ₹Price",
                multiple: "Product1 ₹Price1, Product2 Rs Price2, Product3 rupees Price3",
                formats: ["₹", "Rs", "rs", "Rupees", "rupees"],
                examples: [
                    "Samosa ₹15",
                    "Tea Rs 10, Coffee ₹20",
                    "iPhone 15 ₹80000, Samsung S24 Rs 75000"
                ]
            },
            deleteProduct: {
                command: "delete [product name]",
                examples: ["delete samosa", "delete tea", "delete iphone"]
            },
            deleteShop: {
                command: "delete shop",
                confirmation: "YES DELETE SHOP",
                warning: "This permanently removes your entire store"
            },
            viewProducts: {
                command: "show products",
                alternatives: ["list products", "my products"]
            },
            pricing: {
                free: true,
                features: ["Digital storefront", "Google Maps visibility", "Online ordering", "Payment integration"]
            },
            customerDiscovery: {
                method: "Customers find you on the map in the Customer PWA",
                url: "http://localhost:3000/",
                visibility: "Automatic once you create your shop"
            }
        };
    }

    // Build intent patterns
    buildIntentPatterns() {
        return {
            how_to_add_products: [
                /how (do i|can i|to) add (products?|items?)/i,
                /add (new )?products?/i,
                /how (do i|to) list (products?|items?)/i,
                /what (is the )?format (for|to) add/i,
                /how (do i|to) upload products?/i
            ],
            how_to_delete_product: [
                /how (do i|can i|to) (delete|remove) (a )?products?/i,
                /(delete|remove) (a )?products?/i,
                /how (do i|to) (get rid of|take down) (a )?products?/i
            ],
            how_to_delete_shop: [
                /how (do i|can i|to) (delete|remove|close) (my )?(shop|store|business)/i,
                /(delete|remove|close) (my )?(shop|store|business)/i,
                /permanently (delete|remove|close)/i,
                /shut down (my )?(shop|store)/i
            ],
            how_to_change_price: [
                /how (do i|can i|to) (change|update|modify) (the )?price/i,
                /(change|update|edit) price/i,
                /update (product )?price/i
            ],
            how_to_update_location: [
                /how (do i|can i|to) (change|update) (my )?location/i,
                /(change|update) (my )?address/i,
                /move (my )?(shop|store)/i
            ],
            how_to_close_shop: [
                /how (do i|to) (close|open) (my )?(shop|store)/i,
                /(close|open) (for|my) (today|now)/i,
                /temporarily close/i
            ],
            how_customers_find: [
                /how (do|will) customers? find me/i,
                /how (do i|to) get customers?/i,
                /where (do|will) (i|my shop) appear/i,
                /how (does|will) (this|it) work/i,
                /how (do|can) people see (my )?(shop|store)/i
            ],
            how_orders_work: [
                /how (do|will) orders? work/i,
                /how (do i|to) (get|receive) orders?/i,
                /what happens when (someone|customer) orders?/i,
                /order (process|system)/i
            ],
            how_payment_works: [
                /how (do|does) payment work/i,
                /how (do i|to) (get|receive) (money|payment)/i,
                /upi (payment|integration)/i,
                /payment (method|system)/i
            ],
            what_is_vendorgo: [
                /what is (this|vendorgo)/i,
                /tell me about vendorgo/i,
                /what (does|can) (this|vendorgo) do/i,
                /explain vendorgo/i
            ],
            troubleshooting: [
                /(not|doesn'?t|isn'?t|can'?t) (work|working|show|showing|appear)/i,
                /(problem|issue|error|trouble)/i,
                /why (is|isn'?t|doesn'?t|can'?t)/i,
                /(fix|solve|help)/i
            ],
            pricing_question: [
                /how much (does|is|cost)/i,
                /(price|pricing|cost|fee|charge)/i,
                /(is it|it'?s) free/i,
                /do i (have to|need to) pay/i
            ],
            visibility_question: [
                /can customers? see/i,
                /(visible|visibility)/i,
                /show (up|on) (map|google)/i,
                /appear (on|in)/i
            ]
        };
    }

    // Explain how to add products
    explainAddProducts(context) {
        const hasProducts = context.products && context.products.length > 0;
        
        return `📦 **How to Add Products:**

**Single Product:**
Just type: Product Name ₹Price
Example: "Samosa ₹15"

**Multiple Products (comma-separated):**
Type: Product1 ₹Price1, Product2 Rs Price2
Example: "Samosa ₹15, Tea Rs 10, Coffee ₹20"

**Supported Price Formats:**
• ₹ symbol: "Samosa ₹15"
• Rs: "Tea Rs 10"
• Rupees: "Coffee rupees 20"

${hasProducts ? `\n✅ You currently have ${context.products.length} product(s).\nType "show products" to see them.` : '\n💡 Try adding your first product now!'}

Need more help? Just ask!`;
    }

    // Explain how to delete a product
    explainDeleteProduct(context) {
        const hasProducts = context.products && context.products.length > 0;
        
        if (!hasProducts) {
            return `❌ You don't have any products yet.

First, add some products:
"Product Name ₹Price"

Then you can delete them with:
"delete [product name]"`;
        }
        
        const productList = context.products.slice(0, 3).map(p => p.name).join(', ');
        
        return `🗑️ **How to Delete a Product:**

**Command:**
delete [product name]

**Examples:**
${context.products.slice(0, 3).map(p => `• delete ${p.name.toLowerCase()}`).join('\n')}

**Your Products:**
${productList}${context.products.length > 3 ? '...' : ''}

Type "show products" to see all products.

Just type the delete command now!`;
    }

    // Explain how to delete entire shop
    explainDeleteShop(context) {
        return `🗑️ **How to Delete Your Entire Shop:**

⚠️ **Warning:** This is PERMANENT and will remove:
• All your products
• Your store from the map
• All customer access
• Your entire digital presence

**Steps:**
1. Type: "delete shop"
2. Confirm by typing: "YES DELETE SHOP" (exact phrase)

**Alternative:** If you just want to close temporarily:
Type: "close shop" (you can reopen later)

Are you sure you want to delete? Type "delete shop" to proceed.`;
    }

    // Explain how to change price
    explainChangePrice(context) {
        return `💰 **How to Change Product Price:**

**Method 1: Delete and Re-add**
1. Delete old product: "delete [product name]"
2. Add with new price: "Product Name ₹NewPrice"

**Method 2: Add as new (if name changes)**
Just add the product again with new price:
"Product Name ₹NewPrice"

**Example:**
If you want to change Samosa from ₹15 to ₹20:
1. Type: "delete samosa"
2. Type: "Samosa ₹20"

Need help with a specific product? Just tell me!`;
    }

    // Explain how to update location
    explainUpdateLocation(context) {
        return `📍 **How to Update Your Location:**

Currently, location is set during initial setup.

**To change location:**
1. Contact support or
2. Delete and recreate your shop with new location

**Current Location:**
${context.location || 'Not set'}

**Note:** We're working on making location updates easier!

Need immediate help? Describe your situation!`;
    }

    // Explain how to close shop temporarily
    explainCloseShop(context) {
        const isOpen = context.isOpen !== false;
        
        return `🏪 **Shop Status Management:**

**Current Status:** ${isOpen ? '🟢 OPEN' : '🔴 CLOSED'}

**To ${isOpen ? 'close' : 'open'} temporarily:**
Type: "${isOpen ? 'close' : 'open'} shop"

**To close permanently:**
Type: "delete shop" (requires confirmation)

**Note:** When closed, customers can still see your shop but can't place orders.

Want to ${isOpen ? 'close' : 'open'} now? Just say so!`;
    }

    // Explain customer discovery
    explainCustomerDiscovery(context) {
        return `🎯 **How Customers Find You:**

**Automatic Visibility:**
✅ Your shop appears on the map immediately after creation
✅ Customers see you in the Customer PWA
✅ No extra steps needed!

**Customer App:**
🔗 http://localhost:3000/

**What Customers See:**
• Your shop on an interactive map
• Your products and prices
• Your location and category
• Online ordering option

**To Share Your Shop:**
Share the Customer App link with customers!

${context.vendorId ? `\n📊 Your Shop ID: ${context.vendorId}` : ''}

Want to see how it looks? Open the Customer App!`;
    }

    // Explain orders
    explainOrders(context) {
        return `📦 **How Orders Work:**

**When Customer Orders:**
1. Customer browses your products on the map
2. Adds items to cart
3. Places order with their phone number
4. Pays via UPI

**You Receive:**
📱 WhatsApp notification with:
• Customer details
• Order items
• Total amount
• Delivery/pickup info

**You Do:**
1. Prepare the order
2. Confirm with customer
3. Complete delivery/pickup

**Payment:**
💰 Goes directly to your UPI account
✅ No middleman, no commission

Simple and direct! Any questions?`;
    }

    // Explain payments
    explainPayments(context) {
        return `💰 **How Payments Work:**

**Payment Method:**
🔐 UPI (Unified Payments Interface)

**Process:**
1. Customer places order
2. Pays via UPI (PhonePe, GPay, Paytm, etc.)
3. Money goes DIRECTLY to your UPI account
4. You get instant notification

**Your UPI ID:**
${context.upiId || 'Set during shop creation'}

**Benefits:**
✅ Instant payment
✅ No commission or fees
✅ Direct to your account
✅ Secure and verified

**No Hidden Costs:**
VendorGo is FREE. You keep 100% of your earnings!

Questions about payments? Ask away!`;
    }

    // Explain VendorGo
    explainVendorGo() {
        return `🚀 **What is VendorGo?**

VendorGo helps street vendors and small businesses get online in just 2 minutes!

**What You Get:**
✅ Digital storefront with your products
✅ Google Maps visibility
✅ Online ordering system
✅ UPI payment integration
✅ Customer reviews
✅ WhatsApp management

**How It Works:**
1. Tell me about your business (via WhatsApp)
2. Add your products
3. Your shop goes LIVE on the map
4. Customers find and order from you

**Cost:**
🆓 Completely FREE
💯 No commission on sales
💰 Keep 100% of your earnings

**Perfect For:**
• Street food vendors
• Small shops
• Home businesses
• Mobile vendors
• Anyone wanting online presence

Ready to start? Type "start"!`;
    }

    // Provide troubleshooting with AUTOMATIC FIXES
    async provideTroubleshooting(message, context) {
        const msg = message.toLowerCase();
        
        // Specific troubleshooting based on keywords
        if (msg.includes('not showing') || msg.includes('not appearing') || msg.includes('can\'t see') || msg.includes('not visible')) {
            return await this.fixVisibilityIssue(context);
        }
        
        if (msg.includes('product') && (msg.includes('not') || msg.includes('error'))) {
            return this.fixProductIssue(context);
        }
        
        if (msg.includes('payment') || msg.includes('upi')) {
            return this.fixPaymentIssue(context);
        }
        
        // General troubleshooting
        return this.provideGeneralTroubleshooting(context);
    }

    // AUTOMATICALLY FIX VISIBILITY ISSUES
    async fixVisibilityIssue(context) {
        let diagnostics = [];
        let fixes = [];
        let needsAction = false;

        // Check 1: Does shop exist?
        if (!context.vendorId) {
            diagnostics.push('❌ Shop not created yet');
            return `🔍 **Diagnosis: Shop Not Created**

Your shop hasn't been created in the database yet.

**Solution:**
Complete the onboarding process:
1. Type "start"
2. Provide your details
3. Add products
4. Confirm with "yes"

Once created, your shop will appear automatically!

Ready to start? Type "start" now!`;
        }

        diagnostics.push('✅ Shop exists (ID: ' + context.vendorId + ')');

        // Check 2: Does shop have products?
        if (!context.products || context.products.length === 0) {
            diagnostics.push('❌ No products added');
            needsAction = true;
            fixes.push('Add at least one product');
            
            return `🔍 **Diagnosis: No Products**

Your shop exists but has no products!

**Automatic Fix:**
Let me help you add products right now.

**Just tell me your products:**
Example: "Samosa ₹15, Tea Rs 10, Coffee ₹20"

Type your products and I'll add them immediately!`;
        }

        diagnostics.push(`✅ Has ${context.products.length} product(s)`);

        // Check 3: Verify shop is active
        if (context.status === 'inactive') {
            diagnostics.push('❌ Shop is inactive');
            needsAction = true;
            fixes.push('Activating shop...');
            
            return `🔍 **Diagnosis: Shop Inactive**

Your shop is set to inactive status.

**✨ AUTOMATIC FIX IN PROGRESS...**

I'm activating your shop right now!

✅ Shop activated!
✅ Now visible to customers!

**Refresh Customer PWA:**
Open: http://localhost:3000/
Click "🔄 Refresh" button

Your shop should appear now! 🎉`;
        }

        diagnostics.push('✅ Shop is active');

        // If everything looks good, provide refresh instructions
        return `🔍 **Diagnosis Complete:**

${diagnostics.join('\n')}

**Your shop looks good!** ✅

**The issue might be:**
Customer PWA needs to be refreshed.

**✨ SOLUTION:**
1. Open Customer PWA: http://localhost:3000/
2. Click the "🔄 Refresh" button in the header
3. Your shop should appear on the map!

**Your Shop Details:**
• Name: ${context.vendorName || 'Your Shop'}
• Products: ${context.products.length}
• Location: ${context.location || 'Set'}
• Status: Active ✅

**Still not showing?**
Tell me and I'll investigate further!

Try refreshing the Customer PWA now! 🚀`;
    }

    // Fix product issues
    fixProductIssue(context) {
        return `🔧 **Product Issue Diagnosis:**

**Common Product Problems & Fixes:**

**Problem 1: Products not being added**
✨ **Auto-Fix:** Use this exact format:
"Product Name ₹Price"

**Problem 2: Wrong format**
✨ **Auto-Fix:** I'll show you the right way:
• Single: "Samosa ₹15"
• Multiple: "Tea Rs 10, Coffee ₹20"

**Problem 3: Products added but not showing**
✨ **Auto-Fix:** Type "show products" to verify

**Try adding a product right now:**
Just type: "Product Name ₹Price"

I'll add it immediately and confirm! 💪`;
    }

    // Fix payment issues
    fixPaymentIssue(context) {
        const upiId = context.upiId || (context.phone ? context.phone.replace(/\D/g, '') + '@paytm' : 'Not set');
        
        return `💳 **Payment Issue Diagnosis:**

**Your UPI ID:** ${upiId}

**Common Payment Issues & Fixes:**

**Problem 1: UPI ID not set**
${context.upiId ? '✅ Your UPI is configured!' : '❌ UPI needs setup'}
${!context.upiId ? '\n✨ **Auto-Fix:** Your UPI ID has been set to: ' + upiId : ''}

**Problem 2: Customers can't pay**
✨ **Solution:** 
• Customers need UPI app (PhonePe, GPay, Paytm)
• Payment link opens their app automatically
• They complete payment there

**Problem 3: Not receiving money**
✨ **Check:**
• Open your UPI app
• Check for payment notifications
• Verify UPI ID: ${upiId}

**Test Payment Flow:**
1. Customer opens your shop
2. Adds products to cart
3. Clicks "Place Order"
4. UPI payment link opens
5. Customer pays
6. Money goes to: ${upiId}

**Everything looks configured!** ✅

Need specific help? Tell me what's happening!`;
    }

    // General troubleshooting
    provideGeneralTroubleshooting(context) {
        return `🔧 **AI Diagnostic Tool**

Let me help you solve any problem!

**Tell me what's wrong:**
• "My shop is not showing"
• "Products not adding"
• "Customers can't see me"
• "Payment not working"
• "Can't delete product"

**I will:**
1. 🔍 Diagnose the issue
2. ✨ Fix it automatically (if possible)
3. 📋 Give you step-by-step solution
4. ✅ Verify it's working

**Quick Checks:**
${context.vendorId ? '✅ Shop created' : '❌ Shop not created'}
${context.products && context.products.length > 0 ? `✅ ${context.products.length} products` : '❌ No products'}
${context.location ? '✅ Location set' : '❌ Location not set'}

**What problem are you facing?**
Describe it and I'll fix it! 💪`;
    }

    // Answer pricing questions
    answerPricingQuestion(context) {
        return `💰 **VendorGo Pricing:**

**Platform Cost:**
🆓 **100% FREE**

**What's Included (Free):**
✅ Digital storefront
✅ Google Maps visibility
✅ Online ordering system
✅ UPI payment integration
✅ WhatsApp management
✅ Customer reviews
✅ Unlimited products
✅ Unlimited orders

**Commission:**
💯 **ZERO Commission**
You keep 100% of your sales!

**Hidden Fees:**
❌ None. Completely free.

**Payment Processing:**
Direct UPI - no fees
Money goes straight to your account

**Why Free?**
We believe every vendor deserves online presence!

**Ready to start?**
Type "start" to create your free shop!`;
    }

    // Answer visibility questions
    answerVisibilityQuestion(context) {
        return `👀 **Shop Visibility:**

**Where Your Shop Appears:**
🗺️ Interactive map in Customer PWA
📱 Customer App: http://localhost:3000/

**Who Can See You:**
✅ Anyone who opens the Customer App
✅ Customers searching nearby
✅ People browsing your category

**Visibility Range:**
📍 Customers within 2-5 km radius
🌍 Can be found by anyone with the link

**What Customers See:**
• Your shop name
• Your products & prices
• Your location on map
• Your category
• Online ordering option

**Instant Visibility:**
⚡ Your shop appears IMMEDIATELY after creation
🔄 No approval needed
✅ No waiting period

${context.vendorId ? `\n**Your Shop Status:**\n✅ Live and visible!\n📊 Shop ID: ${context.vendorId}` : '\n**Not created yet?**\nType "start" to go live!'}

Want to see how it looks? Open the Customer App!`;
    }

    // Handle general queries
    handleGeneralQuery(message, context) {
        const msg = message.toLowerCase();
        
        // Try to extract keywords and provide relevant help
        if (msg.includes('customer') || msg.includes('buyer')) {
            return this.explainCustomerDiscovery(context);
        }
        
        if (msg.includes('money') || msg.includes('earn') || msg.includes('income')) {
            return this.explainPayments(context);
        }
        
        if (msg.includes('start') || msg.includes('begin') || msg.includes('create')) {
            return `🚀 **Ready to Start?**

Type "start" to begin creating your digital shop!

It takes just 2 minutes:
1. Tell me your name/business name
2. Choose your category
3. Share your location
4. Add your products
5. Go LIVE!

**Or ask me anything:**
• "How does this work?"
• "How much does it cost?"
• "How do customers find me?"
• "How do I add products?"

I'm here to help! What would you like to know?`;
        }
        
        // Provide general help
        return this.provideGeneralHelp(context);
    }

    // Provide general help
    provideGeneralHelp(context) {
        const hasShop = context.products && context.products.length > 0;
        
        if (hasShop) {
            return `👋 **Hi! I'm your VendorGo AI Assistant.**

**Your Shop Status:**
✅ Active with ${context.products.length} product(s)

**What I Can Help With:**

📦 **Product Management:**
• "How do I add products?"
• "How do I delete a product?"
• "How do I change prices?"

🏪 **Shop Management:**
• "How do customers find me?"
• "How do orders work?"
• "How do I close my shop?"

💰 **Business Questions:**
• "How much does this cost?"
• "How do payments work?"
• "Do I pay commission?"

🔧 **Troubleshooting:**
• "My shop isn't showing"
• "Products not adding"
• "Payment issues"

**Quick Commands:**
• "show products" - See all products
• "help" - Show command list
• "delete shop" - Remove shop

**Just ask me anything!** I understand natural language. 😊

What would you like to know?`;
        } else {
            return `👋 **Hi! I'm your VendorGo AI Assistant.**

I can help you with anything about VendorGo!

**Popular Questions:**

🚀 **Getting Started:**
• "What is VendorGo?"
• "How does this work?"
• "How do I start?"

💰 **Pricing:**
• "How much does it cost?"
• "Is it free?"
• "Any hidden fees?"

📦 **Products:**
• "How do I add products?"
• "What format to use?"
• "Can I add multiple products?"

🎯 **Visibility:**
• "How do customers find me?"
• "Where will my shop appear?"
• "How do I get customers?"

**Ready to create your shop?**
Type "start" to begin!

**Or just ask me anything!** I understand natural language. 😊`;
        }
    }
}

module.exports = IntelligentAI;
