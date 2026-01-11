const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  street: String,
  area: String,
  city: String,
  state: String,
  pincode: String,
  landmark: String,
  coordinates: {
    type: [Number], // [longitude, latitude]
    validate: {
      validator: function(coords) {
        return coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates'
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

const customerSchema = new mongoose.Schema({
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
        // Allow any phone number with 8-15 digits
        return /^\d{8,15}$/.test(phone.replace(/\s+/g, '').replace(/^\+91|^91/, ''));
      },
      message: 'Phone number must be 8-15 digits'
    }
  },
  
  // Authentication
  password: {
    type: String,
    minlength: 6
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Profile
  avatar: {
    url: String,
    publicId: String
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  
  // Addresses
  addresses: [addressSchema],
  
  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or'],
      default: 'en'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'jain', 'halal', 'kosher', 'gluten_free', 'dairy_free']
    }],
    favoriteCategories: [{
      type: String,
      enum: ['food', 'clothing', 'electronics', 'accessories', 'services', 'other']
    }],
    maxDeliveryDistance: {
      type: Number,
      default: 10 // kilometers
    },
    priceRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 1000
      }
    }
  },
  
  // Order History
  orderStats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    },
    cancelledOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    favoriteVendors: [{
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
      },
      orderCount: {
        type: Number,
        default: 0
      }
    }]
  },
  
  // Loyalty & Rewards
  loyalty: {
    points: {
      type: Number,
      default: 0
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    badges: [{
      name: String,
      description: String,
      earnedAt: Date,
      icon: String
    }]
  },
  
  // Payment Methods
  paymentMethods: [{
    type: {
      type: String,
      enum: ['upi', 'card', 'wallet', 'netbanking'],
      required: true
    },
    provider: String, // 'paytm', 'gpay', 'phonepe', 'visa', 'mastercard', etc.
    identifier: String, // UPI ID, last 4 digits of card, etc.
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Social Features
  social: {
    following: [{
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
      },
      followedAt: {
        type: Date,
        default: Date.now
      }
    }],
    reviews: [{
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
      },
      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: String,
      images: [String],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    referrals: {
      code: {
        type: String,
        unique: true,
        sparse: true
      },
      referred: [{
        customer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer'
        },
        joinedAt: Date,
        rewardEarned: Number
      }],
      totalRewards: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Communication Preferences
  notifications: {
    orderUpdates: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    newVendors: {
      type: Boolean,
      default: false
    },
    recommendations: {
      type: Boolean,
      default: true
    },
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
  },
  
  // Analytics & Behavior
  analytics: {
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    searchHistory: [{
      query: String,
      category: String,
      location: [Number],
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    viewedVendors: [{
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      viewCount: {
        type: Number,
        default: 1
      }
    }],
    deviceInfo: {
      platform: String, // 'web', 'android', 'ios'
      browser: String,
      version: String,
      userAgent: String
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },
  
  // Privacy Settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private'
    },
    shareLocation: {
      type: Boolean,
      default: true
    },
    shareOrderHistory: {
      type: Boolean,
      default: false
    },
    allowRecommendations: {
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
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ 'addresses.coordinates': '2dsphere' });
customerSchema.index({ 'analytics.lastLogin': -1 });
customerSchema.index({ status: 1 });

// Virtual for full name
customerSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for default address
customerSchema.virtual('defaultAddress').get(function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
});

// Virtual for loyalty tier benefits
customerSchema.virtual('tierBenefits').get(function() {
  const benefits = {
    bronze: { discount: 0, freeDelivery: false, prioritySupport: false },
    silver: { discount: 5, freeDelivery: false, prioritySupport: false },
    gold: { discount: 10, freeDelivery: true, prioritySupport: false },
    platinum: { discount: 15, freeDelivery: true, prioritySupport: true }
  };
  return benefits[this.loyalty.tier] || benefits.bronze;
});

// Pre-save middleware to hash password
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Pre-save middleware to generate referral code
customerSchema.pre('save', function(next) {
  if (this.isNew && !this.social.referrals.code) {
    this.social.referrals.code = this.name.replace(/\s+/g, '').toUpperCase().slice(0, 4) + 
                                 Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

// Method to compare password
customerSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to add address
customerSchema.methods.addAddress = function(addressData) {
  // If this is the first address or marked as default, make it default
  if (this.addresses.length === 0 || addressData.isDefault) {
    this.addresses.forEach(addr => addr.isDefault = false);
    addressData.isDefault = true;
  }
  
  this.addresses.push(addressData);
  return this.save();
};

// Method to update order stats
customerSchema.methods.updateOrderStats = function(orderAmount, vendorId) {
  this.orderStats.totalOrders += 1;
  this.orderStats.totalSpent += orderAmount;
  this.orderStats.averageOrderValue = this.orderStats.totalSpent / this.orderStats.totalOrders;
  
  // Update favorite vendor
  const favoriteVendor = this.orderStats.favoriteVendors.find(
    fv => fv.vendor.toString() === vendorId.toString()
  );
  
  if (favoriteVendor) {
    favoriteVendor.orderCount += 1;
  } else {
    this.orderStats.favoriteVendors.push({
      vendor: vendorId,
      orderCount: 1
    });
  }
  
  // Update loyalty points (1 point per rupee spent)
  this.loyalty.points += Math.floor(orderAmount);
  
  // Update loyalty tier based on total spent
  if (this.orderStats.totalSpent >= 50000) {
    this.loyalty.tier = 'platinum';
  } else if (this.orderStats.totalSpent >= 20000) {
    this.loyalty.tier = 'gold';
  } else if (this.orderStats.totalSpent >= 5000) {
    this.loyalty.tier = 'silver';
  }
  
  return this.save();
};

// Method to add review
customerSchema.methods.addReview = function(vendorId, orderId, rating, comment, images = []) {
  this.social.reviews.push({
    vendor: vendorId,
    order: orderId,
    rating,
    comment,
    images
  });
  
  return this.save();
};

// Method to follow vendor
customerSchema.methods.followVendor = function(vendorId) {
  const alreadyFollowing = this.social.following.some(
    f => f.vendor.toString() === vendorId.toString()
  );
  
  if (!alreadyFollowing) {
    this.social.following.push({ vendor: vendorId });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to unfollow vendor
customerSchema.methods.unfollowVendor = function(vendorId) {
  this.social.following = this.social.following.filter(
    f => f.vendor.toString() !== vendorId.toString()
  );
  
  return this.save();
};

// Method to get distance from a point
customerSchema.methods.getDistanceFrom = function(longitude, latitude, addressIndex = 0) {
  const address = this.addresses[addressIndex];
  if (!address || !address.coordinates) return null;
  
  const [customerLng, customerLat] = address.coordinates;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - customerLat) * Math.PI / 180;
  const dLng = (longitude - customerLng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(customerLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

module.exports = mongoose.model('Customer', customerSchema);