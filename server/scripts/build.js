const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const output = path.join(root, 'dist');
const publicFiles = [
  'index.html', 'admin.html', 'about.html', 'contact.html', 'privacy.html', 'terms.html', 'refund.html',
  'style.css', 'animations.css', 'auth.css', 'storefront-polish.css', 'payment-overrides.css', 'admin.css', 'pages.css', 'tokens.css',
  'app.js', 'admin.js', 'logo.png'
];

fs.mkdirSync(output, { recursive: true });
for (const file of publicFiles) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, file));
}
console.log('Public site build complete. Server source and private data are excluded.');
