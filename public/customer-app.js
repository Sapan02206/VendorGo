// VendorGo Customer PWA - Location-First Vendor Discovery
class VendorGoCustomerApp {
    constructor() {
        this.userLocation = null;
        this.map = null;
        this.vendors = [];
        this.markers = [];
        
        this.init();
    }
    
    async init() {
        console.log('🚀 VendorGo Customer App initializing...');
        
        // Initialize map
        this.initMap();
        
        // Get user location
        await this.getUserLocation();
        
        // Load nearby vendors
        await this.loadNearbyVendors();
        
        console.log('✅ VendorGo Customer App ready!');
    }
    
    initMap() {
        // Initialize map with default location (Bangalore)
        this.map = L.map('map').setView([12.9716, 77.5946], 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        console.log('🗺️ Map initialized');
    }
    
    async getUserLocation() {
        const locationStatus = document.getElementById('locationStatus');
        
        if (!navigator.geolocation) {
            locationStatus.innerHTML = `
                <div style="color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Location not supported by your browser</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Showing vendors in Bangalore</p>
                </div>
            `;
            return;
        }
        
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
            
            // Update map to user location
            this.map.setView([this.userLocation.lat, this.userLocation.lng], 15);
            
            // Add user location marker
            L.marker([this.userLocation.lat, this.userLocation.lng])
                .addTo(this.map)
                .bindPopup('📍 You are here')
                .openPopup();
            
            locationStatus.innerHTML = `
                <div style="color: #27ae60;">
                    <i class="fas fa-map-marker-alt"></i>
                    <p><strong>Location found!</strong></p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Showing vendors within 1km</p>
                </div>
            `;
            
            console.log('📍 User location:', this.userLocation);
            
        } catch (error) {
            console.error('Location error:', error);
            
            locationStatus.innerHTML = `
                <div style="color: #f39c12;">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>Couldn't get your location</p>
                    <button class="location-btn" onclick="window.customerApp.getUserLocation()">
                        Try Again
                    </button>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem;">Showing vendors in Bangalore</p>
                </div>
            `;
        }
    }
    
