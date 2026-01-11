const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
  }

  async extractProductsFromText(text) {
    try {
      if (!text || text.trim().length === 0) {
        return [];
      }

      // First try simple regex patterns for quick extraction
      const products = this.extractWithRegex(text);
      
      if (products.length > 0) {
        return products;
      }

      // If OpenAI is available, use it for more complex extraction
      if (this.openai) {
        return await this.extractWithOpenAI(text);
      }

      // Fallback to basic parsing
      return this.extractWithBasicParsing(text);
    } catch (error) {
      logger.error('Error extracting products from text:', error);
      return [];
    }
  }

  extractWithRegex(text) {
    const products = [];
    
    // Common patterns for Indian pricing
    const patterns = [
      // "Samosa ₹15", "Tea Rs 10", "Burger - 45"
      /([a-zA-Z\s]+?)\s*[₹rs\.]*\s*(\d+)/gi,
      // "₹15 Samosa", "Rs 10 Tea"
      /[₹rs\.]*\s*(\d+)\s+([a-zA-Z\s]+)/gi,
      // "Samosa - 15 rupees"
      /([a-zA-Z\s]+?)\s*[-–]\s*(\d+)\s*(?:rupees?|rs|₹)?/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let name, price;
        
        if (pattern.source.includes('([a-zA-Z\\s]+?)')) {
          // Name first, then price
          name = match[1].trim();
          price = parseInt(match[2]);
        } else {
          // Price first, then name
          price = parseInt(match[1]);
          name = match[2].trim();
        }
        
        if (name.length > 1 && name.length < 50 && price > 0 && price < 10000) {
          // Clean up the name
          name = this.cleanProductName(name);
          
          if (name && !products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            products.push({
              name: name,
              price: price,
              description: this.generateDescription(name)
            });
          }
        }
      }
    });
    
    return products;
  }

  async extractWithOpenAI(text) {
    try {
      const prompt = `Extract food/product items and their prices from this text. Return only valid items with clear names and reasonable prices (₹1-₹10000).

Text: "${text}"

Return as JSON array with format: [{"name": "Product Name", "price": number, "description": "brief description"}]

Rules:
- Only include items that are clearly products/food
- Prices must be numbers between 1-10000
- Names should be 2-50 characters
- Generate brief, appetizing descriptions
- Return empty array if no clear products found`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      const result = response.choices[0].message.content.trim();
      
      // Try to parse JSON response
      try {
        const products = JSON.parse(result);
        if (Array.isArray(products)) {
          return products.filter(p => 
            p.name && p.price && 
            typeof p.name === 'string' && 
            typeof p.price === 'number' &&
            p.name.length >= 2 && p.name.length <= 50 &&
            p.price >= 1 && p.price <= 10000
          );
        }
      } catch (parseError) {
        logger.warn('Failed to parse OpenAI JSON response:', result);
      }
      
      return [];
    } catch (error) {
      logger.error('OpenAI extraction failed:', error);
      return this.extractWithBasicParsing(text);
    }
  }

  extractWithBasicParsing(text) {
    const products = [];
    const words = text.toLowerCase().split(/[,\n\r]+/);
    
    words.forEach(segment => {
      const trimmed = segment.trim();
      if (trimmed.length < 3) return;
      
      // Look for price indicators
      const priceMatch = trimmed.match(/(\d+)/);
      if (!priceMatch) return;
      
      const price = parseInt(priceMatch[1]);
      if (price < 1 || price > 10000) return;
      
      // Extract name (everything before the price)
      let name = trimmed.replace(/[₹rs\.\d\s-]+/gi, '').trim();
      name = this.cleanProductName(name);
      
      if (name && name.length >= 2 && name.length <= 50) {
        products.push({
          name: name,
          price: price,
          description: this.generateDescription(name)
        });
      }
    });
    
    return products;
  }

  async extractProductsFromImage(imageData) {
    try {
      // For production, you would use Google Vision API, AWS Rekognition, or OpenAI Vision
      // For now, return simulated results based on common street food items
      
      const commonProducts = [
        { name: 'Samosa', price: 15, description: 'Crispy fried samosa with spicy filling' },
        { name: 'Tea', price: 10, description: 'Hot masala tea' },
        { name: 'Coffee', price: 15, description: 'Fresh filter coffee' },
        { name: 'Sandwich', price: 30, description: 'Grilled vegetable sandwich' },
        { name: 'Burger', price: 50, description: 'Veg burger with fresh ingredients' },
        { name: 'Pizza Slice', price: 40, description: 'Cheese pizza slice' },
        { name: 'Dosa', price: 60, description: 'South Indian crispy dosa' },
        { name: 'Idli', price: 25, description: 'Soft steamed idli (2 pieces)' },
        { name: 'Vada Pav', price: 20, description: 'Mumbai style vada pav' },
        { name: 'Pani Puri', price: 30, description: 'Crispy puris with spicy water (6 pieces)' },
        { name: 'Bhel Puri', price: 35, description: 'Mumbai style bhel puri' },
        { name: 'Chaat', price: 40, description: 'Mixed chaat with chutneys' },
        { name: 'Paratha', price: 45, description: 'Stuffed paratha with curry' },
        { name: 'Biryani', price: 120, description: 'Aromatic vegetable biryani' },
        { name: 'Fried Rice', price: 80, description: 'Vegetable fried rice' },
        { name: 'Noodles', price: 70, description: 'Hakka noodles with vegetables' },
        { name: 'Momos', price: 60, description: 'Steamed vegetable momos (6 pieces)' },
        { name: 'Spring Roll', price: 50, description: 'Crispy vegetable spring rolls' },
        { name: 'Juice', price: 25, description: 'Fresh fruit juice' },
        { name: 'Lassi', price: 30, description: 'Sweet yogurt drink' }
      ];
      
      // Return 2-4 random products to simulate AI detection
      const numProducts = Math.floor(Math.random() * 3) + 2;
      const shuffled = commonProducts.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, numProducts);
      
    } catch (error) {
      logger.error('Error processing image:', error);
      return [];
    }
  }

  async transcribeAudio(audioMessage) {
    try {
      // For production, you would use speech-to-text services like:
      // - Google Speech-to-Text API
      // - AWS Transcribe
      // - OpenAI Whisper API
      
      // For now, return simulated transcription
      const sampleTranscriptions = [
        "I sell samosa for fifteen rupees, tea for ten rupees, and sandwich for thirty rupees",
        "We have dosa sixty rupees, idli twenty five rupees, coffee fifteen rupees",
        "My items are vada pav twenty rupees, bhel puri thirty five rupees, pani puri thirty rupees",
        "I make fresh juice twenty five rupees, lassi thirty rupees, sandwich forty rupees"
      ];
      
      return sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
      
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      return '';
    }
  }

  cleanProductName(name) {
    if (!name) return '';
    
    // Remove common noise words and characters
    name = name.replace(/[₹rs\.\d\s-]+/gi, '');
    name = name.replace(/\b(rupees?|rs|price|cost|rate|per|piece|pieces)\b/gi, '');
    name = name.replace(/[^\w\s]/g, '');
    name = name.trim();
    
    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    
    return name;
  }

  generateDescription(productName) {
    const name = productName.toLowerCase();
    
    // Common food descriptions
    const descriptions = {
      samosa: 'Crispy fried samosa with spicy filling',
      tea: 'Hot masala tea',
      coffee: 'Fresh filter coffee',
      sandwich: 'Grilled vegetable sandwich',
      burger: 'Veg burger with fresh ingredients',
      pizza: 'Cheese pizza slice',
      dosa: 'South Indian crispy dosa',
      idli: 'Soft steamed idli',
      'vada pav': 'Mumbai style vada pav',
      'pani puri': 'Crispy puris with spicy water',
      'bhel puri': 'Mumbai style bhel puri',
      chaat: 'Mixed chaat with chutneys',
      paratha: 'Stuffed paratha with curry',
      biryani: 'Aromatic vegetable biryani',
      'fried rice': 'Vegetable fried rice',
      noodles: 'Hakka noodles with vegetables',
      momos: 'Steamed vegetable momos',
      'spring roll': 'Crispy vegetable spring rolls',
      juice: 'Fresh fruit juice',
      lassi: 'Sweet yogurt drink'
    };
    
    // Check for exact matches
    for (const [key, desc] of Object.entries(descriptions)) {
      if (name.includes(key)) {
        return desc;
      }
    }
    
    // Generate generic description based on category
    if (name.includes('tea') || name.includes('coffee') || name.includes('juice') || name.includes('lassi')) {
      return `Fresh ${productName.toLowerCase()}`;
    } else if (name.includes('rice') || name.includes('biryani') || name.includes('noodles')) {
      return `Delicious ${productName.toLowerCase()}`;
    } else if (name.includes('burger') || name.includes('sandwich') || name.includes('pizza')) {
      return `Tasty ${productName.toLowerCase()}`;
    } else {
      return `Fresh ${productName.toLowerCase()}`;
    }
  }

  async generateBusinessDescription(businessName, category, products) {
    try {
      if (this.openai) {
        const prompt = `Generate a brief, appealing business description for a street vendor/small business:

Business Name: ${businessName}
Category: ${category}
Products: ${products.map(p => p.name).join(', ')}

Write a 1-2 sentence description that would attract customers. Keep it simple, friendly, and appetizing. Focus on freshness, quality, and local appeal.`;

        const response = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 100
        });

        return response.choices[0].message.content.trim();
      }
      
      // Fallback descriptions
      const fallbackDescriptions = {
        food: `${businessName} serves fresh, delicious food made with quality ingredients. Perfect for a quick, tasty meal!`,
        clothing: `${businessName} offers trendy, affordable clothing and fashion accessories for all occasions.`,
        electronics: `${businessName} provides quality electronics, gadgets, and accessories at competitive prices.`,
        services: `${businessName} offers reliable, professional services with a focus on customer satisfaction.`,
        accessories: `${businessName} has a great selection of accessories and items for your daily needs.`
      };
      
      return fallbackDescriptions[category] || `${businessName} offers quality products and excellent service to the local community.`;
      
    } catch (error) {
      logger.error('Error generating business description:', error);
      return `${businessName} offers quality products and excellent service.`;
    }
  }

  async categorizeProduct(productName) {
    const name = productName.toLowerCase();
    
    // Food items
    const foodKeywords = ['samosa', 'tea', 'coffee', 'sandwich', 'burger', 'pizza', 'dosa', 'idli', 'vada', 'puri', 'chaat', 'paratha', 'biryani', 'rice', 'noodles', 'momos', 'roll', 'juice', 'lassi', 'milk', 'bread', 'roti', 'curry', 'dal', 'sabzi'];
    
    // Clothing items
    const clothingKeywords = ['shirt', 'pant', 'dress', 'saree', 'kurta', 'jeans', 'top', 'skirt', 'blouse', 'jacket', 'sweater', 'cap', 'hat'];
    
    // Electronics
    const electronicsKeywords = ['phone', 'mobile', 'charger', 'cable', 'earphone', 'speaker', 'battery', 'adapter', 'memory', 'card', 'cover', 'case'];
    
    // Accessories
    const accessoryKeywords = ['bag', 'wallet', 'watch', 'belt', 'chain', 'ring', 'bracelet', 'sunglasses', 'keychain'];
    
    for (const keyword of foodKeywords) {
      if (name.includes(keyword)) return 'food';
    }
    
    for (const keyword of clothingKeywords) {
      if (name.includes(keyword)) return 'clothing';
    }
    
    for (const keyword of electronicsKeywords) {
      if (name.includes(keyword)) return 'electronics';
    }
    
    for (const keyword of accessoryKeywords) {
      if (name.includes(keyword)) return 'accessories';
    }
    
    return 'other';
  }

  async generateSEOKeywords(businessName, category, location, products) {
    const keywords = [];
    
    // Business name variations
    keywords.push(businessName.toLowerCase());
    keywords.push(businessName.toLowerCase().replace(/\s+/g, ''));
    
    // Category keywords
    const categoryKeywords = {
      food: ['food', 'restaurant', 'street food', 'snacks', 'meals', 'tiffin', 'breakfast', 'lunch', 'dinner'],
      clothing: ['clothes', 'fashion', 'garments', 'apparel', 'dress', 'wear'],
      electronics: ['electronics', 'gadgets', 'mobile', 'accessories', 'repair'],
      services: ['services', 'repair', 'maintenance', 'professional'],
      accessories: ['accessories', 'items', 'goods', 'products']
    };
    
    keywords.push(...(categoryKeywords[category] || []));
    
    // Location keywords
    const locationParts = location.toLowerCase().split(/[,\s]+/);
    keywords.push(...locationParts.filter(part => part.length > 2));
    
    // Product keywords
    products.forEach(product => {
      keywords.push(product.name.toLowerCase());
    });
    
    // Common local keywords
    keywords.push('near me', 'local', 'nearby', 'delivery', 'online order', 'home delivery');
    
    // Remove duplicates and return
    return [...new Set(keywords)].filter(k => k.length > 1);
  }
}

module.exports = new AIService();