const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  variant: {
    name: String,
    price: Number
  },
  specialInstructions: String,
  subtotal: {
    type: Number,
    required: true
  }
});

const deliverySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: true
  },
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    coordinates: [Number] // [longitude, latitude]
  },
  instructions: String,
  estimatedTime: Date,
  actualTime: Date,
  deliveryFee: {
    type: Number,
    default: 0
  },
  deliveryPartner: {
    name: String,
    phone: String,
    vehicleNumber: String
  }
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet', 'netbanking'],
    required: true
  },
  provider: String, // 'razorpay', 'paytm', 'gpay', etc.
  transactionId: String,
  gatewayOrderId: String,
  gatewayPaymentId: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paidAt: Date,
  refundedAt: Date,
  refundAmount: Number,
  failureReason: String
});

const orderTrackingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'placed',           // Order placed by customer
      'confirmed',        // Confirmed by vendor
      'preparing',        // Being prepared
      'ready',           // Ready for pickup/delivery
      'out_for_delivery', // Out for delivery (delivery orders only)
      'delivered',        // Delivered/Picked up
      'completed',        // Order completed
      'cancelled',        // Cancelled
      'refunded'         // Refunded
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: String,
  updatedBy: {
    type: String,
    enum: ['customer', 'vendor', 'system', 'admin'],
    default: 'system'
  }
});

const orderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Parties Involved
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false // Allow guest orders without customer account
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  
  // Order Details
  items: [orderItemSchema],
  
  // Pricing
  subtotal: {
    type: Number,
    required: true
  },
  taxes: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  discount: {
    amount: { type: Number, default: 0 },
    code: String,
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'free_delivery']
    }
  },
  total: {
    type: Number,
    required: true
  },
  
  // Customer Information
  customerInfo: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String
  },
  
  // Delivery Information
  delivery: deliverySchema,
  
  // Payment Information
  payment: paymentSchema,
  
  // Order Status and Tracking
  status: {
    type: String,
    enum: [
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'completed',
      'cancelled',
      'refunded'
    ],
    default: 'placed'
  },
  tracking: [orderTrackingSchema],
  
  // Timing
  placedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  estimatedReadyTime: Date,
  actualReadyTime: Date,
  deliveredAt: Date,
  completedAt: Date,
  
  // Special Instructions
  specialInstructions: String,
  vendorNotes: String,
  
  // Communication
  messages: [{
    from: {
      type: String,
      enum: ['customer', 'vendor', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  
  // Review and Rating
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    images: [String],
    reviewedAt: Date
  },
  
  // Cancellation
  cancellation: {
    reason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'vendor', 'system', 'admin']
    },
    cancelledAt: Date,
    refundStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'processed', 'failed']
    }
  },
  
  // Source and Channel
  source: {
    type: String,
    enum: ['web', 'mobile_app', 'whatsapp', 'phone', 'walk_in'],
    default: 'web'
  },
  channel: {
    type: String,
    enum: ['direct', 'platform', 'aggregator'],
    default: 'platform'
  },
  
  // Analytics
  analytics: {
    preparationTime: Number, // in minutes
    deliveryTime: Number,    // in minutes
    customerSatisfaction: Number,
    vendorRating: Number
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ placedAt: -1 });
orderSchema.index({ 'payment.status': 1 });

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Date.now() - this.placedAt.getTime();
});

// Virtual for is recent
orderSchema.virtual('isRecent').get(function() {
  const oneHour = 60 * 60 * 1000;
  return this.orderAge < oneHour;
});

// Virtual for can be cancelled
orderSchema.virtual('canBeCancelled').get(function() {
  const cancellableStatuses = ['placed', 'confirmed'];
  return cancellableStatuses.includes(this.status);
});

// Virtual for is active
orderSchema.virtual('isActive').get(function() {
  const activeStatuses = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
  return activeStatuses.includes(this.status);
});

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    this.orderNumber = `VG${year}${month}${day}${random}`;
  }
  next();
});

// Pre-save middleware to add tracking entry
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.tracking.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: 'system'
    });
    
    // Update timing fields based on status
    switch (this.status) {
      case 'confirmed':
        this.confirmedAt = new Date();
        break;
      case 'ready':
        this.actualReadyTime = new Date();
        break;
      case 'delivered':
        this.deliveredAt = new Date();
        break;
      case 'completed':
        this.completedAt = new Date();
        break;
    }
  }
  next();
});

// Method to update status
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = 'system') {
  this.status = newStatus;
  this.tracking.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });
  
  return this.save();
};

// Method to add message
orderSchema.methods.addMessage = function(from, message) {
  this.messages.push({
    from,
    message,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to cancel order
orderSchema.methods.cancelOrder = function(reason, cancelledBy = 'customer') {
  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date(),
    refundStatus: this.payment.status === 'completed' ? 'pending' : 'not_applicable'
  };
  
  this.tracking.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: `Cancelled: ${reason}`,
    updatedBy: cancelledBy
  });
  
  return this.save();
};

// Method to calculate preparation time
orderSchema.methods.calculatePreparationTime = function() {
  if (this.confirmedAt && this.actualReadyTime) {
    this.analytics.preparationTime = Math.round(
      (this.actualReadyTime - this.confirmedAt) / (1000 * 60)
    );
  }
};

// Method to calculate delivery time
orderSchema.methods.calculateDeliveryTime = function() {
  if (this.actualReadyTime && this.deliveredAt) {
    this.analytics.deliveryTime = Math.round(
      (this.deliveredAt - this.actualReadyTime) / (1000 * 60)
    );
  }
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(vendorId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        vendor: new mongoose.Types.ObjectId(vendorId),
        placedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' },
        completedOrders: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        cancelledOrders: {
          $sum: {
            $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Static method to get popular items
orderSchema.statics.getPopularItems = function(vendorId, limit = 10) {
  return this.aggregate([
    { $match: { vendor: new mongoose.Types.ObjectId(vendorId) } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);