    async loadNearbyVendors() {
        const vendorsList = document.getElementById('vendorsList');
        
        try {
            // Build API URL with location parameters
            let apiUrl = '/api/vendors';
            const params = new URLSearchParams();
            
            if (this.userLocation) {
                params.append('lat', this.userLocation.lat);
                params.append('lng', this.userLocation.lng);
                params.append('radius', '1000'); // 1km radius
            }
            
            if (params.toString()) {
                apiUrl += '?' + params.toString();
            }
            
            console.log('🔍 Loading vendors from:', apiUrl);
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            // Handle different response formats
            this.vendors = Array.isArray(data) ? data : (data.vendors || []);
            
            console.log('📊 Loaded vendors:', this.vendors.length);
            
            if (this.vendors.length === 0) {
                this.renderEmptyState();
            } else {
                this.renderVendorsList();
                this.renderVendorMarkers();
            }
            
        } catch (error) {
            console.error('Failed to load vendors:', error);
            vendorsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Couldn't load vendors</h3>
                    <p>Please check your connection and try again</p>
                    <button class="location-btn" onclick="window.customerApp.loadNearbyVendors()" style="margin-top: 1rem;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    renderEmptyState() {
        const vendorsList = document.getElementById('vendorsList');
        vendorsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-store-slash"></i>
                <h3>No vendors found nearby</h3>
                <p>Be the first to onboard vendors in your area!</p>
                <div style="margin-top: 1rem; padding: 1rem; background: #e8f4f8; border-radius: 8px;">
                    <p style="font-size: 0.9rem; color: #2980b9;">
                        <strong>Help vendors get online:</strong><br>
                        Share WhatsApp: <strong>+91-XXXXX-XXXXX</strong><br>
                        They just need to send "Hi" to get started!
                    </p>
                </div>
            </div>
        `;
    }
    
    renderVendorsList() {
        const vendorsList = document.getElementById('vendorsList');
        
        const vendorsHtml = this.vendors.map(vendor => {
            const distance = this.calculateDistance(vendor);
            const isOpen = vendor.isCurrentlyOpen || vendor.isOnline;
            
            return `
                <div class="vendor-card" onclick="window.customerApp.openStorefront('${vendor._id}')">
                    <div class="vendor-header">
                        <div class="vendor-name">${vendor.name}</div>
                        <div class="vendor-status ${isOpen ? 'status-open' : 'status-closed'}">
                            ${isOpen ? '🟢 Open' : '🔴 Closed'}
                        </div>
                    </div>
                    
                    <div class="vendor-info">
                        <div class="vendor-category">${this.getCategoryName(vendor.category)}</div>
                        <div class="vendor-distance">
                            <i class="fas fa-walking"></i>
                            ${distance}
                        </div>
                    </div>
                    
                    <div class="vendor-products">
                        <span class="product-count">${vendor.products?.length || 0} items</span>
                        ${vendor.products?.length > 0 ? 
                            ` • ${vendor.products.slice(0, 3).map(p => p.name).join(', ')}` +
                            (vendor.products.length > 3 ? '...' : '')
                            : ' • No items listed yet'
                        }
                    </div>
                    
                    ${vendor.createdVia === 'whatsapp' ? 
                        '<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #27ae60;"><i class="fab fa-whatsapp"></i> WhatsApp Verified</div>' 
                        : ''
                    }
                </div>
            `;
        }).join('');
        
        vendorsList.innerHTML = vendorsHtml;
    }
    
    renderVendorMarkers() {
        // Clear existing markers (except user location)
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        
        this.vendors.forEach(vendor => {
            if (vendor.location && vendor.location.coordinates) {
                const [lng, lat] = vendor.location.coordinates;
                const isOpen = vendor.isCurrentlyOpen || vendor.isOnline;
                
                // Create custom icon based on status
                const iconColor = isOpen ? 'green' : 'red';
                const icon = L.divIcon({
                    html: `<div style="background: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    className: 'custom-marker'
                });
                
