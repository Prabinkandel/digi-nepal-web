const dns = require('node:dns');
if (!process.env.VERCEL) {
  try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) { void e; }
}

const path = require('node:path');
require('dotenv').config({ path: [path.join(__dirname, '../../.env'), path.join(__dirname, '../.env')], quiet: true });
const mongoose = require('mongoose');
const { randomUUID: uuidv4 } = require('node:crypto');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Category = require('../models/Category');

const seedData = async () => {
  await connectDB();
  console.log('--- Starting Database Seed ---');

  try {
    const catData = [
      { id: uuidv4(), name: 'AI Tools',       icon: '🤖', color: 'linear-gradient(135deg,#667eea,#764ba2)', sort_order: 1 },
      { id: uuidv4(), name: 'Design & Media', icon: '🎨', color: 'linear-gradient(135deg,#f093fb,#f5576c)', sort_order: 2 },
      { id: uuidv4(), name: 'Cloud & Office', icon: '☁️', color: 'linear-gradient(135deg,#4facfe,#00f2fe)', sort_order: 3 },
      { id: uuidv4(), name: 'Entertainment',  icon: '🍿', color: 'linear-gradient(135deg,#43e97b,#38f9d7)', sort_order: 4 },
      { id: uuidv4(), name: 'Security & VPN', icon: '🛡️', color: 'linear-gradient(135deg,#fa709a,#fee140)', sort_order: 5 },
      { id: uuidv4(), name: 'Education',      icon: '📚', color: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', sort_order: 6 },
    ];

    await Category.deleteMany({});
    await Product.deleteMany({});
    await Category.insertMany(catData);
    console.log('Inserted 6 Categories');

    const [aiId, designId, cloudId, entId, secId, eduId] = catData.map(c => c.id);

    const p = (name, duration, catId, price, orig, disc, badge, desc, feats, rating, img) => ({
      id: uuidv4(), name, duration, category_id: catId,
      price, original_price: orig, discount: disc, badge,
      description: desc, features: feats, rating, image_url: img
    });

    const products = [
      // AI TOOLS
      p('ChatGPT Plus','1 Month', aiId, 1200,2500,52,'sale','Access GPT-4o, DALL·E 3 and advanced analysis on your own OpenAI account.',['GPT-4o access','DALL·E 3 image generation','Advanced data analysis','Custom GPTs','Priority speed'],4.9,''),
      p('ChatGPT Plus','3 Months',aiId, 3200,7500,57,'popular','Three months of GPT-4o + DALL·E 3. Best value for regular AI users.',['GPT-4o access','DALL·E 3 image generation','Advanced data analysis','Custom GPTs','Priority speed'],4.9,''),
      p('ChatGPT Plus','1 Year',  aiId,11000,30000,63,'hot','Full year of ChatGPT Plus — max savings for power users.',['GPT-4o access','DALL·E 3 image generation','Advanced data analysis','Custom GPTs','Priority speed'],5.0,''),
      p('GitHub Copilot','1 Month',aiId, 800,1500,47,null,'AI code completion inside VS Code and JetBrains. Write code 55% faster.',['Code autocomplete','AI chat in editor','Security vulnerability filter','VS Code & JetBrains','Linked to your GitHub'],4.9,''),
      p('GitHub Copilot','1 Year', aiId,8000,18000,56,'cheap','One full year of AI pair-programming. Best deal for developers.',['Code autocomplete','AI chat in editor','Security vulnerability filter','VS Code & JetBrains','Linked to your GitHub'],5.0,''),
      p('Midjourney','1 Month',   aiId,1800,3500,49,null,'Generate stunning AI art. ~200 fast GPU hours per month with V6 model.',['~200 GPU hours/month','Discord & web access','Commercial usage rights','High-resolution outputs','V6 model access'],4.8,''),
      p('Claude Pro','1 Month',   aiId,1300,2500,48,'sale','Claude 3.5 Sonnet — best for long documents, coding, and analysis.',['Claude 3.5 Sonnet & Opus','5x more usage than free','Priority access','Projects & memory','200K token context'],4.8,''),

      // DESIGN & MEDIA
      p('Canva Pro','1 Month', designId,400,900,56,'sale','Premium templates, Magic Studio AI, background remover on your own email.',['Magic Studio AI','100M+ stock assets','Brand Kit','Background remover','1TB storage'],4.8,''),
      p('Canva Pro','1 Year',  designId,3500,10800,68,'hot','Full year of Canva Pro at Nepal-friendly pricing.',['Magic Studio AI','100M+ stock assets','Brand Kit','Background remover','1TB storage'],4.9,''),
      p('Adobe Creative Cloud','1 Month',designId,1500,4000,63,null,'Photoshop, Illustrator, Premiere Pro, After Effects + 20 more apps.',['20+ Creative apps','Adobe Fonts','100GB cloud storage','Firefly AI','Updates included'],4.8,''),
      p('Adobe Creative Cloud','1 Year', designId,15000,48000,69,'hot','Full year of every Adobe app at Nepal\'s lowest price.',['20+ Creative apps','Adobe Fonts','100GB cloud storage','Firefly AI (Generative)','Updates included'],4.9,''),
      p('Figma Professional','1 Year',   designId,4000,14400,72,'cheap','Unlimited files, advanced prototyping and Dev Mode for UI/UX teams.',['Unlimited Figma files','Advanced prototyping','Dev Mode access','30-day version history','Shared libraries'],4.9,''),

      // CLOUD & OFFICE
      p('Microsoft 365 Personal','1 Year',cloudId,2200,6500,66,'hot','Word, Excel, PowerPoint, Outlook and 1TB OneDrive on 1 device.',['Word, Excel, PowerPoint','Outlook & OneNote','1TB OneDrive','1 PC or Mac','Always up-to-date'],5.0,''),
      p('Microsoft 365 Family','1 Year',  cloudId,3500,10000,65,'popular','Up to 6 users, 6TB OneDrive, all Office apps across devices.',['Up to 6 users','6TB OneDrive (1TB each)','All Office apps','PC, Mac, tablet & phone','Family safety features'],4.9,''),
      p('Google One 2TB','1 Year',        cloudId,1000,2200,55,null,'2TB across Drive, Gmail and Photos. Share with up to 5 family members.',['2TB Google storage','Share with 5 members','Google Photos backup','VPN included','Expert support'],4.7,''),
      p('Notion Plus','1 Year',           cloudId,1800,4800,63,'cheap','All-in-one workspace for notes, wikis and projects. Unlimited blocks.',['Unlimited blocks','Unlimited file uploads','30-day version history','Guest invites','API access'],4.8,''),

      // ENTERTAINMENT
      p('Netflix Premium','1 Month', entId,550,1100,50,'sale','4K Ultra HD Netflix Premium. Private profile. Works on TV, mobile & PC.',['4K Ultra HD','Private profile','TV/Mobile/PC','Instant delivery','24/7 replacement warranty'],4.7,''),
      p('Netflix Premium','3 Months',entId,1500,3300,55,null,'Three months of 4K Netflix Premium. Private profile and guaranteed replacement.',['4K Ultra HD','Private profile','TV/Mobile/PC','Instant delivery','24/7 replacement warranty'],4.7,''),
      p('Spotify Premium','1 Month', entId,200,499,60,'cheap','Ad-free music, offline downloads, unlimited skips on your own account.',['Ad-free listening','Offline downloads','Unlimited skips','High audio quality','Your own account'],4.8,''),
      p('Spotify Premium','3 Months',entId,550,1497,63,null,'Three months ad-free. Best deal for consistent music lovers.',['Ad-free listening','Offline downloads','Unlimited skips','High audio quality','Your own account'],4.8,''),
      p('YouTube Premium','1 Month', entId,250,599,58,null,'Ad-free YouTube, background play, YouTube Music and offline video.',['Ad-free YouTube','Background play','YouTube Music included','Offline downloads','YouTube Kids'],4.6,''),
      p('Disney+ Hotstar','1 Year',  entId,1200,2999,60,'sale','Disney, Marvel, Star Wars, Pixar, Nat Geo + live cricket in one plan.',['4K streaming','Disney & Marvel','Live cricket & sports','Star Wars & Nat Geo','All devices'],4.6,''),

      // SECURITY & VPN
      p('ExpressVPN','1 Month', secId,800,1500,47,null,'Lightning-fast VPN. Bypass geo-restrictions and protect privacy in one click.',['3,000+ servers in 94 countries','No-logs policy','Kill switch','5 devices','TrustedServer technology'],4.9,''),
      p('ExpressVPN','6 Months',secId,4000,9000,56,'sale','Six months of premium VPN — the best balance of price and commitment.',['3,000+ servers in 94 countries','No-logs policy','Kill switch','5 devices','TrustedServer technology'],4.9,''),
      p('ExpressVPN','1 Year',  secId,6500,18000,64,'hot','Best-value ExpressVPN — a full year of ultra-fast, ultra-secure browsing.',['3,000+ servers in 94 countries','No-logs policy','Kill switch','5 devices','TrustedServer technology'],5.0,''),
      p('NordVPN','1 Year',     secId,4500,12000,63,'cheap','Military-grade encryption, double VPN and Threat Protection.',['5,500+ servers in 60 countries','Threat Protection','Double VPN','6 devices','Dark Web Monitor'],4.8,''),
      p('Surfshark','1 Year',   secId,3000,8000,63,'cheap','Unlimited devices on one account — fast, private and affordable.',['Unlimited devices','3,200+ servers in 100 countries','CleanWeb ad-blocker','Split tunneling','No-logs'],4.7,''),

      // EDUCATION
      p('Duolingo Super','3 Months',eduId,600,1500,60,null,'Learn any language ad-free with unlimited hearts, streak repair and offline lessons.',['Ad-free learning','Unlimited hearts','Streak repair','Offline lessons','Progress tracker'],4.7,''),
      p('Coursera Plus','1 Year',    eduId,5000,16000,69,'hot','7,000+ courses from Google, IBM, Yale and top universities.',['7,000+ courses','Google & IBM certificates','University degrees','Offline access','Verified certificates'],4.8,''),
      p('LinkedIn Learning','1 Month',eduId,900,2200,59,null,'Expert-led courses on tech, business and creative skills. Add certs to LinkedIn.',['16,000+ expert courses','LinkedIn certificate badge','Offline downloads','AI recommendations','Learning paths'],4.6,''),
      p('LinkedIn Learning','1 Year', eduId,8000,26400,70,'sale','Full year of professional skill-building and verified certificates.',['16,000+ expert courses','LinkedIn certificate badge','Offline downloads','AI recommendations','Learning paths'],4.7,''),
    ];




    await Product.insertMany(products);
    console.log('Inserted ' + products.length + ' Products');
    console.log('Seed Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seedData();

