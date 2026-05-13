const API = '/api';
const WA_NUM = '9779840661406';

// ── AUTH STATE ────────────────────────────────────────────────────────────────
let currentUser = null;
let authToken = localStorage.getItem('tv_token');

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function initAuth() {
  if (!authToken) { renderAuthBar(); return; }
  try {
    currentUser = await apiFetch('/auth/me');
    renderAuthBar();
  } catch {
    authToken = null;
    localStorage.removeItem('tv_token');
    renderAuthBar();
  }
}

function renderAuthBar() {
  const actions = document.querySelector('.nav-actions');
  const existing = document.getElementById('user-menu-wrap');
  if (existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.id = 'user-menu-wrap';
  wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '10px';
  if (currentUser) {
    wrap.innerHTML = `
      <div class="user-chip" id="user-chip">
        <div class="user-avatar">${currentUser.name[0].toUpperCase()}</div>
        <span>${currentUser.name.split(' ')[0]}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="user-dropdown" id="user-dropdown" hidden>
        <div class="ud-name">${currentUser.name}</div>
        <div class="ud-email">${currentUser.email}</div>
        <hr class="ud-hr"/>
        <a href="#" class="ud-item" id="ud-orders">📦 My Orders</a>
        ${currentUser.role === 'admin' ? `<a href="/admin" class="ud-item" target="_blank">⚙️ Admin Panel</a>` : ''}
        <a href="#" class="ud-item ud-logout" id="ud-logout">🚪 Logout</a>
      </div>`;
    actions.prepend(wrap);
    document.getElementById('user-chip').addEventListener('click', () => {
      const dd = document.getElementById('user-dropdown');
      dd.hidden = !dd.hidden;
    });
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) { const dd = document.getElementById('user-dropdown'); if (dd) dd.hidden = true; }
    });
    document.getElementById('ud-logout').addEventListener('click', e => { e.preventDefault(); logout(); });
    document.getElementById('ud-orders').addEventListener('click', e => { e.preventDefault(); showMyOrders(); });
  } else {
    wrap.innerHTML = `<button class="btn-ghost" id="nav-login-btn" style="padding:8px 16px;font-size:.9rem">Login</button><a href="#" class="btn-primary nav-cta" id="nav-register-btn">Signup</a>`;
    actions.prepend(wrap);
    document.getElementById('nav-login-btn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('nav-register-btn').addEventListener('click', e => { e.preventDefault(); openAuthModal('register'); });
  }
}

function logout() {
  authToken = null; currentUser = null;
  localStorage.removeItem('tv_token');
  renderAuthBar();
  showToast('Logged out successfully');
}

// ── AUTH MODAL ────────────────────────────────────────────────────────────────
let authMode = 'login';
let pendingAuthData = null;