                const marker = L.marker([lat, lng], { icon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="text-align: center; min-width: 150px;">
                            <h4 style="margin: 0 0 0.5rem 0;">${vendor.name}</h4>
                            <p style="margin: 0 0 0.5rem 0; color: #7f8c8d; font-size: 0.9rem;">
                                ${this.getCategoryName(vendor.category)}
                            </p>
                            <div style="margin: 0.5rem 0; font-size: 0.9rem;">
                                <span style="color: ${isOpen ? '#27ae60' : '#e74c3c'};">
                                    ${isOpen ? '🟢 Open Now' : '🔴 Closed'}
                                </span>
                            </div>
                            <button onclick="window.customerApp.openStorefront('${vendor._id}')" 
                                    style="background: #3498db; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                                View Store
                            </button>
                        </div>
                    `);
                
                this.markers.push(marker);
            }
        });
        
        // Fit map to show all vendors
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    async openStorefront(vendorId) {
        console.log('🏪 Opening storefront for vendor:', vendorId);
        
        try {
            // Find vendor in loaded data first
            let vendor = this.vendors.find(v => v._id === vendorId);
            
            // If not found, fetch from API
            if (!vendor) {
                const response = await fetch(`/api/vendors/${vendorId}`);
                vendor = await response.json();
            }
            
            if (!vendor) {
                alert('Vendor not found');
                return;
            }
            
            this.renderStorefront(vendor);
            
        } catch (error) {
            console.error('Failed to load vendor details:', error);
            alert('Failed to load vendor details. Please try again.');
        }
    }
    
    renderStorefront(vendor) {
        const modal = document.getElementById('storefrontModal');
        const title = document.getElementById('storefrontTitle');
        const content = document.getElementById('storefrontContent');
        
        title.textContent = vendor.name;
        
        const isOpen = vendor.isCurrentlyOpen || vendor.isOnline;
        const products = vendor.products || [];
        
        content.innerHTML = `
            <div class="storefront-header">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <h2 style="margin: 0;">${vendor.name}</h2>
                        <p style="color: #7f8c8d; margin: 0.5rem 0;">
                            ${this.getCategoryName(vendor.category)} • ${this.calculateDistance(vendor)}
                        </p>
                    </div>
                    <div class="vendor-status ${isOpen ? 'status-open' : 'status-closed'}">
                        ${isOpen ? '🟢 Open' : '🔴 Closed'}
                    </div>
                </div>
                
                ${vendor.createdVia === 'whatsapp' ? 
                    '<div style="background: #e8f5e8; padding: 0.8rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; color: #27ae60;"><i class="fab fa-whatsapp"></i> <strong>WhatsApp Verified Vendor</strong> - Authentic local business</div>' 
                    : ''
                }
            </div>
            
            <div class="products-section">
                <h3 style="margin-bottom: 1rem;">📦 Available Items</h3>
                
                ${products.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>No items available right now</p>
                        <p style="font-size: 0.9rem; color: #7f8c8d;">Check back later or contact the vendor</p>
                    </div>
                ` : `
                    <div class="product-grid">
                        ${products.filter(p => p.available !== false).map(product => `
                            <div class="product-card">
                                <div class="product-name">${product.name}</div>
                                <div class="product-price">₹${product.price}</div>
                                ${product.description ? `<p style="font-size: 0.9rem; color: #7f8c8d; margin-bottom: 1rem;">${product.description}</p>` : ''}
                                <button class="order-btn" 
                                        onclick="window.customerApp.orderProduct('${vendor._id}', '${product._id || product.name}', '${product.name}', ${product.price})"
                                        ${!isOpen ? 'disabled' : ''}>
                                    ${isOpen ? '🛒 Order Now' : 'Currently Closed'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            ${isOpen && products.length > 0 ? `
                <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; text-align: center;">
                    <p style="font-size: 0.9rem; color: #7f8c8d; margin-bottom: 0.5rem;">
                        💳 <strong>Quick Payment</strong> • 📱 <strong>No App Required</strong> • ⚡ <strong>Instant Confirmation</strong>
                    </p>
                </div>
            ` : ''}
        `;
        
        modal.classList.add('active');
    }
    
    async orderProduct(vendorId, productId, productName, price) {
        console.log('🛒 Ordering product:', { vendorId, productId, productName, price });
        
        // For demo, we'll simulate the order process
        const confirmed = confirm(`Order ${productName} for ₹${price}?\n\nThis will open UPI payment.`);
        
        if (!confirmed) return;
        
        try {
            // Create order
            const orderData = {
                vendorId: vendorId,
                items: [{
                    productId: productId,
                    name: productName,
                    price: price,
                    quantity: 1
                }],
                total: price,
                customerInfo: {
                    name: 'Customer', // In production, collect this
                    phone: '+91XXXXXXXXXX' // In production, collect this
                }
            };
            
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            const order = await response.json();
            
            if (response.ok) {
                // Generate UPI payment link
                this.initiatePayment(order);
            } else {
                throw new Error(order.error || 'Failed to create order');
            }
            
        } catch (error) {
            console.error('Order failed:', error);
            alert('Failed to place order. Please try again.');
        }
    }
    
    initiatePayment(order) {
        // Generate UPI payment intent
        const upiId = 'vendor@paytm'; // In production, use vendor's UPI ID
        const amount = order.total;
        const note = `VendorGo Order ${order.orderNumber}`;
        
        // Create UPI intent URL
        const upiUrl = `upi://pay?pa=${upiId}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;
        
        // For demo, show payment simulation
        const paymentHtml = `
            <div style="text-align: center; padding: 2rem;">
                <h3>💳 Payment</h3>
                <p><strong>Order:</strong> ${order.items[0].name}</p>
                <p><strong>Amount:</strong> ₹${amount}</p>
                <p><strong>Order ID:</strong> ${order.orderNumber}</p>
                
                <div style="margin: 2rem 0;">
                    <button onclick="window.open('${upiUrl}')" class="order-btn" style="margin-bottom: 1rem;">
                        📱 Pay with UPI
                    </button>
                    <br>
                    <button onclick="window.customerApp.simulatePaymentSuccess('${order._id}')" class="order-btn" style="background: #27ae60;">
                        ✅ Simulate Payment Success (Demo)
                    </button>
                </div>
                
                <p style="font-size: 0.9rem; color: #7f8c8d;">
                    In production, payment will be processed automatically
                </p>
            </div>
        `;
        
        document.getElementById('storefrontContent').innerHTML = paymentHtml;
    }
    
    async simulatePaymentSuccess(orderId) {
        try {
            // Simulate payment confirmation
            const response = await fetch(`/api/orders/${orderId}/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentId: 'demo_payment_' + Date.now(),
                    status: 'success'
                })
            });
            
            if (response.ok) {
                document.getElementById('storefrontContent').innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                        <h3 style="color: #27ae60;">Order Confirmed!</h3>
                        <p>Your order has been placed successfully.</p>
                        <p style="font-size: 0.9rem; color: #7f8c8d; margin-top: 1rem;">
                            The vendor has been notified via WhatsApp.<br>
                            You'll receive updates on your order status.
                        </p>
                        <button onclick="window.customerApp.closeStorefront()" class="order-btn" style="margin-top: 2rem;">
                            Continue Shopping
                        </button>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Payment confirmation failed:', error);
            alert('Payment confirmation failed. Please contact support.');
        }
    }
    
