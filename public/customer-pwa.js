// VendorGo Customer PWA - Digital Presence Discovery
class VendorGoCustomer {
    constructor() {
        this.map = null;
        this.userLocation = null;
        this.vendors = [];
        this.markers = [];
        this.cart = [];
        this.currentVendor = null;
        this.selectedPaymentMethod = 'upi';
        
        this.init();
    }

    async init() {
        console.log('🏪 VendorGo Customer PWA initializing...');
        
        // Request location permission immediately
        await this.requestLocation();
        
        // Initialize map
        this.initializeMap();
        
        // Load nearby vendors
        await this.loadNearbyVendors();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Register service worker for PWA
        this.registerServiceWorker();
        
        console.log('✅ VendorGo Customer PWA ready');
    }

    async requestLocation() {
        const locationStatus = document.getElementById('locationStatus');
        locationStatus.style.display = 'block';
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                });
            });
            
            this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            locationStatus.innerHTML = '📍 Location found - discovering vendors...';
            console.log('📍 User location:', this.userLocation);
            
        } catch (error) {
            console.warn('Location access denied, using default location');
            // Default to Bangalore for demo
            this.userLocation = { lat: 12.9716, lng: 77.5946 };
            locationStatus.innerHTML = '📍 Using default location - Bangalore';
        }
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('map').setView([this.userLocation.lat, this.userLocation.lng], 15);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add user location marker
        L.marker([this.userLocation.lat, this.userLocation.lng])
            .addTo(this.map)
            .bindPopup('📍 You are here')
            .openPopup();
    }

    async loadNearbyVendors() {
        try {
            const response = await fetch(`/api/vendors?latitude=${this.userLocation.lat}&longitude=${this.userLocation.lng}&radius=2`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            this.vendors = data.vendors || [];
            console.log(`📍 Found ${this.vendors.length} nearby vendors`);
            
            // Add coordinates to vendors that don't have them
            this.vendors.forEach(vendor => {
                if (!vendor.lat || !vendor.lng) {
                    if (vendor.location && vendor.location.coordinates) {
                        vendor.lng = vendor.location.coordinates[0];
                        vendor.lat = vendor.location.coordinates[1];
                    } else {
                        // Default coordinates near user location
                        vendor.lat = this.userLocation.lat + (Math.random() - 0.5) * 0.01;
                        vendor.lng = this.userLocation.lng + (Math.random() - 0.5) * 0.01;
                    }
                }
            });
            
            this.renderVendorMarkers();
            this.renderVendorList();
            
            // Hide location status
            document.getElementById('locationStatus').style.display = 'none';
            
        } catch (error) {
            console.error('Failed to load vendors:', error);
            
            // Show fallback demo vendors
            this.vendors = [
                {
                    _id: 'demo1',
                    name: "Raj's Tea Stall",
                    category: 'food',
                    lat: this.userLocation.lat + 0.002,
                    lng: this.userLocation.lng + 0.002,
                    isCurrentlyOpen: true,
                    products: [
                        { _id: 'p1', name: 'Tea', price: 10, available: true },
                        { _id: 'p2', name: 'Samosa', price: 15, available: true }
                    ]
                },
                {
                    _id: 'demo2',
                    name: "Priya Fashion",
                    category: 'clothing',
                    lat: this.userLocation.lat - 0.003,
                    lng: this.userLocation.lng + 0.001,
                    isCurrentlyOpen: true,
                    products: [
                        { _id: 'p3', name: 'T-Shirt', price: 299, available: true },
                        { _id: 'p4', name: 'Jeans', price: 899, available: true }
                    ]
                }
            ];
            
            console.log('Using fallback demo vendors');
            this.renderVendorMarkers();
            this.renderVendorList();
            
            // Hide location status
            document.getElementById('locationStatus').style.display = 'none';
        }
    }

    renderVendorMarkers() {
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        this.vendors.forEach(vendor => {
            const isOpen = vendor.isCurrentlyOpen || vendor.isOnline;
            const icon = L.divIcon({
                html: `<div style="
                    background: ${isOpen ? '#25d366' : '#dc3545'};
                    color: white;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${this.getCategoryEmoji(vendor.category)}</div>`,
                className: 'vendor-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([vendor.lat, vendor.lng], { icon })
                .addTo(this.map)
                .bindPopup(`
                    <div style="text-align: center; min-width: 200px;">
                        <h4 style="margin: 0 0 0.5rem 0;">${vendor.name}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: #666;">
                            ${this.getCategoryName(vendor.category)} • 
                            ${this.calculateDistance(vendor)} away
                        </p>
                        <div style="margin: 0.5rem 0;">
                            <span style="
                                background: ${isOpen ? '#d4edda' : '#f8d7da'};
                                color: ${isOpen ? '#155724' : '#721c24'};
                                padding: 0.25rem 0.5rem;
                                border-radius: 12px;
                                font-size: 0.8rem;
                                font-weight: 500;
                            ">${isOpen ? '🟢 Open' : '🔴 Closed'}</span>
                        </div>
                        <button onclick="app.openStorefront('${vendor._id}')" style="
                            background: #25d366;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                            width: 100%;
                            margin-top: 0.5rem;
                        ">View Store</button>
                    </div>
                `);
            
            this.markers.push(marker);
        });
    }

    renderVendorList() {
        const vendorList = document.getElementById('vendorList');
        
        if (this.vendors.length === 0) {
            vendorList.innerHTML = `
                <div class="loading">
                    <p>No vendors found nearby</p>
                    <p style="font-size: 0.9rem; color: #6c757d;">Try expanding your search radius</p>
                </div>
            `;
            return;
        }

        vendorList.innerHTML = this.vendors.map(vendor => {
            const isOpen = vendor.isCurrentlyOpen || vendor.isOnline;
            return `
                <div class="vendor-card" onclick="app.openStorefront('${vendor._id}')">
                    <div class="vendor-header">
                        <div class="vendor-name">${vendor.name}</div>
                        <div class="vendor-status ${isOpen ? 'status-open' : 'status-closed'}">
                            ${isOpen ? '🟢 Open' : '🔴 Closed'}
                        </div>
                    </div>
                    <div class="vendor-info">
                        ${this.getCategoryName(vendor.category)} • 
                        <span class="vendor-distance">${this.calculateDistance(vendor)} away</span>
                    </div>
                    <div style="font-size: 0.9rem; color: #6c757d; margin-top: 0.5rem;">
                        ${vendor.products ? vendor.products.length : 0} items available
                    </div>
                </div>
            `;
        }).join('');
    }

    async openStorefront(vendorId) {
        try {
            const response = await fetch(`/api/vendors/${vendorId}`);
            const vendor = await response.json();
            
            this.currentVendor = vendor;
            this.renderStorefront(vendor);
            
            const modal = document.getElementById('storefrontModal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            
        } catch (error) {
            console.error('Failed to load vendor:', error);
            this.showError('Failed to load vendor details');
        }
    }

    renderStorefront(vendor) {
        document.getElementById('storefrontName').textContent = vendor.name;
        document.getElementById('storefrontInfo').textContent = 
            `${this.getCategoryName(vendor.category)} • ${this.calculateDistance(vendor)} away`;

        const productGrid = document.getElementById('productGrid');
        const availableProducts = vendor.products ? vendor.products.filter(p => p.available) : [];

        if (availableProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="loading">
                    <p>No products available</p>
                </div>
            `;
            return;
        }

        productGrid.innerHTML = availableProducts.map(product => `
            <div class="product-card">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <div class="product-price">₹${product.price}</div>
                </div>
                <button class="add-btn" onclick="app.addToCart('${product._id}', '${product.name}', ${product.price})">
                    Add
                </button>
            </div>
        `).join('');
    }

    addToCart(productId, productName, price) {
        const existingItem = this.cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                productId,
                productName,
                price,
                quantity: 1,
                vendorId: this.currentVendor._id,
                vendorName: this.currentVendor.name
            });
        }
        
        this.updateCartDisplay();
        
        // Show success feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#25d366';
        }, 1000);
    }

    updateCartDisplay() {
        const cartSummary = document.getElementById('cartSummary');
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (this.cart.length === 0) {
            cartSummary.style.display = 'none';
            return;
        }
        
        cartSummary.style.display = 'block';
        
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <span>${item.productName} x${item.quantity}</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `).join('');
        
        cartTotal.textContent = `Total: ₹${total}`;
        document.getElementById('finalTotal').textContent = total;
    }

    showOrderModal() {
        document.getElementById('orderModal').style.display = 'flex';
    }

    closeOrderModal() {
        document.getElementById('orderModal').style.display = 'none';
    }

    closeStorefront() {
        const modal = document.getElementById('storefrontModal');
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    async processOrder(formData) {
        try {
            const orderData = {
                vendorId: this.currentVendor._id,
                items: this.cart.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    price: item.price,
                    quantity: item.quantity
                })),
                customerInfo: {
                    phone: formData.get('phone')
                },
                paymentMethod: this.selectedPaymentMethod,
                total: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            const response = await fetch('/api/orders/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            
            if (response.ok) {
                if (this.selectedPaymentMethod === 'upi') {
                    this.processUPIPayment(result.order);
                } else {
                    this.showOrderSuccess(result.order);
                }
            } else {
                throw new Error(result.error || 'Order failed');
            }
            
        } catch (error) {
            console.error('Order processing failed:', error);
            this.showError('Failed to place order. Please try again.');
        }
    }

    processUPIPayment(order) {
        const vendor = this.currentVendor;
        const upiId = vendor.upiId || 'vendor@paytm'; // Demo UPI ID
        const amount = order.total;
        const note = `Order from ${vendor.name}`;
        
        // Generate UPI payment link
        const upiLink = `upi://pay?pa=${upiId}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;
        
        // For demo, show payment simulation
        if (confirm(`Pay ₹${amount} to ${vendor.name} via UPI?\n\nThis will open your UPI app.`)) {
            // In real implementation, this would open UPI app
            // window.location.href = upiLink;
            
            // For demo, simulate successful payment
            setTimeout(() => {
                this.showOrderSuccess(order);
            }, 2000);
        }
    }

    showOrderSuccess(order) {
        alert(`🎉 Order placed successfully!\n\nOrder ID: ${order.orderNumber}\nTotal: ₹${order.total}\n\nVendor has been notified via WhatsApp.`);
        
        // Clear cart and close modals
        this.cart = [];
        this.updateCartDisplay();
        this.closeOrderModal();
        this.closeStorefront();
    }

    setupEventListeners() {
        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                this.selectedPaymentMethod = method.dataset.method;
            });
        });

        // Order form submission
        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.processOrder(formData);
        });

        // Close modals on background click
        document.getElementById('storefrontModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeStorefront();
            }
        });

        document.getElementById('orderModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeOrderModal();
            }
        });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('✅ Service Worker registered'))
                .catch(err => console.log('❌ Service Worker registration failed:', err));
        }
    }

    // Utility methods
    calculateDistance(vendor) {
        if (!this.userLocation || !vendor.lat || !vendor.lng) return 'Unknown';
        
        const R = 6371; // Earth's radius in km
        const dLat = (vendor.lat - this.userLocation.lat) * Math.PI / 180;
        const dLng = (vendor.lng - this.userLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.userLocation.lat * Math.PI / 180) * Math.cos(vendor.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        if (distance < 1) {
            return `${Math.round(distance * 1000)}m`;
        } else {
            return `${distance.toFixed(1)}km`;
        }
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

    getCategoryEmoji(category) {
        const emojis = {
            food: '🍽️',
            clothing: '👕',
            electronics: '📱',
            accessories: '🛍️'
        };
        return emojis[category] || '🏪';
    }

    showError(message) {
        alert(`❌ ${message}`);
    }

    saveOrderToHistory(order) {
        const orderHistory = JSON.parse(localStorage.getItem('vendorgo_orders') || '[]');
        orderHistory.unshift({
            ...order,
            vendorName: this.currentVendor.name,
            orderDate: new Date().toISOString()
        });
        // Keep only last 50 orders
        if (orderHistory.length > 50) {
            orderHistory.splice(50);
        }
        localStorage.setItem('vendorgo_orders', JSON.stringify(orderHistory));
    }

    showUPIPaymentModal(order, upiLink) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3>💳 UPI Payment</h3>
                <div style="margin: 1.5rem 0;">
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <strong>Order #${order.orderNumber}</strong><br>
                        <span style="color: #25d366; font-size: 1.2rem; font-weight: bold;">₹${order.total}</span>
                    </div>
                    <p>Click the button below to pay via UPI:</p>
                    <button onclick="window.open('${upiLink}', '_blank')" 
                            style="background: #25d366; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; font-size: 1.1rem; margin: 1rem 0; cursor: pointer; width: 100%;">
                        📱 Pay with UPI
                    </button>
                    <p style="font-size: 0.9rem; color: #6c757d;">
                        After payment, click "Payment Completed" below
                    </p>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="confirmPayment('${order._id}', '${order.orderNumber}')" 
                            style="flex: 1; background: #28a745; color: white; border: none; padding: 0.75rem; border-radius: 6px; cursor: pointer;">
                        ✅ Payment Completed
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="flex: 1; background: #6c757d; color: white; border: none; padding: 0.75rem; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async refreshVendors() {
        console.log('🔄 Refreshing vendor list...');
        
        // Show loading indicator
        const vendorListEl = document.getElementById('vendorList');
        if (vendorListEl) {
            vendorListEl.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Refreshing vendors...</p>
                </div>
            `;
        }
        
        // Reload vendors from API
        await this.loadNearbyVendors();
        
        console.log('✅ Vendor list refreshed');
        alert(`✅ Refreshed! Found ${this.vendors.length} vendors nearby.`);
    }

    viewOrderHistory() {
        const orderHistory = JSON.parse(localStorage.getItem('vendorgo_orders') || '[]');
        
        const historyModal = document.createElement('div');
        historyModal.className = 'modal';
        historyModal.style.display = 'flex';
        
        if (orderHistory.length === 0) {
            historyModal.innerHTML = `
                <div class="modal-content">
                    <h3>📋 Order History</h3>
                    <div style="text-align: center; padding: 2rem; color: #6c757d;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                        <p>No orders yet</p>
                        <p style="font-size: 0.9rem;">Your order history will appear here</p>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="width: 100%; background: #6c757d; color: white; border: none; padding: 0.75rem; border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
        } else {
            const ordersList = orderHistory.map(order => `
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #25d366;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <div>
                            <strong>#${order.orderNumber}</strong><br>
                            <small style="color: #6c757d;">${order.vendorName}</small>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #25d366;">₹${order.total}</div>
                            <small style="color: #6c757d;">${new Date(order.orderDate).toLocaleDateString()}</small>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: #495057;">
                        ${order.items.map(item => `${item.productName} x${item.quantity}`).join(', ')}
                    </div>
                </div>
            `).join('');
            
            historyModal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; max-height: 80vh; overflow-y: auto;">
                    <h3>📋 Order History (${orderHistory.length})</h3>
                    <div style="margin: 1.5rem 0;">
                        ${ordersList}
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="width: 100%; background: #6c757d; color: white; border: none; padding: 0.75rem; border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
        }
        
        document.body.appendChild(historyModal);
    }
}

// View toggle functions (mobile)
function showMap() {
    document.querySelector('.map-container').style.display = 'block';
    document.querySelector('.vendor-list').style.display = 'none';
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showList() {
    document.querySelector('.map-container').style.display = 'none';
    document.querySelector('.vendor-list').style.display = 'block';
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VendorGoCustomer();
});

// Enhanced order processing functions
window.confirmPayment = function(orderId, orderNumber) {
    document.querySelector('.modal').remove();
    
    const order = {
        _id: orderId,
        orderNumber: orderNumber,
        total: window.app.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        paymentStatus: 'completed'
    };
    
    window.app.showOrderSuccess(order);
};

window.viewOrderHistory = function() {
    if (window.app) {
        window.app.viewOrderHistory();
    }
};