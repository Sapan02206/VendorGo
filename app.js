// VendorGo Production Application

// Define global functions immediately to prevent timing issues
window.viewVendorStorefront = function(vendorId) {
    console.log('Global viewVendorStorefront called with ID:', vendorId);
    if (window.app && typeof window.app.viewVendorStorefront === 'function') {
        window.app.viewVendorStorefront(vendorId);
    } else {
        console.error('App not initialized or viewVendorStorefront method not available');
        // Try again after a short delay
        setTimeout(() => {
            if (window.app && typeof window.app.viewVendorStorefront === 'function') {
                console.log('Retrying viewVendorStorefront after delay...');
                window.app.viewVendorStorefront(vendorId);
            } else {
                alert('Unable to open vendor store. Please refresh the page and try again.');
            }
        }, 500);
    }
};

window.becomeVendor = function() {
    console.log('becomeVendor function called');
    try {
        if (window.app) {
            console.log('App found, switching to vendor mode');
            window.app.currentMode = 'vendor';
            window.app.toggleMode();
        } else {
            console.error('App not initialized, trying alternative approach');
            // Alternative approach - directly manipulate DOM
            const customerMode = document.getElementById('customerMode');
            const vendorMode = document.getElementById('vendorMode');
            const modeText = document.getElementById('modeText');
            
            if (customerMode && vendorMode && modeText) {
                customerMode.classList.remove('active');
                vendorMode.classList.add('active');
                modeText.textContent = 'Vendor Mode';
                
                // Show onboarding page
                const onboardingPage = document.getElementById('onboardingPage');
                if (onboardingPage) {
                    // Hide all pages in vendor mode
                    vendorMode.querySelectorAll('.page').forEach(page => {
                        page.classList.remove('active');
                    });
                    onboardingPage.classList.add('active');
                }
            }
        }
    } catch (error) {
        console.error('Error in becomeVendor function:', error);
    }
};

