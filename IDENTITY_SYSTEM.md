# VendorGo Identity & Authentication System

## Overview
VendorGo uses **implicit, channel-based identity** with NO traditional authentication (no passwords, no login screens, no signup flows).

## Identity Model

### Vendor Identity
- **Identity Source**: WhatsApp phone number
- **Authentication**: Delegated to WhatsApp platform
- **Access Method**: Send message from WhatsApp number
- **Vendor ID**: Generated from `hash(phone_number + platform_secret)`

#### How It Works:
1. Vendor sends first WhatsApp message
2. System automatically creates vendor profile linked to phone number
3. Future messages from same number = authenticated vendor
4. No passwords, no login, no credentials stored

#### Vendor Capabilities:
- Add/update/delete products via WhatsApp
- Update business status (open/closed)
- Receive order notifications
- View store analytics

### Customer Identity
- **Identity Source**: Anonymous browsing
- **Authentication**: None required for browsing
- **Transaction Identity**: UPI payment system
- **Optional**: Phone number for order receipts only

#### How It Works:
1. Customer opens PWA (no login required)
2. Browse vendors and products anonymously
3. Place order with optional phone number
4. Payment via UPI (UPI provider handles authentication)
5. Order confirmation sent to phone (if provided)

## Role Determination

Roles are **inferred from entry point**, never selected:

| Entry Point | Role | Authentication |
|-------------|------|----------------|
| WhatsApp Interface | Vendor | WhatsApp platform |
| Web PWA | Customer | Anonymous |
| UPI Payment | Transaction-level | UPI provider |

## Security Principles

1. **Minimize Stored Data**: No passwords, no email verification
2. **Delegate Authentication**: WhatsApp and UPI handle auth
3. **Rate Limiting**: Basic abuse detection
4. **Phone-Based Identity**: Unique, verifiable, no credentials

## What's Forbidden

❌ Login screens
❌ Signup flows  
❌ Email/password systems
❌ OTP authentication
❌ Role selection UI
❌ Vendor/customer dashboards with login
❌ User profile management UI

## API Design

### Vendor Endpoints (No Auth Required)
```
POST   /api/vendors              - Create vendor (from WhatsApp)
GET    /api/vendors/:id          - Get vendor details
PUT    /api/vendors/:id          - Update vendor (phone-based identity)
POST   /api/vendors/:id/products - Add product
DELETE /api/vendors/:id/products/:productId - Delete product
```

### Customer Endpoints (Anonymous)
```
GET    /api/vendors              - Browse vendors
GET    /api/vendors/nearby       - Find nearby vendors
POST   /api/orders               - Place order (optional phone)
GET    /api/orders/:id           - Track order (by order ID)
```

## Implementation Details

### Vendor Creation Flow
```javascript
// WhatsApp message received
const phone = message.from; // e.g., "+919876543210"

// Check if vendor exists
let vendor = await Vendor.findOne({ phone });

if (!vendor) {
  // Create new vendor (implicit registration)
  vendor = new Vendor({
    phone: phone,
    name: extractedName,
    products: extractedProducts,
    isVerified: true, // WhatsApp authenticated
    onboardingSource: 'whatsapp'
  });
  await vendor.save();
}

// Vendor is now authenticated via phone number
```

### Customer Order Flow
```javascript
// No authentication required
const order = {
  vendor: vendorId,
  items: cartItems,
  customerPhone: optionalPhone, // For receipt only
  paymentMethod: 'upi',
  status: 'pending'
};

await Order.create(order);

// Generate UPI payment link
const upiLink = generateUPILink(order);

// Customer completes payment via UPI app
// UPI provider handles authentication
```

## Benefits

1. **Zero Friction**: No signup barriers for vendors or customers
2. **Platform Trust**: Leverage WhatsApp and UPI authentication
3. **Privacy**: Minimal personal data stored
4. **Simplicity**: No password management, no forgot password flows
5. **Security**: Delegate auth to trusted platforms

## Migration Notes

If migrating from traditional auth:
1. Remove all password fields from database
2. Remove auth middleware from routes
3. Remove login/signup UI components
4. Update vendor creation to use phone-only
5. Make customer endpoints anonymous
6. Remove JWT token generation/validation

## Testing

### Test Vendor Identity
```bash
# Simulate WhatsApp message
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+919876543210",
    "body": "I sell samosa 15 rupees"
  }'

# Vendor automatically created and authenticated
```

### Test Customer Flow
```bash
# Browse vendors (no auth)
curl http://localhost:3000/api/vendors

# Place order (no auth, optional phone)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "vendor": "vendor_id",
    "items": [{"product": "product_id", "quantity": 2}],
    "customerPhone": "+919876543211"
  }'
```

## Compliance

- **GDPR**: Minimal data collection, easy deletion
- **Data Minimization**: Only store essential business data
- **Right to be Forgotten**: Delete vendor by phone number
- **Transparency**: Clear about what data is stored

---

**Remember**: If you find yourself adding a login screen, password field, or role selection UI, you're violating the design principles. Stop and reconsider.