function openAuthModal(mode = 'login') {
  authMode = mode;
  pendingAuthData = null;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  renderAuthForm(content);
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderAuthForm(content) {
  const isLogin = authMode === 'login';
  const isOtp = authMode === 'verify-otp';
  
  if (isOtp) {
    content.innerHTML = `
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2.5rem;margin-bottom:12px">✉️</div>
        <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:6px">Check your email</h2>
        <p style="color:var(--text2);font-size:.9rem">We sent a 6-digit code to <strong>${pendingAuthData.email}</strong></p>
      </div>
      <div id="auth-error" class="auth-error" hidden></div>
      <form id="auth-form">
        <div class="form-group">
          <label>Verification Code</label>
          <input type="text" id="auth-otp" placeholder="Enter 6-digit code" required autocomplete="off" style="text-align:center;font-size:1.5rem;letter-spacing:4px"/>
        </div>
        <button type="submit" class="btn-primary" id="auth-submit" style="width:100%;justify-content:center;padding:14px;margin-top:8px;font-size:1rem">
          Verify & Complete
        </button>
      </form>
      <p style="text-align:center;margin-top:20px;font-size:.9rem;color:var(--text2)">
        Didn't receive it? <a href="#" id="auth-switch" style="color:var(--blue-light);font-weight:600">Register again</a>
      </p>`;
  } else {
    content.innerHTML = `
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2.5rem;margin-bottom:12px">${isLogin ? '🔐' : '🚀'}</div>
        <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:6px">${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p style="color:var(--text2);font-size:.9rem">${isLogin ? 'Login to place your order' : 'Join 25,000+ customers'}</p>
      </div>
      <div id="auth-error" class="auth-error" hidden></div>
      <form id="auth-form">
        ${!isLogin ? `<div class="form-group"><label>Full Name</label><input type="text" id="auth-name" placeholder="Your name" required autocomplete="name"/></div>` : ''}
        <div class="form-group"><label>Email Address</label><input type="email" id="auth-email" placeholder="you@example.com" required autocomplete="email"/></div>
        <div class="form-group"><label>Password</label><input type="password" id="auth-password" placeholder="${isLogin ? 'Your password' : 'Min 6 characters'}" required autocomplete="${isLogin ? 'current-password' : 'new-password'}"/></div>
        <button type="submit" class="btn-primary" id="auth-submit" style="width:100%;justify-content:center;padding:14px;margin-top:8px;font-size:1rem">
          ${isLogin ? '🔐 Login' : '🚀 Create Account'}
        </button>
      </form>
      <p style="text-align:center;margin-top:20px;font-size:.9rem;color:var(--text2)">
        ${isLogin ? "Don't have an account?" : 'Already have an account?'}
        <a href="#" id="auth-switch" style="color:var(--blue-light);font-weight:600;margin-left:4px">${isLogin ? 'Register' : 'Login'}</a>
      </p>`;
  }
  
  document.getElementById('auth-switch').addEventListener('click', e => { 
    e.preventDefault(); 
    authMode = isLogin || isOtp ? 'register' : 'login'; 
    renderAuthForm(content); 
  });
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('auth-submit');
  const errEl = document.getElementById('auth-error');
  
  if (authMode === 'verify-otp') {
    const otp = document.getElementById('auth-otp').value.trim();
    btn.disabled = true; btn.textContent = 'Verifying...'; errEl.hidden = true;
    try {
      const data = await apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ ...pendingAuthData, otp }) });
      authToken = data.token; currentUser = data.user;
      localStorage.setItem('tv_token', authToken);
      closeModal(); renderAuthBar();
      showToast(`Welcome to Digi Nepal, ${currentUser.name}! 🎉`, 'success');
      if (pendingProductId) { const pid = pendingProductId; pendingProductId = null; placeOrder(pid); }
    } catch (err) {
      errEl.textContent = err.message; errEl.hidden = false;
      btn.disabled = false; btn.textContent = 'Verify & Complete';
    }
    return;
  }

  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name')?.value.trim();
  
  btn.disabled = true; btn.textContent = 'Please wait...'; errEl.hidden = true;
  try {
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = authMode === 'login' ? { email, password } : { email, password, name };
    const data = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    
    if (data.requires_otp) {
        pendingAuthData = { email, password, name };
        authMode = 'verify-otp';
        renderAuthForm(document.getElementById('modal-content'));
        return;
    }
    
    authToken = data.token; currentUser = data.user;
    localStorage.setItem('tv_token', authToken);
    closeModal(); renderAuthBar();
    showToast(`Welcome back, ${currentUser.name}! 🎉`, 'success');
    if (pendingProductId) { const pid = pendingProductId; pendingProductId = null; placeOrder(pid); }
  } catch (err) {
    errEl.textContent = err.message; errEl.hidden = false;
    btn.disabled = false; btn.textContent = authMode === 'login' ? '🔐 Login' : '🚀 Create Account';
  }
}

// ── DATA ──────────────────────────────────────────────────────────────────────
let allProducts = [], allCategories = [];

async function loadData() {
  try {
    [allCategories, allProducts] = await Promise.all([
      apiFetch('/categories'),
      apiFetch('/products')
    ]);
  } catch {
    // Fallback to static data if server not running
    console.warn('Server not running – using static data');
    loadStaticData();
    return;
  }
  renderFlashSale();
  renderCategories();
  setTimeout(initScrollAnimations, 100);
}

// ── ORDER FLOW ────────────────────────────────────────────────────────────────
let pendingProductId = null;