class VendorGoApp {
    constructor() {
        this.currentMode = 'customer';
        this.currentVendor = null;
        this.currentOrder = null;
        this.map = null;
        this.markers = [];
        
        // Safe API initialization
        try {
            this.api = window.vendorGoAPI;
            if (!this.api) {
                console.warn('vendorGoAPI not available, will retry...');
                // Retry after a short delay
                setTimeout(() => {
                    this.api = window.vendorGoAPI;
                    if (this.api) {
                        console.log('vendorGoAPI loaded successfully on retry');
                    } else {
                        console.error('vendorGoAPI still not available');
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error initializing API:', error);
        }
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing VendorGo app...');
            
            // Wait for API to be available
            if (!this.api) {
                console.log('API not available, waiting...');
                await this.waitForAPI();
            }
            
            this.setupEventListeners();
            this.initializeMap();
            await this.loadInitialData();
            this.renderDiscoveryPage();
            this.setupRealTimeEvents();
            console.log('VendorGo app initialized successfully');
        } catch (error) {
            console.error('Error during app initialization:', error);
            // Continue with limited functionality
            console.log('Continuing with limited functionality...');
            try {
                this.setupEventListeners();
                this.renderDiscoveryPage();
            } catch (fallbackError) {
                console.error('Fallback initialization also failed:', fallbackError);
            }
        }
    }
    
    // Wait for API to be available
    async waitForAPI() {
        return new Promise((resolve) => {
            const checkAPI = () => {
                if (window.vendorGoAPI) {
                    this.api = window.vendorGoAPI;
                    console.log('API found and assigned');
                    resolve();
                } else {
                    console.log('Still waiting for API...');
                    setTimeout(checkAPI, 100);
                }
            };
            checkAPI();
        });
    }

    setupEventListeners() {
        // Mode toggle
        document.getElementById('modeToggle').addEventListener('click', () => {
            this.toggleMode();
        });

        // WhatsApp Demo
        document.getElementById('whatsappDemo').addEventListener('click', () => {
            window.open('whatsapp-demo.html', '_blank', 'width=450,height=700');
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterVendors();
        });

        document.getElementById('searchBtn').addEventListener('click', () => {
            this.filterVendors();
        });

        // Navigation
        document.getElementById('backToDiscovery').addEventListener('click', () => {
            this.showPage('discoveryPage');
        });

        document.getElementById('backToDiscoveryFromHistory').addEventListener('click', () => {
            this.showPage('discoveryPage');
        });

        document.getElementById('viewOrderHistoryBtn').addEventListener('click', () => {
            this.showPage('orderHistoryPage');
        });

        document.getElementById('lookupOrdersBtn').addEventListener('click', () => {
            this.lookupOrders();
        });

        document.getElementById('orderPhoneInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.lookupOrders();
            }
        });

        document.getElementById('backToStorefront').addEventListener('click', () => {
            this.showPage('storefrontPage');
        });

        document.getElementById('backToDiscoveryFromConfirm').addEventListener('click', () => {
            this.showPage('discoveryPage');
        });

        // Vendor onboarding
        document.getElementById('vendorOnboardingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVendorOnboarding();
        });

        // Vendor logout
        document.getElementById('logoutVendor').addEventListener('click', () => {
            this.logoutVendor();
        });

        // Add product
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.showModal('addProductModal');
        });

        document.getElementById('addProductForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProduct();
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('.modal').id;
                this.hideModal(modalId);
                
                // Reset product form when closing add product modal
                if (modalId === 'addProductModal') {
                    this.resetProductForm();
                }
            });
        });

        // Filters
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterVendors();
        });

        document.getElementById('distanceFilter').addEventListener('change', () => {
            this.filterVendors();
        });
    }

    setupRealTimeEvents() {
        // Listen for real-time events
        window.addEventListener('vendorgo:new-order', (event) => {
            this.handleNewOrder(event.detail);
        });

        window.addEventListener('vendorgo:order-update', (event) => {
            this.handleOrderUpdate(event.detail);
        });
    }

    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            // Load vendors from API
            const response = await this.api.getVendors();
            this.vendors = response.vendors || response || [];
            console.log('Vendors loaded:', this.vendors);
            
            // Load orders if user is authenticated
            if (this.api.isAuthenticated()) {
                this.orders = await this.api.getOrders();
                console.log('Orders loaded:', this.orders);
            } else {
                this.orders = [];
                console.log('User not authenticated, no orders loaded');
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.vendors = [];
            this.orders = [];
        }
    }

    async toggleMode() {
        console.log('toggleMode called, current mode:', this.currentMode);
        this.currentMode = this.currentMode === 'customer' ? 'vendor' : 'customer';
        
        const customerMode = document.getElementById('customerMode');
        const vendorMode = document.getElementById('vendorMode');
        const modeText = document.getElementById('modeText');

        console.log('Switching to mode:', this.currentMode);
        console.log('customerMode element:', customerMode);
        console.log('vendorMode element:', vendorMode);

        if (this.currentMode === 'customer') {
            customerMode.classList.add('active');
            vendorMode.classList.remove('active');
            modeText.textContent = '👆 Click to Switch to Vendor Mode';
            modeText.parentElement.style.animation = 'pulse 2s infinite';
            this.showPage('discoveryPage');
        } else {
            customerMode.classList.remove('active');
            vendorMode.classList.add('active');
            modeText.textContent = '👆 Click to Switch to Customer Mode';
            modeText.parentElement.style.animation = 'none';
            
            // Check if vendor is logged in
            if (this.api.isAuthenticated() && this.api.isVendor()) {
                this.showPage('dashboardPage');
                await this.renderVendorDashboard();
            } else {
                this.showPage('onboardingPage');
            }
        }
    }

    showPage(pageId) {
        console.log('showPage called with pageId:', pageId);
        
        // Hide all pages in current mode
        const currentModeContainer = document.querySelector('.mode-container.active');
        if (!currentModeContainer) {
            console.error('No active mode container found');
            return;
        }
        
        console.log('Current mode container:', currentModeContainer.id);
        
        currentModeContainer.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (!targetPage) {
            console.error('Target page not found:', pageId);
            return;
        }
        
        targetPage.classList.add('active');
        console.log('Page shown successfully:', pageId);
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Map functionality
    initializeMap() {
        this.map = L.map('map').setView([12.9716, 77.5946], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    renderVendorMarkers() {
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        if (!this.vendors) return;
        
        this.vendors.forEach(vendor => {
            const marker = L.marker([vendor.lat, vendor.lng])
                .addTo(this.map)
                .bindPopup(`
                    <div class="map-popup">
                        <h4>${vendor.name}</h4>
                        <p><i class="fas fa-tag"></i> ${this.getCategoryName(vendor.category)}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${vendor.location}</p>
                        <button onclick="app.viewVendorStorefront('${vendor._id}')" class="btn btn-primary btn-sm">
                            View Store
                        </button>
                    </div>
                `);
            
            this.markers.push(marker);
        });
    }

    // Discovery Page
    async renderDiscoveryPage() {
        await this.loadInitialData();
        this.renderVendorCards();
        this.renderVendorMarkers();
        this.updateDiscoveryStats();
        
        // Fallback: If no vendors and no button visible, force show it
        setTimeout(() => {
            const vendorCards = document.getElementById('vendorCards');
            if (vendorCards && (!this.vendors || this.vendors.length === 0) && !vendorCards.innerHTML.includes('Become a Vendor')) {
                console.log('Fallback: Forcing Become a Vendor button to show');
                vendorCards.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-store"></i>
                        <p>No vendors found. Be the first to join!</p>
                        <button class="btn btn-primary" onclick="becomeVendor()">
                            <i class="fas fa-plus"></i> Become a Vendor
                        </button>
                    </div>
                `;
            }
        }, 2000);
    }

    updateDiscoveryStats() {
        const totalVendors = this.vendors ? this.vendors.length : 0;
        const totalOrders = this.orders ? this.orders.length : 0;
        
        document.getElementById('totalVendors').textContent = totalVendors;
        document.getElementById('totalOrders').textContent = totalOrders;
    }

    renderVendorCards() {
        const vendorCards = document.getElementById('vendorCards');
        
        console.log('renderVendorCards called, vendors:', this.vendors);
        
        if (!this.vendors || this.vendors.length === 0) {
            console.log('No vendors found, showing empty state with Become a Vendor button');
            vendorCards.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <p>No vendors found. Be the first to join!</p>
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0; border-left: 4px solid #3498db;">
                        <p style="margin: 0; color: #2c3e50; font-weight: 500;">
                            👆 <strong>Click the blue "Customer Mode" button above</strong> to switch to Vendor Mode and register your business!
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="becomeVendor()">
                        <i class="fas fa-plus"></i> Become a Vendor
                    </button>
                </div>
            `;
            return;
        }

        console.log('Rendering', this.vendors.length, 'vendor cards');
        vendorCards.innerHTML = this.vendors.map(vendor => `
            <div class="vendor-card" onclick="viewVendorStorefront('${vendor._id}')" style="cursor: pointer;">
                <div class="vendor-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <h3>${vendor.name}</h3>
                    ${vendor.createdVia === 'whatsapp' ? '<span style="background: #25d366; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.7rem;"><i class="fab fa-whatsapp"></i> WhatsApp</span>' : ''}
                    ${(vendor.isCurrentlyOpen || vendor.isOnline) ? '<span style="background: #27ae60; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.7rem;"><i class="fas fa-circle"></i> Online</span>' : '<span style="background: #e74c3c; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.7rem;"><i class="fas fa-circle"></i> Offline</span>'}
                </div>
                <div class="vendor-info">
                    <span class="vendor-category">${this.getCategoryName(vendor.category)}</span>
                    <span class="vendor-distance">
                        <i class="fas fa-map-marker-alt"></i> ${vendor.location?.address?.street || vendor.location || 'Location not set'}
                    </span>
                </div>
                <div class="digital-presence-stats" style="margin: 0.5rem 0; font-size: 0.9rem; color: #7f8c8d;">
                    <span><i class="fas fa-star" style="color: #f39c12;"></i> ${vendor.averageRating || vendor.rating || 4.0}</span>
                    <span style="margin-left: 1rem;"><i class="fas fa-shopping-cart"></i> ${vendor.totalOrders || 0} orders</span>
                    <span style="margin-left: 1rem;"><i class="fas fa-eye"></i> ${vendor.analytics?.profileViews || vendor.views || 0} views</span>
                </div>
                <p>${vendor.products ? vendor.products.length : 0} products available</p>
                ${vendor.createdAt ? `<div style="font-size: 0.7rem; color: #95a5a6; margin-top: 0.5rem;">Joined: ${new Date(vendor.createdAt).toLocaleDateString()}</div>` : ''}
                <div style="margin-top: 0.5rem;">
                    <button onclick="event.stopPropagation(); viewVendorStorefront('${vendor._id}')" class="btn btn-primary btn-sm" style="width: 100%;">
                        <i class="fas fa-store"></i> View Store
                    </button>
                </div>
            </div>
        `).join('');
    }

    async filterVendors() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const distanceFilter = document.getElementById('distanceFilter').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
        
        try {
            // Build query parameters
            const params = {};
            if (categoryFilter) params.category = categoryFilter;
            if (searchQuery) params.search = searchQuery;
            if (distanceFilter) params.maxDistance = distanceFilter;
            
            // Fetch filtered vendors from API
            this.vendors = await this.api.getVendors(params);
            this.renderVendorCards();
            this.renderVendorMarkers();
        } catch (error) {
            console.error('Failed to filter vendors:', error);
            this.showError('Failed to load vendors. Please try again.');
        }
    }

    // Storefront
    async viewVendorStorefront(vendorId) {
        console.log('viewVendorStorefront called with ID:', vendorId);
        console.log('Current app state:', {
            currentMode: this.currentMode,
            apiInitialized: !!this.api,
            vendorsLoaded: this.vendors ? this.vendors.length : 0
        });
        
        if (!vendorId) {
            console.error('No vendor ID provided');
            this.showError('Invalid vendor selected');
            return;
        }

        try {
            console.log('Fetching vendor details...');
            const vendor = await this.api.getVendor(vendorId);
            console.log('Vendor data received:', vendor);
            
            this.currentVendor = vendor;
            this.renderStorefront(vendor);
            this.showPage('storefrontPage');
        } catch (error) {
            console.error('Failed to load vendor:', error);
            this.showError('Failed to load vendor details. Please try again.');
        }
    }

    renderStorefront(vendor) {
        const storefrontInfo = document.getElementById('storefrontInfo');
        const storefrontProducts = document.getElementById('storefrontProducts');

        // Use the correct field name for vendor online status
        const isVendorOnline = vendor.isCurrentlyOpen || vendor.isOnline || false;

        storefrontInfo.innerHTML = `
            <div class="storefront-info">
                <h2>${vendor.name} ${isVendorOnline ? '<span style="color: #27ae60;"><i class="fas fa-circle"></i> Online</span>' : '<span style="color: #e74c3c;"><i class="fas fa-circle"></i> Offline</span>'}</h2>
                <div class="vendor-info">
                    <span class="vendor-category">${this.getCategoryName(vendor.category)}</span>
                    <span class="vendor-distance">
                        <i class="fas fa-map-marker-alt"></i> ${vendor.location?.address?.street || vendor.location || 'Location not set'}
                    </span>
                    <span class="vendor-phone">
                        <i class="fas fa-phone"></i> ${vendor.phone}
                    </span>
                </div>
                <div class="digital-presence-info" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin-bottom: 0.5rem; color: #2c3e50;"><i class="fas fa-chart-line"></i> Store Performance</h4>
                    <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                        <div><strong>Rating:</strong> <span style="color: #f39c12;"><i class="fas fa-star"></i> ${vendor.averageRating || vendor.rating || 4.0}/5</span></div>
                        <div><strong>Total Orders:</strong> <span style="color: #27ae60;">${vendor.totalOrders || 0}</span></div>
                        <div><strong>Reviews:</strong> <span style="color: #3498db;">${vendor.totalReviews || vendor.reviewCount || 0}</span></div>
                        <div><strong>Response Time:</strong> <span style="color: #9b59b6;">${vendor.avgResponseTime || '5 min'}</span></div>
                    </div>
                </div>
                ${!isVendorOnline ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; color: #856404;">
                        <p style="margin: 0;"><i class="fas fa-info-circle"></i> <strong>Vendor is currently offline</strong> - Orders will be processed when they come back online</p>
                    </div>
                ` : ''}
            </div>
        `;

        const availableProducts = vendor.products ? vendor.products.filter(p => p.available) : [];
        
        if (availableProducts.length === 0) {
            storefrontProducts.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>No products available at the moment</p>
                    <p style="font-size: 0.9rem; color: #7f8c8d;">Check back later or contact the vendor directly</p>
                </div>
            `;
            return;
        }

        storefrontProducts.innerHTML = `
            <div class="product-grid">
                ${availableProducts.map(product => `
                    <div class="product-card">
                        <div class="product-header">
                            <span class="product-name">${product.name}</span>
                            <span class="product-price">₹${product.price}</span>
                        </div>
                        <p class="product-description">${product.description || 'Delicious item from our menu'}</p>
                        ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin: 0.5rem 0;">` : ''}
                        <button class="btn ${isVendorOnline ? 'btn-primary' : 'btn-warning'}" onclick="app.startOrder('${product._id}')" title="${isVendorOnline ? 'Order now' : 'Order will be processed when vendor comes online'}">
                            <i class="fas fa-shopping-cart"></i>
                            ${isVendorOnline ? 'Order Now' : 'Order (Offline)'}
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Order Flow
    startOrder(productId) {
        if (!this.currentVendor) return;

        const product = this.currentVendor.products.find(p => p._id === productId);
        if (!product) return;

        this.currentOrder = {
            vendorId: this.currentVendor._id,
            vendorName: this.currentVendor.name,
            product: product,
            total: product.price,
            items: [{
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: 1
            }]
        };

        this.renderOrderForm();
        this.showPage('orderPage');
    }

    renderOrderForm() {
        const orderForm = document.getElementById('orderForm');
        
        orderForm.innerHTML = `
            <div class="order-summary">
                <h3>Order Summary</h3>
                <div class="order-items">
                    <div class="order-item-row">
                        <span>${this.currentOrder.product.name}</span>
                        <span>₹${this.currentOrder.product.price}</span>
                    </div>
                </div>
                <div class="order-total">
                    Total: ₹${this.currentOrder.total}
                </div>
            </div>

            <form id="customerOrderForm">
                <div class="form-group">
                    <label for="customerName">Your Name</label>
                    <input type="text" id="customerName" required>
                </div>
                
                <div class="form-group">
                    <label for="customerPhone">Phone Number</label>
                    <input type="tel" id="customerPhone" required>
                </div>
                
                <div class="form-group">
                    <label for="customerAddress">Delivery Address (Optional)</label>
                    <textarea id="customerAddress" rows="3" placeholder="Enter your address for delivery"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Payment Method</label>
                    <div class="payment-methods">
                        <div class="payment-method" data-method="razorpay">
                            <i class="fas fa-credit-card"></i>
                            <p>Online Payment</p>
                            <small>Cards, UPI, Wallets</small>
                        </div>
                        <div class="payment-method" data-method="cash">
                            <i class="fas fa-money-bill-wave"></i>
                            <p>Cash on Delivery</p>
                            <small>Pay when you receive</small>
                        </div>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-check"></i>
                    Place Order
                </button>
            </form>
        `;

        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                this.currentOrder.paymentMethod = method.dataset.method;
            });
        });

        // Order form submission
        document.getElementById('customerOrderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processOrder();
        });
    }

    async processOrder() {
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const customerAddress = document.getElementById('customerAddress').value;
        
        if (!this.currentOrder.paymentMethod) {
            this.showError('Please select a payment method');
            return;
        }

        this.currentOrder.customerName = customerName;
        this.currentOrder.customerPhone = customerPhone;
        this.currentOrder.customerAddress = customerAddress;

        try {
            if (this.currentOrder.paymentMethod === 'razorpay') {
                await this.processOnlinePayment();
            } else {
                await this.completeOrder();
            }
        } catch (error) {
            console.error('Order processing failed:', error);
            this.showError('Failed to process order. Please try again.');
        }
    }

    async processOnlinePayment() {
        try {
            // Create payment with Razorpay
            const paymentData = await this.api.createPayment({
                amount: this.currentOrder.total,
                currency: 'INR',
                receipt: `order_${Date.now()}`,
                notes: {
                    vendorId: this.currentOrder.vendorId,
                    productId: this.currentOrder.product._id
                }
            });

            // Initialize Razorpay
            const options = {
                key: paymentData.keyId,
                amount: paymentData.amount,
                currency: paymentData.currency,
                name: 'VendorGo',
                description: `Order from ${this.currentOrder.vendorName}`,
                order_id: paymentData.orderId,
                handler: async (response) => {
                    try {
                        // Verify payment
                        await this.api.verifyPayment(response.razorpay_payment_id, response.razorpay_signature);
                        this.currentOrder.paymentId = response.razorpay_payment_id;
                        this.currentOrder.paymentStatus = 'paid';
                        await this.completeOrder();
                    } catch (error) {
                        console.error('Payment verification failed:', error);
                        this.showError('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: this.currentOrder.customerName,
                    contact: this.currentOrder.customerPhone
                },
                theme: {
                    color: '#3498db'
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error('Payment initialization failed:', error);
            this.showError('Payment initialization failed. Please try again.');
        }
    }

    async completeOrder() {
        try {
            // Create order via API
            const orderData = {
                vendorId: this.currentOrder.vendorId,
                items: this.currentOrder.items,
                customerInfo: {
                    name: this.currentOrder.customerName,
                    phone: this.currentOrder.customerPhone,
                    address: this.currentOrder.customerAddress
                },
                paymentMethod: this.currentOrder.paymentMethod,
                paymentStatus: this.currentOrder.paymentStatus || 'pending',
                paymentId: this.currentOrder.paymentId,
                total: this.currentOrder.total
            };

            const order = await this.api.createOrder(orderData);
            this.currentOrder.id = order._id;
            this.currentOrder.orderNumber = order.orderNumber;

            // Show confirmation
            this.renderOrderConfirmation();
            this.showPage('confirmationPage');
        } catch (error) {
            console.error('Order creation failed:', error);
            this.showError('Failed to create order. Please try again.');
        }
    }

    renderOrderConfirmation() {
        const orderDetails = document.getElementById('orderDetails');
        
        orderDetails.innerHTML = `
            <div class="order-confirmation">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Order Placed Successfully!</h3>
                <div class="order-summary">
                    <p><strong>Order Number:</strong> #${this.currentOrder.orderNumber}</p>
                    <p><strong>Vendor:</strong> ${this.currentOrder.vendorName}</p>
                    <p><strong>Product:</strong> ${this.currentOrder.product.name}</p>
                    <p><strong>Total:</strong> ₹${this.currentOrder.total}</p>
                    <p><strong>Payment:</strong> ${this.currentOrder.paymentMethod === 'razorpay' ? 'Online (Paid)' : 'Cash on Delivery'}</p>
                    <p><strong>Status:</strong> <span class="status-badge">Order Confirmed</span></p>
                </div>
                <div class="notification-info" style="margin: 1rem 0; padding: 1rem; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #27ae60;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #27ae60;"><i class="fas fa-bell"></i> Notifications Sent!</h4>
                    <p style="margin: 0; font-size: 0.9rem;">📱 <strong>WhatsApp & SMS sent to:</strong> ${this.currentOrder.customerPhone}</p>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem;">🏪 <strong>Vendor notified at:</strong> ${this.currentVendor.phone}</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #666;">💡 Check your phone for order confirmation and updates!</p>
                </div>
                <div class="next-steps">
                    <h4>What's Next?</h4>
                    <ul>
                        <li>The vendor has been notified of your order</li>
                        <li>You'll receive updates via SMS/WhatsApp</li>
                        <li>Estimated preparation time: 15-30 minutes</li>
                        <li>Contact vendor: ${this.currentVendor.phone}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Vendor Management
    async handleVendorOnboarding() {
        const vendorData = {
            name: document.getElementById('vendorName').value,
            businessName: document.getElementById('vendorName').value, // Use same as name
            phone: document.getElementById('vendorPhone').value,
            category: document.getElementById('vendorCategory').value,
            location: document.getElementById('vendorLocation').value,
            role: 'vendor', // Add role field
            password: 'defaultpassword123' // Add default password
        };

        try {
            // Register vendor via API
            const result = await this.api.register(vendorData, 'vendor');
            
            // Show dashboard
            this.showPage('dashboardPage');
            await this.renderVendorDashboard();

            // Refresh map
            await this.loadInitialData();
            this.renderVendorMarkers();

            this.showSuccess('Welcome to VendorGo! Your digital store is now live.');
        } catch (error) {
            console.error('Vendor onboarding failed:', error);
            this.showError('Failed to create vendor account. Please try again.');
        }
    }

    async renderVendorDashboard() {
        console.log('renderVendorDashboard called');
        console.log('Authentication status:', this.api.isAuthenticated());
        console.log('Is vendor:', this.api.isVendor());
        console.log('Current user:', this.api.user);
        
        if (!this.api.isAuthenticated() || !this.api.isVendor()) {
            console.log('User not authenticated or not a vendor');
            const vendorProfile = document.getElementById('vendorProfile');
            if (vendorProfile) {
                vendorProfile.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Please log in as a vendor to view dashboard</p>
                        <button class="btn btn-primary" onclick="app.toggleMode()">Switch to Vendor Mode</button>
                    </div>
                `;
            }
            return;
        }

        try {
            // Get vendor profile
            console.log('Loading vendor profile...');
            const profile = await this.api.getProfile();
            console.log('Profile loaded:', profile);
            
            // Get analytics with fallback
            let analytics;
            try {
                analytics = await this.api.getVendorAnalytics(profile._id || profile.id);
                console.log('Analytics loaded:', analytics);
            } catch (error) {
                console.log('Analytics failed, using fallback data:', error.message);
                analytics = {
                    orders: { totalOrders: 0, totalRevenue: 0 },
                    rating: 4.0,
                    profile: { views: 0 }
                };
            }

            // Render profile
            const vendorProfile = document.getElementById('vendorProfile');
            if (vendorProfile) {
                vendorProfile.innerHTML = `
                    <div class="vendor-profile-card">
                        <h3>${profile.name || 'Vendor Name'}</h3>
                        <p><strong>Phone:</strong> ${profile.phone || 'N/A'}</p>
                        <p><strong>Category:</strong> ${this.getCategoryName(profile.category || 'other')}</p>
                        <p><strong>Location:</strong> ${profile.location?.address?.street || profile.location || 'Location not set'}</p>
                        <div class="status-toggle">
                            <label class="switch">
                                <input type="checkbox" ${profile.isCurrentlyOpen ? 'checked' : ''} onchange="app.toggleVendorStatus()">
                                <span class="slider"></span>
                            </label>
                            <span>${profile.isCurrentlyOpen ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                    
                    <div class="analytics-cards">
                        <div class="analytics-card">
                            <div class="metric-value">${analytics.orders?.totalOrders || 0}</div>
                            <div class="metric-label">Total Orders</div>
                        </div>
                        <div class="analytics-card">
                            <div class="metric-value">₹${analytics.orders?.totalRevenue || 0}</div>
                            <div class="metric-label">Total Revenue</div>
                        </div>
                        <div class="analytics-card">
                            <div class="metric-value">${analytics.rating || 4.0}</div>
                            <div class="metric-label">Rating</div>
                        </div>
                        <div class="analytics-card">
                            <div class="metric-value">${analytics.profile?.views || 0}</div>
                            <div class="metric-label">Profile Views</div>
                        </div>
                    </div>
                `;
            } else {
                console.error('vendorProfile element not found');
            }

            // Render products and orders
            await this.renderVendorProducts();
            await this.renderVendorOrders();
        } catch (error) {
            console.error('Failed to load vendor dashboard:', error);
            
            // Show error in profile section
            const vendorProfile = document.getElementById('vendorProfile');
            if (vendorProfile) {
                vendorProfile.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load dashboard data</p>
                        <p style="font-size: 0.9rem; color: #e74c3c;">${error.message}</p>
                        <button class="btn btn-primary" onclick="app.renderVendorDashboard()">Retry</button>
                    </div>
                `;
            }
            
            this.showError('Failed to load dashboard data.');
        }
    }

    async renderVendorProducts() {
        console.log('renderVendorProducts called');
        if (!this.api.isAuthenticated() || !this.api.isVendor()) {
            console.log('User not authenticated or not a vendor for products');
            return;
        }

        try {
            console.log('Loading vendor products...');
            const profile = await this.api.getProfile();
            console.log('Profile for products:', profile);
            
            const vendorProducts = document.getElementById('vendorProducts');
            
            if (!vendorProducts) {
                console.error('vendorProducts element not found');
                return;
            }
            
            if (!profile.products || profile.products.length === 0) {
                console.log('No products found');
                vendorProducts.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box"></i>
                        <p>No products added yet</p>
                        <p style="font-size: 0.9rem; color: #7f8c8d;">Add your first product to start selling online</p>
                    </div>
                `;
                return;
            }

            console.log('Rendering', profile.products.length, 'products');
            vendorProducts.innerHTML = `
                <div class="product-grid">
                    ${profile.products.map(product => `
                        <div class="product-card">
                            ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-image" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;">` : ''}
                            <div class="product-header">
                                <span class="product-name">${product.name}</span>
                                <span class="product-price">₹${product.price}</span>
                            </div>
                            <p class="product-description">${product.description || 'No description'}</p>
                            <div class="product-actions">
                                <button class="btn btn-sm ${product.available ? 'btn-success' : 'btn-secondary'}" 
                                        onclick="app.toggleProductAvailability('${product._id}')">
                                    <i class="fas fa-circle"></i>
                                    ${product.available ? 'Available' : 'Unavailable'}
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="window.app && window.app.editProduct ? window.app.editProduct('${product._id}') : alert('Edit function not available')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="app.deleteProduct('${product._id}', '${product.name}')" title="Delete this product permanently">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Failed to load vendor products:', error);
            const vendorProducts = document.getElementById('vendorProducts');
            if (vendorProducts) {
                vendorProducts.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load products</p>
                        <p style="font-size: 0.9rem; color: #e74c3c;">${error.message}</p>
                        <button class="btn btn-primary" onclick="app.renderVendorProducts()">Retry</button>
                    </div>
                `;
            }
        }
    }

    async renderVendorOrders() {
        console.log('renderVendorOrders called');
        if (!this.api.isAuthenticated() || !this.api.isVendor()) {
            console.log('User not authenticated or not a vendor for orders');
            return;
        }

        try {
            console.log('Loading vendor orders...');
            let orders = [];
            try {
                const ordersResponse = await this.api.getOrders({ vendor: true });
                orders = ordersResponse.orders || ordersResponse || [];
                console.log('Orders loaded:', orders);
            } catch (error) {
                console.log('Orders API failed, using empty array:', error.message);
                orders = [];
            }
            
            const vendorOrders = document.getElementById('vendorOrders');
            if (!vendorOrders) {
                console.error('vendorOrders element not found');
                return;
            }
            
            if (orders.length === 0) {
                vendorOrders.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <p>No orders yet</p>
                        <p style="font-size: 0.9rem; color: #7f8c8d;">Orders will appear here when customers place them</p>
                    </div>
                `;
                return;
            }

            console.log('Rendering', orders.length, 'orders');
            vendorOrders.innerHTML = orders.map(order => `
                <div class="order-item">
                    <div class="order-header">
                        <span><strong>Order #${order.orderNumber || order._id}</strong></span>
                        <span class="order-status ${order.status}">${order.status}</span>
                    </div>
                    <p><strong>Customer:</strong> ${order.customerInfo?.name || 'N/A'} (${order.customerInfo?.phone || 'N/A'})</p>
                    <p><strong>Items:</strong> ${order.items?.map(item => `${item.productName || item.name} x${item.quantity}`).join(', ') || 'N/A'}</p>
                    <p><strong>Total:</strong> ₹${order.total || 0}</p>
                    <p><strong>Payment:</strong> ${order.payment?.method === 'razorpay' ? 'Online (Paid)' : 'Cash on Delivery'}</p>
                    <p><strong>Time:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</p>
                    ${order.customerInfo?.address ? `<p><strong>Address:</strong> ${order.customerInfo.address}</p>` : ''}
                    
                    <div class="order-actions">
                        ${order.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="app.updateOrderStatus('${order._id}', 'accepted')">
                                <i class="fas fa-check"></i> Accept
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.updateOrderStatus('${order._id}', 'rejected')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                        ${order.status === 'accepted' ? `
                            <button class="btn btn-sm btn-primary" onclick="app.updateOrderStatus('${order._id}', 'preparing')">
                                <i class="fas fa-clock"></i> Start Preparing
                            </button>
                        ` : ''}
                        ${order.status === 'preparing' ? `
                            <button class="btn btn-sm btn-success" onclick="app.updateOrderStatus('${order._id}', 'ready')">
                                <i class="fas fa-check-circle"></i> Mark Ready
                            </button>
                        ` : ''}
                        ${order.status === 'ready' ? `
                            <button class="btn btn-sm btn-primary" onclick="app.updateOrderStatus('${order._id}', 'completed')">
                                <i class="fas fa-handshake"></i> Mark Completed
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load vendor orders:', error);
            const vendorOrders = document.getElementById('vendorOrders');
            if (vendorOrders) {
                vendorOrders.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load orders</p>
                        <p style="font-size: 0.9rem; color: #e74c3c;">${error.message}</p>
                        <button class="btn btn-primary" onclick="app.renderVendorOrders()">Retry</button>
                    </div>
                `;
            }
        }
    }

    async addProduct() {
        if (!this.api.isAuthenticated() || !this.api.isVendor()) return;

        const form = document.getElementById('addProductForm');
        const editingProductId = form.dataset.editingProductId;
        const isEditing = !!editingProductId;
        
        const formData = new FormData();
        
        // Add form fields
        formData.append('name', document.getElementById('productName').value);
        formData.append('price', parseInt(document.getElementById('productPrice').value));
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('category', document.getElementById('productCategory')?.value || 'other');
        
        // Add image file if selected
        const imageFile = document.getElementById('productImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const profile = await this.api.getProfile();
            
            if (isEditing) {
                console.log('Updating product:', editingProductId);
                await this.api.updateProductWithImage(profile._id || profile.id, editingProductId, formData);
                this.showSuccess('Product updated successfully!');
            } else {
                console.log('Adding new product...');
                await this.api.addProductWithImage(profile._id || profile.id, formData);
                this.showSuccess('Product added successfully!');
            }

            // Re-render products
            await this.renderVendorProducts();

            // Reset form and modal
            this.resetProductForm();
            this.hideModal('addProductModal');

        } catch (error) {
            console.error('Failed to save product:', error);
            this.showError(`Failed to ${isEditing ? 'update' : 'add'} product. Please try again.`);
        }
    }

    resetProductForm() {
        const form = document.getElementById('addProductForm');
        form.reset();
        delete form.dataset.editingProductId;
        
        // Reset modal title and button text
        document.querySelector('#addProductModal .modal-header h3').textContent = 'Add New Product';
        document.querySelector('#addProductModal button[type="submit"]').textContent = 'Add Product';
    }

    async toggleProductAvailability(productId) {
        if (!this.api.isAuthenticated() || !this.api.isVendor()) return;

        try {
            const profile = await this.api.getProfile();
            const product = profile.products.find(p => p._id === productId);
            
            await this.api.updateProduct(profile._id || profile.id, productId, {
                available: !product.available
            });

            // Re-render products
            await this.renderVendorProducts();
        } catch (error) {
            console.error('Failed to toggle product availability:', error);
            this.showError('Failed to update product. Please try again.');
        }
    }

    async deleteProduct(productId, productName) {
        if (!this.api.isAuthenticated() || !this.api.isVendor()) return;

        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone and the product will be removed from customer view immediately.`);
        
        if (!confirmed) {
            return;
        }

        try {
            const profile = await this.api.getProfile();
            
            await this.api.deleteProduct(profile._id || profile.id, productId);

            // Re-render products to reflect the deletion
            await this.renderVendorProducts();
            
            // Also refresh the discovery page if in customer mode to remove from customer view
            if (this.currentMode === 'customer') {
                await this.loadInitialData();
                this.renderVendorCards();
            }

        } catch (error) {
            console.error('Failed to delete product:', error);
            this.showError('Failed to delete product. Please try again.');
        }
    }

    async editProduct(productId) {
        console.log('editProduct called with ID:', productId);
        
        if (!this.api.isAuthenticated() || !this.api.isVendor()) {
            console.error('User not authenticated or not a vendor');
            this.showError('Please log in as a vendor to edit products');
            return;
        }

        try {
            console.log('Loading vendor profile for product editing...');
            const profile = await this.api.getProfile();
            console.log('Profile loaded:', profile);
            
            if (!profile.products || profile.products.length === 0) {
                this.showError('No products found');
                return;
            }
            
            const product = profile.products.find(p => p._id === productId);
            console.log('Found product:', product);
            
            if (!product) {
                this.showError('Product not found');
                return;
            }

            // Pre-fill the form with existing product data
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productDescription').value = product.description || '';
            
            // Set category if element exists
            const categoryElement = document.getElementById('productCategory');
            if (categoryElement && product.category) {
                categoryElement.value = product.category;
            }
            
            // Change form title and button text
            const modalTitle = document.querySelector('#addProductModal .modal-header h3');
            const submitButton = document.querySelector('#addProductModal button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Edit Product';
            if (submitButton) submitButton.textContent = 'Update Product';
            
            // Store the product ID for updating
            const form = document.getElementById('addProductForm');
            if (form) {
                form.dataset.editingProductId = productId;
            }
            
            // Show the modal
            this.showModal('addProductModal');
            
            console.log('Edit product modal opened successfully');
        } catch (error) {
            console.error('Failed to load product for editing:', error);
            this.showError('Failed to load product details: ' + error.message);
        }
    }

    async toggleVendorStatus() {
        if (!this.api.isAuthenticated() || !this.api.isVendor()) return;

        try {
            // For demo purposes, let's make vendors online by default
            const profile = await this.api.getProfile();
            const newStatus = !profile.isCurrentlyOpen;
            
            await this.api.toggleVendorStatus(this.api.user.id || this.api.user._id);
            
            // Update local data
            if (this.currentVendor && this.currentVendor._id === profile._id) {
                this.currentVendor.isCurrentlyOpen = newStatus;
                this.renderStorefront(this.currentVendor);
            }
            
            await this.renderVendorDashboard();
            await this.loadInitialData();
            this.renderVendorCards();
            
            this.showSuccess(`Status updated to ${newStatus ? 'Online' : 'Offline'}`);
        } catch (error) {
            console.error('Failed to toggle vendor status:', error);
            this.showError('Failed to update status. Please try again.');
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            await this.api.updateOrderStatus(orderId, status);
            await this.renderVendorOrders();
            this.showSuccess(`Order status updated to ${status}`);
        } catch (error) {
            console.error('Failed to update order status:', error);
            this.showError('Failed to update order status. Please try again.');
        }
    }

    async logoutVendor() {
        try {
            await this.api.logout();
            this.showPage('onboardingPage');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Real-time event handlers
    handleNewOrder(orderData) {
        // Refresh orders if vendor is viewing dashboard
        if (this.currentMode === 'vendor' && this.api.isVendor()) {
            this.renderVendorOrders();
        }
    }

    handleOrderUpdate(orderData) {
        // Refresh orders
        if (this.currentMode === 'vendor' && this.api.isVendor()) {
            this.renderVendorOrders();
        }
    }

    // Utility functions
    getCategoryName(category) {
        const categories = {
            food: 'Food & Beverages',
            clothing: 'Clothing & Fashion',
            electronics: 'Electronics & Gadgets',
            accessories: 'Accessories & Others'
        };
        return categories[category] || category;
    }

    showError(message) {
        this.api.showNotification('Error', message, 'error');
    }

    showSuccess(message) {
        this.api.showNotification('Success', message, 'success');
    }

    // Debug helper function
    debugDashboard() {
        console.log('=== DASHBOARD DEBUG INFO ===');
        console.log('Authentication:', this.api.isAuthenticated());
        console.log('Is Vendor:', this.api.isVendor());
        console.log('Current User:', this.api.user);
        console.log('Current Mode:', this.currentMode);
        
        const elements = ['vendorProfile', 'vendorProducts', 'vendorOrders'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`Element ${id}:`, element ? 'Found' : 'Missing');
            if (element) {
                console.log(`  Content length: ${element.innerHTML.length}`);
            }
        });
        
        // Test API endpoints
        if (this.api.isAuthenticated()) {
            this.api.getProfile().then(profile => {
                console.log('Profile API test:', profile);
            }).catch(error => {
                console.log('Profile API error:', error.message);
            });
        }
        
        console.log('=== END DEBUG INFO ===');
    }

    // Order History functionality
    async lookupOrders() {
        const phoneInput = document.getElementById('orderPhoneInput');
        const phone = phoneInput.value.trim();
        
        if (!phone || phone.length < 8) {
            this.showError('Please enter a valid phone number');
            return;
        }

        try {
            const response = await this.api.getOrdersByPhone(phone);
            this.renderOrderHistory(response.orders);
        } catch (error) {
            console.error('Failed to lookup orders:', error);
            this.showError('Failed to find orders. Please check your phone number.');
        }
    }

    renderOrderHistory(orders) {
        const orderHistoryContent = document.getElementById('orderHistoryContent');
        
        if (!orders || orders.length === 0) {
            orderHistoryContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No orders found for this phone number</p>
                    <p style="font-size: 0.9rem; color: #7f8c8d;">Make sure you entered the correct phone number</p>
                </div>
            `;
            return;
        }

        orderHistoryContent.innerHTML = `
            <div class="order-history-list">
                <h3>Found ${orders.length} order${orders.length > 1 ? 's' : ''}</h3>
                ${orders.map(order => `
                    <div class="order-history-item">
                        <div class="order-header">
                            <div>
                                <h4>Order #${order.orderNumber}</h4>
                                <p class="order-date">${new Date(order.createdAt).toLocaleDateString()} at ${new Date(order.createdAt).toLocaleTimeString()}</p>
                            </div>
                            <div class="order-status">
                                <span class="status-badge status-${order.status}">${this.getStatusDisplayName(order.status)}</span>
                            </div>
                        </div>
                        
                        <div class="order-details">
                            <div class="vendor-info">
                                <strong>Vendor:</strong> ${order.vendor?.name || 'Unknown Vendor'}
                                ${order.vendor?.phone ? `<br><strong>Contact:</strong> ${order.vendor.phone}` : ''}
                            </div>
                            
                            <div class="order-items">
                                <strong>Items:</strong>
                                <ul>
                                    ${order.items.map(item => `
                                        <li>${item.productName} x${item.quantity} - ₹${item.subtotal}</li>
                                    `).join('')}
                                </ul>
                            </div>
                            
                            <div class="order-summary">
                                <div class="order-total"><strong>Total: ₹${order.total}</strong></div>
                                <div class="payment-info">Payment: ${order.payment?.method === 'cash' ? 'Cash on Delivery' : order.payment?.method || 'Unknown'}</div>
                            </div>
                        </div>
                        
                        ${order.status === 'placed' || order.status === 'confirmed' ? `
                            <div class="order-actions">
                                <button class="btn btn-sm btn-secondary" onclick="app.trackOrder('${order._id}')">
                                    <i class="fas fa-map-marker-alt"></i> Track Order
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="app.contactVendor('${order.vendor?.phone || ''}')">
                                    <i class="fas fa-phone"></i> Contact Vendor
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'placed': 'Order Placed',
            'confirmed': 'Confirmed',
            'preparing': 'Preparing',
            'ready': 'Ready for Pickup',
            'out_for_delivery': 'Out for Delivery',
            'delivered': 'Delivered',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded'
        };
        return statusNames[status] || status;
    }

    trackOrder(orderId) {
        this.showSuccess('Order tracking feature coming soon! You can contact the vendor directly for updates.');
    }

    contactVendor(phone) {
        if (phone) {
            window.open(`tel:${phone}`, '_self');
        } else {
            this.showError('Vendor contact information not available');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing VendorGo app...');
    
    // Add a small delay to ensure all scripts are loaded
    setTimeout(() => {
        try {
            console.log('Creating VendorGoApp instance...');
            window.app = new VendorGoApp();
            console.log('VendorGo app initialized successfully:', window.app);
        } catch (error) {
            console.error('Failed to initialize VendorGo app:', error);
            console.log('Attempting fallback initialization...');
            
            // Fallback: Create a minimal app object
            window.app = {
                viewVendorStorefront: function(vendorId) {
                    console.log('Fallback viewVendorStorefront called with:', vendorId);
                    alert('Vendor store functionality is temporarily unavailable. Please refresh the page.');
                }
            };
        }
    }, 500);
    
    // Global debug function
    window.debugVendorGo = function() {
        if (window.app) {
            if (typeof window.app.debugDashboard === 'function') {
                window.app.debugDashboard();
            } else {
                console.log('App exists but debugDashboard method not available');
            }
        } else {
            console.log('VendorGo app not initialized');
        }
    };
    
    // Global function to manually trigger dashboard refresh
    window.refreshDashboard = function() {
        if (window.app && window.app.api && typeof window.app.api.isVendor === 'function' && window.app.api.isVendor()) {
            console.log('Manually refreshing dashboard...');
            if (typeof window.app.renderVendorDashboard === 'function') {
                window.app.renderVendorDashboard();
            }
        } else {
            console.log('Not a vendor or app not initialized');
        }
    };
    
    console.log('All global functions registered');
});