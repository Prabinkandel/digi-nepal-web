require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');

const seedData = async () => {
  await connectDB();

  console.log('--- Starting Database Seed ---');

  try {
    // 1. Create robust categories if they don't exist
    const catData = [
      { id: uuidv4(), name: 'AI Tools', icon: '🤖', color: 'linear-gradient(135deg,#667eea,#764ba2)', sort_order: 1 },
      { id: uuidv4(), name: 'Design & Media', icon: '🎨', color: 'linear-gradient(135deg,#f093fb,#f5576c)', sort_order: 2 },
      { id: uuidv4(), name: 'Cloud & Office', icon: '☁️', color: 'linear-gradient(135deg,#4facfe,#00f2fe)', sort_order: 3 },
      { id: uuidv4(), name: 'Entertainment', icon: '🍿', color: 'linear-gradient(135deg,#43e97b,#38f9d7)', sort_order: 4 },
      { id: uuidv4(), name: 'Security & VPN', icon: '🛡️', color: 'linear-gradient(135deg,#fa709a,#fee140)', sort_order: 5 }
    ];

    let aiCat, designCat, cloudCat, entCat, secCat;
    
    // Clear old categories to prevent duplicates for this clean seed
    await Category.deleteMany({});
    await Product.deleteMany({}); // We are adding ALL products fresh

    await Category.insertMany(catData);
    console.log('✅ Inserted Categories');
    
    aiCat = catData[0].id;
    designCat = catData[1].id;
    cloudCat = catData[2].id;
    entCat = catData[3].id;
    secCat = catData[4].id;

    // 2. Add realistic products
    const products = [
      {
        id: uuidv4(), name: 'ChatGPT Plus (1 Month)', category_id: aiCat, price: 1200, original_price: 2500, discount: 52, badge: 'sale',
        description: 'Access GPT-4o, DALL·E 3 image generation, and advanced data analysis instantly.',
        features: ['GPT-4o access', 'DALL·E 3 image generation', 'Advanced data analysis', 'Custom GPTs', 'Priority speed'],
        rating: 4.9, image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg'
      },
      {
        id: uuidv4(), name: 'Canva Pro (Lifetime)', category_id: designCat, price: 500, original_price: 1500, discount: 66, badge: 'cheap',
        description: 'Unlock all premium templates, magic studio AI tools, and 1TB cloud storage on your own email.',
        features: ['Magic Studio AI', '100M+ Premium Stock photos', 'Brand Kit', 'Background Remover', '1TB Cloud Storage'],
        rating: 4.8, image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg'
      },
      {
        id: uuidv4(), name: 'Microsoft Office 365 (Lifetime)', category_id: cloudCat, price: 999, original_price: 5000, discount: 80, badge: 'hot',
        description: 'Genuine lifetime activation key for Word, Excel, PowerPoint, and 1TB OneDrive.',
        features: ['Genuine License Key', 'Supports 5 Devices', '1TB OneDrive Storage', 'Word, Excel, PowerPoint', 'Windows & Mac'],
        rating: 5.0, image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg'
      },
      {
        id: uuidv4(), name: 'Netflix Premium (1 Month)', category_id: entCat, price: 400, original_price: 800, discount: 50, badge: null,
        description: '4K Ultra HD Netflix Premium account. Shared profile with strict privacy.',
        features: ['4K Ultra HD', 'Private Profile', 'Works on TV/Mobile/PC', 'Instant Delivery', '24/7 Replacement Warranty'],
        rating: 4.7, image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg'
      },
      {
        id: uuidv4(), name: 'ExpressVPN (1 Year)', category_id: secCat, price: 1500, original_price: 8000, discount: 81, badge: 'sale',
        description: 'Lightning-fast, ultra-secure VPN. Access geo-blocked content easily.',
        features: ['High-speed servers in 94 countries', 'Strict no-logs policy', 'Threat Manager', 'Connect up to 5 devices', 'Unlimited Bandwidth'],
        rating: 4.9, image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/ExpressVPN_logo.svg'
      },
      {
        id: uuidv4(), name: 'GitHub Copilot (1 Year)', category_id: aiCat, price: 2000, original_price: 12000, discount: 83, badge: 'cheap',
        description: 'Your AI pair programmer. Writes code, fixes bugs, and explains logic directly in your IDE.',
        features: ['Code autocomplete', 'Chat interface', 'Security vulnerability filter', 'Supports VS Code, JetBrains', 'Directly linked to your GitHub'],
        rating: 5.0, image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Github-desktop-logo-symbol.svg'
      },
      {
        id: uuidv4(), name: 'Adobe Creative Cloud (1 Year)', category_id: designCat, price: 3500, original_price: 45000, discount: 92, badge: 'hot',
        description: 'All Adobe apps including Photoshop, Premiere Pro, Illustrator, and After Effects.',
        features: ['20+ Creative Desktop Apps', 'Adobe Fonts', '100GB Cloud Storage', 'Generative AI tools', 'Upgrades included'],
        rating: 4.8, image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Adobe_Creative_Cloud_rainbow_icon.svg'
      }
    ];

    await Product.insertMany(products);
    console.log(`✅ Inserted ${products.length} Products`);

    console.log('🎉 Seed Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedData();