    closeStorefront() {
        document.getElementById('storefrontModal').classList.remove('active');
    }
    
    // Utility methods
    calculateDistance(vendor) {
        if (!this.userLocation || !vendor.location || !vendor.location.coordinates) {
            return 'Distance unknown';
        }
        
        const [vendorLng, vendorLat] = vendor.location.coordinates;
        const distance = this.getDistanceFromLatLonInKm(
            this.userLocation.lat, 
            this.userLocation.lng, 
            vendorLat, 
            vendorLng
        );
        
        if (distance < 1) {
            return `${Math.round(distance * 1000)}m away`;
        } else {
            return `${distance.toFixed(1)}km away`;
        }
    }
    
    getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // Distance in km
        return d;
    }
    
    deg2rad(deg) {
        return deg * (Math.PI/180);
    }
    
    getCategoryName(category) {
        const categories = {
            food: '🍽️ Food & Beverages',
            clothing: '👕 Clothing',
            electronics: '📱 Electronics',
            accessories: '💍 Accessories',
            services: '🔧 Services',
            other: '🏪 General Store'
        };
        return categories[category] || categories.other;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing VendorGo Customer App...');
    window.customerApp = new VendorGoCustomerApp();
    
    // Also set as global app for backward compatibility
    window.app = window.customerApp;
    
    // Make all functions globally available for onclick handlers
    window.openStorefront = (vendorId) => window.customerApp.openStorefront(vendorId);
    window.orderProduct = (vendorId, productId, productName, price) => 
        window.customerApp.orderProduct(vendorId, productId, productName, price);
    window.simulatePaymentSuccess = (orderId) => 
        window.customerApp.simulatePaymentSuccess(orderId);
    window.closeStorefront = () => window.customerApp.closeStorefront();
    window.getUserLocation = () => window.customerApp.getUserLocation();
    window.loadNearbyVendors = () => window.customerApp.loadNearbyVendors();
    
    console.log('✅ All customer functions registered globally');
});

// Service Worker for PWA (basic implementation)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}