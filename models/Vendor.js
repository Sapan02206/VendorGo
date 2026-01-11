const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['food', 'clothing', 'electronics', 'accessories', 'services', 'other'],
    default: 'other'
  },
  images: [{
    url: String,
    publicId: String,
    alt: String
  }],
  available: {
    type: Boolean,
    default: true
  },
  tags: [String],
  nutritionInfo: {
    calories: Number,
    isVeg: Boolean,
    isVegan: Boolean,
    allergens: [String]
  },
  variants: [{
    name: String,
    price: Number,
    available: Boolean
  }]
}, {
  timestamps: true
});

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function(coords) {
        return coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates'
    }
  },
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  }
});

const businessHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  openTime: String, // Format: "09:00"
  closeTime: String, // Format: "21:00"
  breaks: [{
    startTime: String,
    endTime: String,
    reason: String
  }]
});

const digitalPresenceSchema = new mongoose.Schema({
  totalOrders: {
    type: Number,
    default: 0
  },
  completedOrders: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  socialMedia: {
    whatsapp: String,
    facebook: String,
    instagram: String,
    website: String
  },
  seoData: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
});

const vendorSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(phone) {
        // Allow any phone number with 8-20 digits (after removing non-digits)
        const normalized = phone.replace(/\D/g, '');
        return normalized.length >= 8 && normalized.length <= 20;
      },
      message: 'Phone number must contain 8-20 digits'
    }
  },
  whatsappNumber: {
    type: String,
    validate: {
      validator: function(phone) {
        return !phone || /^(\+91|91)?[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
      },
      message: 'Invalid WhatsApp number'
    }
  },
  
  // Identity (implicit via WhatsApp - no passwords)
  isVerified: {
    type: Boolean,
    default: true // Auto-verified via WhatsApp authentication
  },
  
  // Business Details
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  businessType: {
    type: String,
    enum: ['street_vendor', 'shop', 'home_business', 'mobile_vendor', 'kiosk', 'other'],
    default: 'street_vendor'
  },
  category: {
    type: String,
    enum: ['food', 'clothing', 'electronics', 'accessories', 'services', 'other'],
    required: true
  },
  subCategory: String,
  description: {
    type: String,
    maxlength: 1000
  },
  
  // Location
  location: {
    type: locationSchema,
    required: true
  },
  serviceRadius: {
    type: Number,
    default: 5, // kilometers
    min: 0,
    max: 50
  },
  
  // Products
  products: [productSchema],
  
  // Business Operations
  businessHours: [businessHoursSchema],
  isCurrentlyOpen: {
    type: Boolean,
    default: false
  },
  acceptsOnlineOrders: {
    type: Boolean,
    default: true
  },
  deliveryOptions: {
    pickup: {
      type: Boolean,
      default: true
    },
    delivery: {
      type: Boolean,
      default: false
    },
    deliveryRadius: {
      type: Number,
      default: 2 // kilometers
    },
    deliveryFee: {
      type: Number,
      default: 0
    }
  },
  
  // Payment Methods
  paymentMethods: {
    cash: {
      type: Boolean,
      default: true
    },
    upi: {
      type: Boolean,
      default: false
    },
    cards: {
      type: Boolean,
      default: false
    },
    upiId: String,
    qrCode: String
  },
  
  // Digital Presence
  digitalPresence: digitalPresenceSchema,
  
  // Media
  profileImage: {
    url: String,
    publicId: String
  },
  coverImage: {
    url: String,
    publicId: String
  },
  businessImages: [{
    url: String,
    publicId: String,
    caption: String
  }],
  
  // Onboarding
  onboardingSource: {
    type: String,
    enum: ['whatsapp', 'web', 'mobile_app', 'referral', 'other'],
    default: 'web'
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingStep: {
    type: String,
    enum: ['basic_info', 'location', 'products', 'payment', 'completed'],
    default: 'basic_info'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  },
  
  // Analytics
  analytics: {
    profileViews: {
      type: Number,
      default: 0
    },
    searchAppearances: {
      type: Number,
      default: 0
    },
    clickThroughs: {
      type: Number,
      default: 0
    },
    lastActive: Date
  },
  
  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    features: [String]
  },
  
  // Compliance
  documents: [{
    type: {
      type: String,
      enum: ['aadhar', 'pan', 'gst', 'fssai', 'trade_license', 'other']
    },
    number: String,
    url: String,
    verified: {
      type: Boolean,
      default: false
    }
  }],
  
  // Communication Preferences
  notifications: {
    whatsapp: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
vendorSchema.index({ 'location.coordinates': '2dsphere' });
vendorSchema.index({ phone: 1 });
vendorSchema.index({ category: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ 'digitalPresence.rating.average': -1 });
vendorSchema.index({ createdAt: -1 });

// Virtual for store URL
vendorSchema.virtual('storeUrl').get(function() {
  return `${process.env.FRONTEND_URL}/store/${this._id}`;
});

// Virtual for average rating
vendorSchema.virtual('averageRating').get(function() {
  return this.digitalPresence?.rating?.average || 0;
});

// Virtual for total reviews
vendorSchema.virtual('totalReviews').get(function() {
  return this.digitalPresence?.rating?.count || 0;
});

// No password hashing needed - identity is implicit via WhatsApp

// Method to update rating
vendorSchema.methods.updateRating = function() {
  // Ensure digitalPresence and rating objects exist
  if (!this.digitalPresence) {
    this.digitalPresence = {};
  }
  if (!this.digitalPresence.rating) {
    this.digitalPresence.rating = { average: 0, count: 0 };
  }
  
  const reviews = this.digitalPresence.reviews || [];
  if (reviews.length === 0) {
    this.digitalPresence.rating.average = 0;
    this.digitalPresence.rating.count = 0;
  } else {
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    this.digitalPresence.rating.average = Math.round((sum / reviews.length) * 10) / 10;
    this.digitalPresence.rating.count = reviews.length;
  }
};

// Method to check if vendor is currently open
vendorSchema.methods.isOpen = function() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todayHours = this.businessHours.find(hours => hours.day === currentDay);
  
  if (!todayHours || !todayHours.isOpen) {
    return false;
  }
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
};

// Method to get distance from a point
vendorSchema.methods.getDistanceFrom = function(longitude, latitude) {
  const [vendorLng, vendorLat] = this.location.coordinates;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - vendorLat) * Math.PI / 180;
  const dLng = (longitude - vendorLng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(vendorLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

module.exports = mongoose.model('Vendor', vendorSchema);