async function placeOrder(productId) {
  if (!currentUser) {
    pendingProductId = productId;
    closeModal();
    openAuthModal('login');
    return;
  }
  const btn = document.getElementById('modal-buy-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
  try {
    const data = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ product_id: productId }) });
    closeModal();
    showToast(`Order #${data.short_id} created! Opening WhatsApp...`, 'success');
    setTimeout(() => window.open(data.wa_url, '_blank'), 800);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Buy Now'; }
  }
}

// ── MY ORDERS ─────────────────────────────────────────────────────────────────
async function showMyOrders() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `<div style="text-align:center;padding:20px 0"><div style="font-size:2rem;margin-bottom:8px">📦</div><h2 style="font-weight:800;margin-bottom:4px">My Orders</h2><p style="color:var(--text2);font-size:.9rem">Loading...</p></div>`;
  overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  try {
    const orders = await apiFetch('/orders/my');
    const statusColor = { pending: '#f59e0b', verified: '#10b981', rejected: '#ef4444', delivered: '#3b82f6' };
    const statusLabel = { pending: '⏳ Pending', verified: '✅ Verified', rejected: '❌ Rejected', delivered: '📬 Delivered' };
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <span style="font-size:1.8rem">📦</span>
        <div><h2 style="font-weight:800;margin:0">My Orders</h2><p style="color:var(--text2);font-size:.85rem;margin:0">${orders.length} order${orders.length !== 1 ? 's' : ''}</p></div>
      </div>
      ${orders.length === 0
        ? `<div style="text-align:center;padding:40px 0;color:var(--text3)"><div style="font-size:3rem;margin-bottom:12px">🛒</div><p>No orders yet. Browse products and place your first order!</p></div>`
        : orders.map(o => `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${o.product_name}</div>
                <div style="font-size:.8rem;color:var(--text3)">Order #${o.id.split('-')[0].toUpperCase()} · ${new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:1.1rem;font-weight:800;color:var(--blue-light)">Rs ${o.price.toLocaleString()}</div>
                <div style="font-size:.8rem;font-weight:600;color:${statusColor[o.status]}">${statusLabel[o.status]}</div>
              </div>
            </div>
            ${o.status === 'pending' ? `<div style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:.82rem;color:#fcd34d">💬 Send your payment screenshot on WhatsApp to confirm your order.</div>` : ''}
            ${o.note ? `<div style="margin-top:8px;font-size:.82rem;color:var(--text2)">📝 ${o.note}</div>` : ''}
          </div>`).join('')}`;
  } catch (err) {
    content.innerHTML = `<div style="text-align:center;color:var(--sale);padding:40px">${err.message}</div>`;
  }
}

// ── PRODUCT CARD ──────────────────────────────────────────────────────────────
const fmt = n => `Rs ${n.toLocaleString()}`;
function getBadgeClass(b) { return b === 'sale' ? 'badge-sale' : b === 'popular' ? 'badge-popular' : b === 'cheap' ? 'badge-cheap' : b === 'lifetime' ? 'badge-lifetime' : 'badge-popular'; }
function getBadgeLabel(b) { return b === 'sale' ? '🔥 Flash Sale' : b === 'popular' ? '⭐ Popular' : b === 'cheap' ? '💚 Cheap Deal' : b === 'lifetime' ? '♾️ Lifetime' : '⭐ Popular'; }

function createProductCard(product) {
  const icon = product.category_icon || '📦';
  const imgHTML = product.image_url
    ? `<img src="${product.image_url}" alt="${product.name}" class="card-img"/>`
    : `<div class="card-icon">${icon}</div>`;
  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = 'card-' + product.id;
  const features = typeof product.features === 'string' ? JSON.parse(product.features || '[]') : (product.features || []);
  card.innerHTML = `
    ${product.badge ? `<div class="card-badge ${getBadgeClass(product.badge)}">${getBadgeLabel(product.badge)}</div>` : '<div style="height:22px"></div>'}
    ${imgHTML}
    <div class="card-rating">★★★★★ <span style="color:var(--text3)">${product.rating}</span></div>
    <div class="card-name">${product.name}</div>
    <div class="card-category">${product.category_name || ''}</div>
    <div class="card-price-row">
      <span class="card-price">${fmt(product.price)}</span>
      ${product.original_price ? `<span class="card-original">${fmt(product.original_price)}</span>` : ''}
      ${product.discount ? `<span class="card-discount">-${product.discount}%</span>` : ''}
    </div>
    <div class="card-action">
      <button class="btn-card btn-card-buy" data-id="${product.id}">Buy Now</button>
      <button class="btn-card btn-card-wish" aria-label="Wishlist">♡</button>
    </div>`;
  card.addEventListener('click', e => { if (!e.target.classList.contains('btn-card')) openProductModal(product, features); });
  card.querySelector('.btn-card-buy').addEventListener('click', e => { e.stopPropagation(); placeOrder(product.id); });
  card.querySelector('.btn-card-wish').addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target; b.textContent = b.textContent === '♡' ? '♥' : '♡';
    showToast(b.textContent === '♥' ? 'Added to wishlist ♥' : 'Removed from wishlist', 'success');
  });
  return card;
}

// ── PRODUCT MODAL ─────────────────────────────────────────────────────────────
function openProductModal(product, features) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const feats = features || (typeof product.features === 'string' ? JSON.parse(product.features || '[]') : (product.features || []));
  const imgHTML = product.image_url
    ? `<img src="${product.image_url}" alt="${product.name}" style="width:80px;height:80px;object-fit:cover;border-radius:14px;margin-bottom:16px;border:1px solid var(--border)"/>`
    : `<div class="modal-product-icon">${product.category_icon || '📦'}</div>`;
  content.innerHTML = `
    ${imgHTML}
    <div class="modal-badge-row">
      ${product.badge ? `<span class="card-badge ${getBadgeClass(product.badge)}">${getBadgeLabel(product.badge)}</span>` : ''}
      <span class="card-badge" style="background:rgba(99,179,237,0.1);border:1px solid rgba(99,179,237,0.3);color:#93c5fd">⭐ ${product.rating}/5.0</span>
    </div>
    <div class="modal-name">${product.name}</div>
    <div class="modal-category">${product.category_name || ''}</div>
    <div class="modal-desc">${product.description || ''}</div>
    <div class="modal-price-box">
      <div>
        <div class="modal-price-label">Your Price</div>
        <div class="modal-price-val">${fmt(product.price)}</div>
        ${product.original_price ? `<div class="modal-original">${fmt(product.original_price)}</div>` : ''}
        ${product.discount ? `<div class="modal-save">You save ${fmt(product.original_price - product.price)} (${product.discount}% OFF)</div>` : ''}
      </div>
      <div style="text-align:right">
        <div class="modal-price-label">Delivery</div>
        <div style="color:var(--success);font-weight:700">⚡ Instant</div>
      </div>
    </div>
    ${feats.length ? `<ul class="modal-features">${feats.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
    <div style="margin-top:24px;display:flex;flex-direction:column;gap:10px">
      <button class="btn-primary" id="modal-buy-btn" style="width:100%;justify-content:center;padding:14px;font-size:1rem" data-id="${product.id}">
        💬 Order via WhatsApp — ${fmt(product.price)}
      </button>
      <button class="btn-qr-pay" id="modal-qr-btn" style="width:100%;justify-content:center;padding:14px;font-size:1rem;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:700;display:flex;align-items:center;gap:8px" data-id="${product.id}">
        📱 Pay via QR / eSewa / Khalti
      </button>
      <p style="text-align:center;font-size:.8rem;color:var(--text3);margin-top:2px">
        ${currentUser ? `Logged in as <strong>${currentUser.name}</strong>` : '🔐 Login required to place order'}
      </p>
    </div>`;
  overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  document.getElementById('modal-buy-btn').addEventListener('click', () => placeOrder(product.id));
  document.getElementById('modal-qr-btn').addEventListener('click', () => openQRPaymentFlow(product));
}

// ── QR PAYMENT FLOW ───────────────────────────────────────────────────────────
let qrPaymentProduct = null;
let qrPaymentOrderId = null;

function openQRPaymentFlow(product) {
  if (!currentUser) {
    pendingProductId = product.id;
    closeModal();
    openAuthModal('login');
    return;
  }
  qrPaymentProduct = product;
  qrPaymentOrderId = null;
  renderQRStep1();
}

function renderQRStep1() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const product = qrPaymentProduct;
  const esewaId = '9840661406';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=esewa%3A${esewaId}%3Famount%3D${product.price}`;
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2rem;margin-bottom:8px">📱</div>
      <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:4px">Pay via QR Code</h2>
      <p style="color:var(--text2);font-size:.9rem">Scan &amp; pay, then fill in your details</p>
    </div>
    <div class="qr-pay-box">
      <div class="qr-methods">
        <span class="qr-method-badge">eSewa</span>
        <span class="qr-method-badge">Khalti</span>
        <span class="qr-method-badge">Bank Transfer</span>
        <span class="qr-method-badge">IME Pay</span>
      </div>
      <img src="${qrUrl}" alt="QR Code" class="qr-img" />
      <div class="qr-amount-label">Amount to Pay</div>
      <div class="qr-amount">${fmt(product.price)}</div>
      <div class="qr-esewa-id">eSewa / Khalti ID: <strong>${esewaId}</strong></div>
      <p style="font-size:.8rem;color:var(--text3);text-align:center;margin-top:8px">Screenshot your payment confirmation — you'll need it next.</p>
    </div>
    <button id="qr-next-btn" class="btn-primary" style="width:100%;justify-content:center;padding:14px;margin-top:20px;font-size:1rem">
      ✅ I've Paid — Submit Details →
    </button>
    <button onclick="openProductModal(qrPaymentProduct)" style="width:100%;margin-top:8px;padding:10px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text2);cursor:pointer;font-family:inherit;font-size:.88rem">
      ← Back to Product
    </button>`;
  overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  document.getElementById('qr-next-btn').addEventListener('click', renderQRStep2);
}

function renderQRStep2() {
  const content = document.getElementById('modal-content');
  const product = qrPaymentProduct;
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2rem;margin-bottom:8px">📝</div>
      <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:4px">Payment Details</h2>
      <p style="color:var(--text2);font-size:.88rem">Fill in your info so admin can verify</p>
    </div>
    <div id="qr-form-error" style="display:none;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;padding:10px 14px;border-radius:8px;font-size:.88rem;margin-bottom:14px"></div>
    <div class="form-group"><label>Your Full Name *</label><input id="qp-name" placeholder="Name as on payment app" value="${currentUser ? currentUser.name : ''}"/></div>
    <div class="form-group"><label>Payment Method *</label>
      <select id="qp-method">
        <option value="">— Select —</option>
        <option value="eSewa">eSewa</option>
        <option value="Khalti">Khalti</option>
        <option value="IME Pay">IME Pay</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Connect IPS">Connect IPS</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="form-group"><label>Transaction / Reference ID *</label><input id="qp-txn" placeholder="e.g. TX12345678"/></div>
    <div class="form-group"><label>Your Phone Number</label><input id="qp-phone" type="tel" placeholder="98xxxxxxxx"/></div>
    <div class="form-group">
      <label>Payment Screenshot <span style="color:var(--text3);font-weight:400">(optional but recommended)</span></label>
      <div id="qp-upload-zone" style="border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:var(--transition);background:var(--surface2)" onmouseenter="this.style.borderColor='var(--blue)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="font-size:1.8rem;margin-bottom:6px">📷</div>
        <div style="font-size:.88rem;color:var(--text2);margin-bottom:4px">Click to upload screenshot</div>
        <div style="font-size:.75rem;color:var(--text3)">JPG, PNG, WebP — max 5MB</div>
        <input type="file" id="qp-ss-file" accept="image/*" style="display:none"/>
      </div>
      <div id="qp-ss-preview" style="margin-top:10px;display:none;align-items:center;gap:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px">
        <img id="qp-ss-thumb" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/>
        <div>
          <div id="qp-ss-name" style="font-size:.82rem;font-weight:600;color:var(--text)"></div>
          <div style="font-size:.75rem;color:var(--success)">✓ Ready to upload</div>
        </div>
        <button onclick="document.getElementById('qp-ss-file').value='';document.getElementById('qp-ss-preview').style.display='none';document.getElementById('qp-upload-zone').style.display='block'" style="margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:1rem">✕</button>
      </div>
    </div>
    <div class="form-group"><label>Additional Note <span style="color:var(--text3);font-weight:400">(optional)</span></label><textarea id="qp-note" style="min-height:60px" placeholder="Any extra info..."></textarea></div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px;font-size:.88rem;color:var(--text2)">
      <strong style="color:var(--text)">Order Summary</strong><br/>
      Product: ${product.name}<br/>
      Amount: <strong style="color:var(--blue-light)">${fmt(product.price)}</strong>
    </div>
    <button id="qp-submit-btn" class="btn-primary" style="width:100%;justify-content:center;padding:14px;font-size:1rem">📤 Submit Payment Proof</button>
    <button onclick="renderQRStep1()" style="width:100%;margin-top:8px;padding:10px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text2);cursor:pointer;font-family:inherit;font-size:.88rem">← Back to QR</button>`;

  // File upload zone click
  document.getElementById('qp-upload-zone').addEventListener('click', () => document.getElementById('qp-ss-file').click());
  document.getElementById('qp-ss-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('qp-ss-thumb').src = ev.target.result;
      document.getElementById('qp-ss-name').textContent = file.name;
      document.getElementById('qp-ss-preview').style.display = 'flex';
      document.getElementById('qp-upload-zone').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('qp-submit-btn').addEventListener('click', async () => {
    const errEl = document.getElementById('qr-form-error');
    const name = document.getElementById('qp-name').value.trim();
    const method = document.getElementById('qp-method').value;
    const txn = document.getElementById('qp-txn').value.trim();
    if (!name || !method || !txn) { errEl.textContent = 'Please fill in Name, Payment Method and Transaction ID.'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    const btn = document.getElementById('qp-submit-btn');
    btn.disabled = true; btn.textContent = 'Uploading...';

    // Upload screenshot if selected
    let screenshotUrl = '';
    const ssFile = document.getElementById('qp-ss-file').files[0];
    if (ssFile) {
      try {
        const fd = new FormData(); fd.append('image', ssFile);
        const headers = {}; if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const res = await fetch(API + '/upload', { method: 'POST', headers, body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Upload failed');
        screenshotUrl = d.url;
      } catch (uploadErr) {
        errEl.textContent = 'Screenshot upload failed: ' + uploadErr.message; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = '📤 Submit Payment Proof'; return;
      }
    }

    btn.textContent = 'Submitting...';
    try {
      await apiFetch('/payments', { method: 'POST', body: JSON.stringify({
        order_id: qrPaymentOrderId, product_name: product.name, amount: product.price,
        payer_name: name, transaction_id: txn, payment_method: method,
        phone: document.getElementById('qp-phone').value.trim(),
        note: document.getElementById('qp-note').value.trim(),
        screenshot_url: screenshotUrl
      })});
      renderQRStep3();
    } catch (err) {
      errEl.textContent = err.message; errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = '📤 Submit Payment Proof';
    }
  });
}

function renderQRStep3() {
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:4rem;margin-bottom:16px">🎉</div>
      <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:8px">Payment Submitted!</h2>
      <p style="color:var(--text2);font-size:.95rem;line-height:1.65;margin-bottom:24px">
        Your payment details have been received. Our admin will verify your transaction within <strong>1–24 hours</strong>.
        You'll get an email once verified! 📧
      </p>
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="font-size:.85rem;color:var(--text3);margin-bottom:4px">Payment for</div>
        <div style="font-weight:800;color:var(--success);font-size:1.1rem">${qrPaymentProduct.name}</div>
        <div style="color:var(--text2);font-size:.9rem;margin-top:4px">Amount: ${fmt(qrPaymentProduct.price)}</div>
      </div>
      <button onclick="closeModal()" class="btn-primary" style="width:100%;justify-content:center;padding:14px;font-size:1rem">✓ Done</button>
    </div>`;
}

// ── FLASH SALE ────────────────────────────────────────────────────────────────
function renderFlashSale() {
  const grid = document.getElementById('flash-grid');
  grid.innerHTML = '';
  const flash = allProducts.filter(p => p.badge === 'sale').slice(0, 6);
  if (!flash.length) { document.querySelector('.flash-sale').style.display = 'none'; return; }
  flash.forEach(p => grid.appendChild(createProductCard(p)));
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('category-sections');
  container.innerHTML = '';
  allCategories.forEach(cat => {
    const prods = allProducts.filter(p => p.category_id === cat.id);
    if (!prods.length) return;
    const sec = document.createElement('section');
    sec.className = 'cat-section'; sec.id = cat.id;
    sec.innerHTML = `
      <div class="container">
        <div class="cat-header">
          <div class="cat-title-wrap">
            <div class="cat-icon-wrap" style="background:${cat.color}">${cat.icon}</div>
            <div><div class="cat-label">${cat.name}</div><div class="cat-count">${prods.length} product${prods.length !== 1 ? 's' : ''}</div></div>
          </div>
          <a href="#${cat.id}" class="btn-view-all">View All <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></a>
        </div>
        <div class="products-grid" id="grid-${cat.id}"></div>
      </div>`;
    container.appendChild(sec);
    prods.forEach(p => document.getElementById('grid-' + cat.id).appendChild(createProductCard(p)));
  });
}

// ── STATIC DATA FALLBACK ──────────────────────────────────────────────────────
function loadStaticData() {
  // minimal fallback notice
  document.getElementById('category-sections').innerHTML = `
    <div class="container" style="text-align:center;padding:60px 0">
      <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
      <h2 style="font-weight:700;margin-bottom:8px">Server Not Running</h2>
      <p style="color:var(--text2);margin-bottom:24px">Start the backend server to load products and enable ordering.</p>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;display:inline-block;text-align:left;font-family:monospace;font-size:.9rem">
        <div style="color:var(--text3);margin-bottom:8px"># Install and start server:</div>
        <div style="color:var(--cyan)">cd c:\\antigravity\\server</div>
        <div style="color:var(--cyan)">npm install</div>
        <div style="color:var(--cyan)">node server.js</div>
      </div>
    </div>`;
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

document.getElementById('search-toggle').addEventListener('click', () => {
  const open = searchBar.classList.toggle('open');
  searchBar.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) setTimeout(() => searchInput.focus(), 150);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { searchBar.classList.remove('open'); closeModal(); } });

searchInput.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (!q) return;
  const matches = allProducts.filter(p => p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)).slice(0, 6);
  if (!matches.length) { searchResults.innerHTML = `<div style="color:var(--text3);font-size:.9rem;padding:8px 16px">No results found</div>`; return; }
  matches.forEach(p => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `<div><div class="res-name">${p.category_icon || '📦'} ${p.name}</div><div class="res-cat">${p.category_name || ''}</div></div><div class="res-price">${fmt(p.price)}</div>`;
    item.addEventListener('click', () => { searchBar.classList.remove('open'); searchInput.value = ''; searchResults.innerHTML = ''; openProductModal(p); });
    searchResults.appendChild(item);
  });
});

// ── HAMBURGER ─────────────────────────────────────────────────────────────────
const navLinks = document.getElementById('nav-links');
document.getElementById('hamburger').addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ── COUNTDOWN ─────────────────────────────────────────────────────────────────
function startCountdown() {
  let total = 8 * 3600 + 45 * 60;
  const update = () => {
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    document.getElementById('cd-h').textContent = String(h).padStart(2, '0');
    document.getElementById('cd-m').textContent = String(m).padStart(2, '0');
    document.getElementById('cd-s').textContent = String(s).padStart(2, '0');
    if (total > 0) total--; else total = 8 * 3600 + 45 * 60;
  };
  update(); setInterval(update, 1000);
}
startCountdown();

// ── MODAL ─────────────────────────────────────────────────────────────────────
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });
document.getElementById('modal-close').addEventListener('click', closeModal);

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── SCROLL ANIMATIONS ─────────────────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } });
  }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.product-card,.feature-card,.review-card').forEach(el => {
    el.style.opacity = '0'; el.style.transform = 'translateY(28px)'; el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    observer.observe(el);
  });
}

// ── NAVBAR SCROLL ─────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.background = window.scrollY > 40 ? 'rgba(10,13,20,0.97)' : 'rgba(10,13,20,0.8)';
}, { passive: true });

// ── INIT ──────────────────────────────────────────────────────────────────────
initAuth().then(() => loadData());
