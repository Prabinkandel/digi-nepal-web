if (['localhost','127.0.0.1'].includes(window.location.hostname) && ['5500', '5501'].includes(window.location.port)) {
  window.location.replace('http://localhost:3001' + window.location.pathname + window.location.search + window.location.hash);
}
const API = '/api';
const WHATSAPP_ICON_SVG = '<svg class="whatsapp-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
const GOOGLE_ICON_SVG = '<svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>';
const state = { user: null, csrf: localStorage.getItem('dn_csrf') || '', category: '', categoryName: '', sort: 'newest', search: '', page: 1, total: 0, catalog: [], searchTimer: null, catalogSearchTimer: null, searchController: null, catalogController: null, providers: { google: false }, pendingAction: null };
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
const formatMoney = amount => new Intl.NumberFormat('en-NP',{style:'currency',currency:'NPR',maximumFractionDigits:0}).format(Number(amount || 0));

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function fetchCsrfToken() {
  try {
    const res = await fetch(API + '/auth/csrf', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data.csrf) {
        state.csrf = data.csrf;
        localStorage.setItem('dn_csrf', state.csrf);
        return data.csrf;
      }
    }
  } catch { void 0; }
  return '';
}

async function api(path, options = {}) {
  const headers = { Accept:'application/json', ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  
  if (!state.csrf) {
    await fetchCsrfToken();
  }
  if (state.csrf) headers['x-csrf-token'] = state.csrf;
  
  const response = await fetch(API + path, { credentials:'same-origin', ...options, headers });
  const payload = response.headers.get('content-type')?.includes('application/json') ? await response.json() : {};
  
  if (!response.ok) {
    if (response.status === 403 && payload.error && payload.error.toLowerCase().includes('csrf')) {
      const newToken = await fetchCsrfToken();
      if (newToken) {
        headers['x-csrf-token'] = newToken;
        const retryRes = await fetch(API + path, { credentials:'same-origin', ...options, headers });
        const retryPayload = retryRes.headers.get('content-type')?.includes('application/json') ? await retryRes.json() : {};
        if (!retryRes.ok) throw new Error(retryPayload.error || 'Something went wrong. Please try again.');
        return retryPayload;
      }
    }
    throw new Error(payload.error || 'Something went wrong. Please try again.');
  }
  return payload;
}

function showDialog(id) { const dialog = $(id); if (dialog && !dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog = $(id); if (dialog && dialog.open) dialog.close(); }
function toast(message, type = '') { const item = document.createElement('div'); item.className = 'toast ' + type; item.textContent = message; $('toast-region').append(item); setTimeout(() => item.remove(), 4500); }

function productSkeletons(count = 8) { return Array.from({length:count}, () => '<article class="product-card skeleton"><div></div></article>').join(''); }
function setProductLoading() { $('product-grid').innerHTML = productSkeletons(); $('catalog-empty').hidden = true; $('pagination').replaceChildren(); if ($('catalog-status')) $('catalog-status').innerHTML = '<span>Loading subscriptions…</span>'; }

/* Pricing helpers: all values come from the live catalogue, never invented. */
function savingsOf(product) {
  const price = Number(product.price || 0);
  const was = Number(product.original_price || 0);
  if (!was || was <= price) return null;
  return { amount: was - price, percent: Math.round(((was - price) / was) * 100) };
}

/* Reads a billing duration out of the real product name/description when the
   merchant stated one (e.g. "Netflix 1 Month"). Nothing is shown otherwise. */
function durationOf(product) {
  const text = (product.name || '') + ' ' + (product.description || '');
  const match = text.match(/(\d+)\s*[-\s]?\s*(year|years|yr|month|months|mo|week|weeks|day|days)\b/i);
  if (!match) return /lifetime/i.test(text) ? 'Lifetime access' : '';
  const count = Number(match[1]);
  const unit = match[2].toLowerCase();
  const name = unit.startsWith('y') ? 'year' : unit.startsWith('mo') || unit === 'm' ? 'month' : unit.startsWith('w') ? 'week' : 'day';
  return count + ' ' + name + (count > 1 ? 's' : '');
}

function productVisual(product, compact = false) {
  const tone = ((product.name || '').charCodeAt(0) % 5);
  const initial = escapeHtml((product.name || '?').slice(0, 1));
  const monogram = '<span class="product-monogram tone-' + tone + '" aria-hidden="true">' + initial + '</span>';
  if (!product.image_url) {
    return '<div class="product-image' + (compact ? ' compact-product-image' : '') + '">' + monogram + '</div>';
  }
  const img = '<img src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(product.name || '') + '" loading="lazy" decoding="async" onload="this.classList.add(\'loaded\')" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'grid\';">';
  const fallback = '<span class="product-monogram tone-' + tone + '" aria-hidden="true" style="display:none">' + initial + '</span>';
  return '<div class="product-image' + (compact ? ' compact-product-image' : '') + '">' + img + fallback + '</div>';
}

function productCard(product) {
  const badge = product.offer_label || product.badge;
  const saving = savingsOf(product);
  const duration = durationOf(product);
  const inStock = product.stock === undefined || product.stock === null || Number(product.stock) > 0;
  const benefits = (product.features || []).slice(0,3).map(feature => '<li>' + escapeHtml(feature) + '</li>').join('');
  const badges = [];
  if (saving) badges.push('<span class="store-badge store-badge-save">-' + saving.percent + '%</span>');
  if (badge) badges.push('<span class="store-badge store-badge-tag">' + escapeHtml(badge) + '</span>');
  return '<article class="product-card">' +
    '<div class="card-visual">' + productVisual(product) +
      (badges.length ? '<div class="card-badges">' + badges.join('') + '</div>' : '') +
    '</div>' +
    '<div class="card-body">' +
      '<p class="product-category">' + escapeHtml(product.category_name || 'DIGITAL SERVICE') + '</p>' +
      '<h3>' + escapeHtml(product.name) + '</h3>' +
      '<p class="product-desc">' + escapeHtml(product.description || 'View subscription details and plan information.') + '</p>' +
      (benefits ? '<ul class="product-benefits">' + benefits + '</ul>' : '') +
      '<div class="card-meta">' +
        (duration ? '<span class="card-meta-item">' + escapeHtml(duration) + '</span>' : '') +
        '<span class="card-meta-stock' + (inStock ? '' : ' is-out') + '">' + (inStock ? 'Available now' : 'Currently unavailable') + '</span>' +
      '</div>' +
      '<div class="price-row">' +
        '<div><small>Price</small><span class="price">' + formatMoney(product.price) + '</span></div>' +
        (saving ? '<div class="price-compare"><small class="was-price">' + formatMoney(product.original_price) + '</small><span class="price-save">Save ' + formatMoney(saving.amount) + '</span></div>' : '') +
      '</div>' +
      '<div class="product-actions">' +
        '<button type="button" class="card-action card-buy" data-buy="' + escapeHtml(product.id) + '" title="Buy online with eSewa / Khalti / QR"' + (inStock ? '' : ' disabled') + '>Buy now</button>' +
        '<button type="button" class="card-action card-view" data-product="' + escapeHtml(product.id) + '">Details</button>' +
        '<button type="button" class="card-action card-whatsapp" data-whatsapp="' + escapeHtml(product.id) + '" aria-label="Order ' + escapeHtml(product.name) + ' via WhatsApp">' + WHATSAPP_ICON_SVG + '<span>WhatsApp</span></button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

async function loadProducts() {
  setProductLoading();
  const query = new URLSearchParams({ page:String(state.page), limit:'12', sort:state.sort });
  if (state.category) query.set('category',state.category);
  if (state.search) query.set('search',state.search);
  if (state.catalogController) state.catalogController.abort();
  state.catalogController = new AbortController();
  try {
    const result = await api('/products?' + query, { signal: state.catalogController.signal });
    const products = result.items || result;
    state.catalog = products;
    state.total = Number(result.total ?? products.length);
    $('product-grid').innerHTML = products.map(productCard).join('');
    $('catalog-empty').hidden = products.length > 0;
    renderCatalogStatus(products.length);
    renderDeals(products);
    renderDiscovery(products);
    renderPages(result.pages || 1);
  } catch (error) {
    if (error.name === 'AbortError') return;
    if ($('catalog-status')) $('catalog-status').replaceChildren();
    $('product-grid').innerHTML = '<div class="catalog-empty"><h3>Couldn’t load subscriptions.</h3><p>' + escapeHtml(error.message) + '</p><button class="button button-quiet" id="retry-products">Try again</button></div>';
    $('retry-products').onclick = loadProducts;
  }
}

function renderCatalogStatus(shown) {
  const status = $('catalog-status');
  if (!status) return;
  if (!shown) { status.replaceChildren(); return; }
  const parts = ['<span>Showing <b>' + shown + '</b> of <b>' + state.total + '</b> subscriptions</span>'];
  if (state.categoryName) parts.push('<button type="button" class="filter-chip" data-clear="category">' + escapeHtml(state.categoryName) + ' <span aria-hidden="true">×</span></button>');
  if (state.search) parts.push('<button type="button" class="filter-chip" data-clear="search">“' + escapeHtml(state.search) + '” <span aria-hidden="true">×</span></button>');
  status.innerHTML = parts.join('');
  status.querySelectorAll('[data-clear]').forEach(chip => {
    chip.onclick = () => {
      if (chip.dataset.clear === 'search') { state.search = ''; const field = $('catalog-search'); if (field) field.value = ''; }
      else selectCategory('');
      state.page = 1;
      loadProducts();
    };
  });
}

/* Deals band: shows only products whose real original_price beats the sale price. */
function renderDeals(products) {
  const section = $('deals'); const grid = $('deals-grid');
  if (!section || !grid) return;
  if (state.search || state.category) { section.hidden = true; return; }
  const deals = products.map(product => ({ product, saving: savingsOf(product) }))
    .filter(entry => entry.saving)
    .sort((a, b) => b.saving.percent - a.saving.percent)
    .slice(0, 4);
  if (!deals.length) { section.hidden = true; return; }
  section.hidden = false;
  grid.innerHTML = deals.map(({ product, saving }) =>
    '<button type="button" class="deal-card" data-deal="' + escapeHtml(product.id) + '" aria-label="View ' + escapeHtml(product.name) + '">' +
      '<div class="deal-card-top">' + dealThumb(product) +
        '<span class="deal-card-title"><small>Save ' + saving.percent + '%</small><strong>' + escapeHtml(product.name) + '</strong></span>' +
      '</div>' +
      '<span class="deal-price"><b>' + formatMoney(product.price) + '</b><s>' + formatMoney(product.original_price) + '</s></span>' +
      '<span class="deal-cta">You save ' + formatMoney(saving.amount) + '<span aria-hidden="true">→</span></span>' +
    '</button>').join('');
  grid.querySelectorAll('[data-deal]').forEach(button => { button.onclick = () => openProduct(button.dataset.deal); });
}

function dealThumb(product) {
  const tone = ((product.name || '').charCodeAt(0) % 5);
  const initial = escapeHtml((product.name || '?').slice(0, 1));
  if (!product.image_url) return '<span class="product-monogram tone-' + tone + '" aria-hidden="true">' + initial + '</span>';
  return '<img class="deal-thumb" src="' + escapeHtml(product.image_url) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">';
}

function renderDiscovery(products) { const rail=$('discovery-rail'); if(!rail) return; rail.innerHTML=products.map(product => '<button class="discovery-card" data-discovery-product="' + escapeHtml(product.id) + '">' + productVisual(product,true) + '<span><small>' + escapeHtml(product.category_name || 'DIGITAL SERVICE') + '</small><strong>' + escapeHtml(product.name) + '</strong><b>' + formatMoney(product.price) + '</b></span></button>').join(''); rail.querySelectorAll('[data-discovery-product]').forEach(button=>button.onclick=()=>openProduct(button.dataset.discoveryProduct)); }

function renderPages(pages) { const holder = $('pagination'); holder.replaceChildren(); if (pages <= 1) return; for (let number=1; number<=pages; number++) { const button = document.createElement('button'); button.className = 'page-button' + (number === state.page ? ' active':''); button.textContent = number; button.ariaLabel = 'Page ' + number; button.onclick = () => { state.page = number; loadProducts(); document.querySelector('#catalog').scrollIntoView({behavior:'smooth'}); }; holder.append(button); } }

async function loadCategories() { try { const result = await api('/categories?limit=100&sort=name'); const categories = result.items || result; const holder = $('category-tabs'); categories.forEach(category => { const button = document.createElement('button'); button.className='category'; button.dataset.category=category.id; button.dataset.categoryName=category.name; button.setAttribute('role','tab'); button.textContent=category.name; button.onclick=() => selectCategory(category.id); holder.append(button); }); } catch { toast('Categories are temporarily unavailable.'); } }

function selectCategory(category) { state.category=category; state.page=1; state.categoryName=''; document.querySelectorAll('.category').forEach(button => { const active=button.dataset.category===category; if (active && category) state.categoryName = button.dataset.categoryName || button.textContent; button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); }); loadProducts(); }

function detailVisual(product) {
  const tone = ((product.name || '').charCodeAt(0) % 5);
  const initial = escapeHtml((product.name || '?').slice(0, 1));
  const monogramStyle = 'width:5.5rem;height:5.5rem;font-size:2.8rem';
  if (!product.image_url) return '<span class="product-monogram tone-' + tone + '" aria-hidden="true" style="' + monogramStyle + '">' + initial + '</span>';
  return '<img src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(product.name) + '" loading="eager" decoding="async" onload="this.classList.add(\'loaded\')" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'grid\';">' +
    '<span class="product-monogram tone-' + tone + '" aria-hidden="true" style="display:none;' + monogramStyle + '">' + initial + '</span>';
}

function detailRelated(product) {
  const related = state.catalog.filter(item => item.id !== product.id && item.category_id === product.category_id).slice(0, 3);
  if (!related.length) return '';
  return '<section class="pd-block"><h2>More in ' + escapeHtml(product.category_name || 'this category') + '</h2><div class="pd-related">' +
    related.map(item => '<button type="button" class="pd-related-card" data-related="' + escapeHtml(item.id) + '">' +
      '<strong>' + escapeHtml(item.name) + '</strong>' +
      '<span>' + formatMoney(item.price) + (savingsOf(item) ? '<s>' + formatMoney(item.original_price) + '</s>' : '') + '</span>' +
    '</button>').join('') + '</div></section>';
}

function detailStaticBlocks() {
  return '<section class="pd-block"><h2>How delivery works</h2><ol class="pd-delivery">' +
      '<li><b>Place your order.</b> Pick WhatsApp or online payment above.</li>' +
      '<li><b>Send your payment.</b> Use eSewa, Khalti, bank transfer or scan the QR, then upload the receipt.</li>' +
      '<li><b>We verify it.</b> Our team confirms the payment against your order reference.</li>' +
      '<li><b>You get your details.</b> Access details are shared once the order is approved, and the status updates in your account.</li>' +
    '</ol></section>' +
    '<section class="pd-block pd-faq"><h2>Common questions</h2>' +
      '<details><summary>Which payment methods can I use?</summary><p>eSewa, Khalti, bank transfer and QR payment. You will see the available options at checkout.</p></details>' +
      '<details><summary>How do I know my order went through?</summary><p>After you submit your payment receipt, the order appears under “My orders” with its current status. You get an update when it is approved.</p></details>' +
      '<details><summary>Who do I contact if something is wrong?</summary><p>Message us on WhatsApp or use the contact form. Include your order reference so we can find it quickly.</p></details>' +
    '</section>';
}

async function openProduct(id) {
  showDialog('product-dialog');
  $('product-detail').innerHTML = '<div class="pd-layout"><div class="pd-media"><div class="product-detail-image skeleton"></div></div><div><p class="eyebrow">LOADING DETAILS</p><h1 id="product-title">Subscription</h1></div></div>';
  try {
    const product = await api('/products/' + encodeURIComponent(id));
    const saving = savingsOf(product);
    const duration = durationOf(product);
    const badge = product.offer_label || product.badge;
    const badges = [];
    if (saving) badges.push('<span class="store-badge store-badge-save">-' + saving.percent + '% off</span>');
    if (badge) badges.push('<span class="store-badge store-badge-tag">' + escapeHtml(badge) + '</span>');
    if (duration) badges.push('<span class="store-badge store-badge-plain">' + escapeHtml(duration) + '</span>');
    const features = (product.features || []).map(feature => '<li>' + escapeHtml(feature) + '</li>').join('');
    $('product-detail').innerHTML = '<div class="pd-layout">' +
      '<div class="pd-media">' +
        '<div class="product-detail-image">' + detailVisual(product) + '</div>' +
        (badges.length ? '<div class="pd-badges">' + badges.join('') + '</div>' : '') +
      '</div>' +
      '<div class="pd-main">' +
        '<div class="pd-head">' +
          '<p class="pd-category">' + escapeHtml((product.category_name || 'SUBSCRIPTION').toUpperCase()) + '</p>' +
          '<h1 id="product-title">' + escapeHtml(product.name) + '</h1>' +
          '<p class="pd-summary">' + escapeHtml(product.description || 'Review this subscription and start your order when ready.') + '</p>' +
        '</div>' +
        '<div class="pd-price-card">' +
          '<div class="pd-price-top">' +
            '<span class="pd-price-main"><small>' + (duration ? escapeHtml(duration.toUpperCase()) : 'TOTAL PRICE') + '</small><b>' + formatMoney(product.price) + '</b></span>' +
            (saving ? '<span class="pd-price-side"><s>' + formatMoney(product.original_price) + '</s><span class="price-save">You save ' + formatMoney(saving.amount) + '</span></span>' : '') +
          '</div>' +
          '<div class="pd-actions">' +
            '<button type="button" class="button" id="start-order" data-id="' + escapeHtml(product.id) + '">Buy now with eSewa / Khalti / QR <span aria-hidden="true">→</span></button>' +
            '<button type="button" class="button button-whatsapp" id="start-whatsapp-order" data-id="' + escapeHtml(product.id) + '">' + WHATSAPP_ICON_SVG + '<span>Order via WhatsApp</span></button>' +
          '</div>' +
          '<ul class="pd-reassure">' +
            '<li>Pay with eSewa, Khalti, bank transfer or QR</li>' +
            '<li>Every payment receipt is checked by our team</li>' +
            '<li>Track the status of your order from your account</li>' +
          '</ul>' +
        '</div>' +
        (features ? '<section class="pd-block"><h2>What you get</h2><ul class="feature-list">' + features + '</ul></section>' : '') +
        detailStaticBlocks() +
        detailRelated(product) +
      '</div>' +
    '</div>';
    $('start-order').onclick = () => startOrder(product.id);
    $('start-whatsapp-order').onclick = () => startWhatsAppOrder(product.id);
    $('product-detail').querySelectorAll('[data-related]').forEach(button => { button.onclick = () => openProduct(button.dataset.related); });
  } catch (error) {
    $('product-detail').innerHTML = '<h2 id="product-title">Couldn’t load this subscription</h2><p>' + escapeHtml(error.message) + '</p>';
  }
}

async function startOrder(productId) {
  if (!productId) return;
  if (!state.user) {
    state.pendingAction = { type: 'order', productId };
    closeDialog('product-dialog');
    openAuth('login');
    toast('Please sign in or create an account to place an order.');
    return;
  }
  try {
    const order = await api('/orders', { method: 'POST', body: JSON.stringify({ product_id: productId, request_key: generateUUID() }) });
    closeDialog('product-dialog');
    openPayment(order);
  } catch (error) {
    toast(error.message, 'error');
  }
}

function paymentReference(order) {
  return String(order.id || '').slice(0, 8).toUpperCase();
}

async function openPayment(order) {
  showDialog('payment-dialog');
  $('payment-content').innerHTML = '<div class="payment-loading"><p class="eyebrow">SECURE PAYMENT</p><h2 id="payment-title">Preparing your payment options</h2><p class="form-note">Loading checkout details…</p></div>';
  try {
    const settings = await api('/settings');
    const methods = (settings.payment_methods || 'eSewa, Khalti, Bank transfer').split(',').map(value => value.trim()).filter(Boolean);
    const amount = Number(order.price || 0);
    const reference = paymentReference(order);
    
    $('payment-content').innerHTML = 
      '<div class="checkout-shell">' +
        '<div class="checkout-header">' +
          '<span class="checkout-badge">ORDER REF: #' + escapeHtml(reference) + '</span>' +
          '<h2 id="payment-title">Choose Payment Method</h2>' +
          '<div class="checkout-product-bar">' +
            '<span>Subscription: <strong>' + escapeHtml(order.product_name) + '</strong></span>' +
            '<span class="checkout-amount">' + formatMoney(amount) + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="checkout-intro">Select how you want to complete your order:</p>' +
        '<div class="payment-options-grid">' +
          '<div class="payment-option-card payment-option-whatsapp">' +
            '<div class="option-icon option-icon-whatsapp">' + WHATSAPP_ICON_SVG + '</div>' +
            '<span class="option-tag option-tag-whatsapp">RECOMMENDED · INSTANT SUPPORT</span>' +
            '<h3>Direct Order via WhatsApp</h3>' +
            '<p>Connect directly with our local support team on WhatsApp to finalize payment and activate your subscription.</p>' +
            '<ul class="option-features">' +
              '<li>✓ Instant 1-on-1 human assistance</li>' +
              '<li>✓ Direct eSewa / Khalti instructions</li>' +
              '<li>✓ Immediate order verification</li>' +
            '</ul>' +
            '<button type="button" class="button-payment-whatsapp" id="pay-opt-whatsapp">' + WHATSAPP_ICON_SVG + '<span>Order & Pay on WhatsApp</span></button>' +
          '</div>' +
          
          '<div class="payment-option-card">' +
            '<div class="option-icon">🔳</div>' +
            '<span class="option-tag">ONLINE QR SCAN</span>' +
            '<h3>Scan QR Code & Upload Proof</h3>' +
            '<p>Scan our official eSewa / Khalti / Bank QR code and upload your payment receipt directly on the web app.</p>' +
            '<ul class="option-features">' +
              '<li>✓ Instant QR code display</li>' +
              '<li>✓ Upload screenshot receipt</li>' +
              '<li>✓ Live status tracking in account</li>' +
            '</ul>' +
            '<button type="button" class="button-payment-qr" id="pay-opt-qr">Pay via QR Code & Upload →</button>' +
          '</div>' +
        '</div>' +
        '<ul class="checkout-trust">' +
          '<li>Your order reference is #' + escapeHtml(reference) + '</li>' +
          '<li>Receipts are reviewed before approval</li>' +
          '<li>Status updates appear under My orders</li>' +
        '</ul>' +
      '</div>';

    $('pay-opt-whatsapp').onclick = () => {
      closeDialog('payment-dialog');
      startWhatsAppOrder(order.product_id);
    };
    $('pay-opt-qr').onclick = () => renderPaymentQrView(order, settings, methods);
  } catch (error) {
    $('payment-content').innerHTML = '<h2 id="payment-title">Payment details are unavailable</h2><p class="form-error">' + escapeHtml(error.message) + '</p>';
  }
}

function renderPaymentQrView(order, settings, methods) {
  const accountId = settings.payment_account || '9705985657';
  const amount = Number(order.price || 0);
  const reference = paymentReference(order);
  const qr = settings.payment_qr_url || 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent('Digi Nepal ' + accountId + ' NPR ' + amount + ' ' + reference);
  
  $('payment-content').innerHTML = '<div class="payment-flow"><div class="payment-step-label"><span>STEP 1 OF 2</span><strong>Pay via QR, then confirm</strong></div><div class="payment-qr-card"><div class="payment-method-badges">' + methods.map(method => '<span>' + escapeHtml(method) + '</span>').join('') + '</div><img class="payment-qr payment-qr-large" src="' + escapeHtml(qr) + '" alt="Payment QR code for ' + formatMoney(amount) + '"><p class="payment-amount-label">AMOUNT TO PAY</p><strong class="payment-amount">' + formatMoney(amount) + '</strong><p class="payment-account">eSewa / Khalti ID <b>' + escapeHtml(accountId) + '</b></p><p class="payment-reference">Order reference: <b>' + escapeHtml(reference) + '</b></p></div><p class="payment-instructions">' + escapeHtml(settings.payment_instructions || 'Scan the QR, include your order reference, and keep the receipt ready.') + '</p><button class="auth-primary" id="payment-next" type="button"><span>I\'ve paid — enter details</span><span aria-hidden="true">→</span></button><button class="payment-back" id="payment-cancel" type="button">← Back to Payment Options</button></div>';
  $('payment-next').onclick = () => renderPaymentDetails(order, settings, methods);
  $('payment-cancel').onclick = () => openPayment(order);
}

function renderPaymentDetails(order, settings, methods) {
  const reference = paymentReference(order);
  $('payment-content').innerHTML = '<div class="payment-flow"><div class="payment-step-label"><span>STEP 2 OF 2</span><strong>Confirm your payment</strong></div><p class="form-note">Enter the transaction reference exactly as shown in your payment app and attach the receipt.</p><form class="payment-form" id="payment-form"><label class="auth-field">Your full name<input name="payer_name" autocomplete="name" value="' + escapeHtml(state.user?.name || '') + '" required minlength="2" maxlength="100"></label><label class="auth-field">Payment method<select name="payment_method" required>' + methods.map(method => '<option value="' + escapeHtml(method) + '">' + escapeHtml(method) + '</option>').join('') + '</select></label><label class="auth-field">Transaction / reference ID<input name="transaction_id" autocomplete="off" required minlength="3" maxlength="100" placeholder="For example, TX12345678"></label><label class="auth-field">Phone number <span class="field-optional">Optional</span><input name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="98xxxxxxxx"></label><label class="auth-field receipt-field">Payment receipt<input name="receipt" type="file" accept="image/png,image/jpeg,image/webp" required><span class="file-help">PNG, JPG, or WebP · maximum 5 MB</span></label><label class="auth-field">Additional note <span class="field-optional">Optional</span><textarea name="note" maxlength="1000" rows="3" placeholder="Anything the payment reviewer should know?"></textarea></label><p class="payment-order-reference">Order reference <b>' + escapeHtml(reference) + '</b></p><p class="auth-alert" id="payment-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Submit payment proof</span><span aria-hidden="true">→</span></button></form><button class="payment-back" type="button" id="payment-back">← Back to QR</button></div>';
  $('payment-form').onsubmit = event => submitPayment(event, order);
  $('payment-back').onclick = () => renderPaymentQrView(order, settings, methods);
}

async function submitPayment(event, order) {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form), file = values.get('receipt'), error = $('payment-error');
  error.hidden = true;
  if (!(file instanceof File) || !file.size) {
    error.textContent = 'Attach your payment receipt to continue.';
    error.hidden = false;
    return;
  }
  setSubmitting(form, true, 'Uploading receipt…');
  try {
    const upload = new FormData();
    upload.append('image', file);
    upload.append('purpose', 'receipt');
    const media = await api('/upload', { method: 'POST', body: upload });
    setSubmitting(form, true, 'Submitting payment…');
    await api('/payments', {
      method: 'POST',
      body: JSON.stringify({
        order_id: order.id,
        payer_name: values.get('payer_name'),
        transaction_id: values.get('transaction_id'),
        payment_method: values.get('payment_method'),
        phone: values.get('phone') || '',
        note: values.get('note') || '',
        media_id: media.id
      })
    });
    const reference = paymentReference(order);
    $('payment-content').innerHTML = '<div class="payment-success"><span class="payment-success-mark" aria-hidden="true">✓</span><p class="eyebrow">PAYMENT RECEIVED</p><h2 id="payment-title">Thanks, your proof is in</h2><p>We’ll review the transaction and update your order after verification.</p><div class="payment-success-summary"><span>Order reference</span><b>' + escapeHtml(reference) + '</b><span>Amount</span><b>' + formatMoney(order.price) + '</b></div><button class="auth-primary" type="button" id="payment-done">Done</button></div>';
    $('payment-done').onclick = () => { closeDialog('payment-dialog'); openOrders(); };
  } catch (errorResponse) {
    error.textContent = errorResponse.message;
    error.hidden = false;
    setSubmitting(form, false, 'Submit payment proof');
  }
}

function renderAccount() {
  const holder = $('account-actions');
  if (!holder) return;
  holder.replaceChildren();
  holder.className = 'account-menu';
  if (state.user) {
    const orders = document.createElement('button');
    orders.className = 'nav-login';
    orders.textContent = 'My account';
    orders.onclick = () => openOrders();
    const logout = document.createElement('button');
    logout.className = 'nav-logout';
    logout.textContent = 'Sign out';
    logout.onclick = logoutUser;
    holder.append(orders, logout);
  } else {
    const loginButton = document.createElement('button');
    loginButton.className = 'nav-login';
    loginButton.textContent = 'Login';
    loginButton.onclick = () => openAuth('login');
    const signupButton = document.createElement('button');
    signupButton.className = 'nav-signup';
    signupButton.textContent = 'Sign up';
    signupButton.onclick = () => openAuth('signup');
    holder.append(loginButton, signupButton);
  }
}

async function initAccount() {
  try {
    const me = await api('/auth/me');
    state.user = me;
    if (me.csrf) {
      state.csrf = me.csrf;
      localStorage.setItem('dn_csrf', state.csrf);
    }
  } catch {
    state.user = null;
    localStorage.removeItem('dn_csrf');
    state.csrf = '';
  }
  renderAccount();
}

function authFrame(eyebrow, title, description, body) {
  return '<div class="auth-shell"><aside class="auth-aside" aria-hidden="true"><img src="logo.png" alt=""><div><p class="auth-kicker">DIGI NEPAL ACCOUNT</p><h3>Premium access,<br>kept simple.</h3><p>Manage orders, payment updates, and subscriptions from one protected place.</p></div><span class="auth-aside-mark">Trusted digital subscriptions</span></aside><section class="auth-panel"><p class="eyebrow">' + eyebrow + '</p><h2 id="auth-title">' + title + '</h2><p class="auth-description">' + description + '</p>' + body + '</section></div>';
}

function authAlert(message) { const alert = $('auth-error'); if (alert) { alert.textContent = message; alert.hidden = false; } }
function passwordField(name, label, autocomplete, strong = false) { return '<label class="auth-field">' + label + '<span class="password-input"><input name="' + name + '" type="password" autocomplete="' + autocomplete + '" required ' + (strong ? 'minlength="12" maxlength="72" aria-describedby="password-help"' : 'maxlength="256"') + '><button class="password-toggle" type="button" data-password-toggle="' + name + '" aria-label="Show ' + label.toLowerCase() + '">Show</button></span></label>'; }

function setupPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(button => button.onclick = () => {
    const input = button.parentElement.querySelector('input');
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    button.textContent = shown ? 'Show' : 'Hide';
    button.setAttribute('aria-label', (shown ? 'Show ' : 'Hide ') + button.closest('label').childNodes[0].textContent.trim().toLowerCase());
  });
}

function setSubmitting(form, submitting, label) {
  const button = form.querySelector('[type="submit"]');
  if (!button) return;
  button.disabled = submitting;
  button.innerHTML = submitting ? '<span class="button-spinner" aria-hidden="true"></span><span>' + label + '</span>' : '<span>' + label + '</span><span aria-hidden="true">→</span>';
}

function resumePendingAction() {
  if (state.pendingAction) {
    const a = state.pendingAction;
    state.pendingAction = null;
    if (a.type === 'order') startOrder(a.productId);
    else if (a.type === 'whatsapp') startWhatsAppOrder(a.productId);
  }
}

function openAuth(mode = 'login', data = {}) {
  showDialog('auth-dialog');
  const email = escapeHtml(data.email || '');
  if (mode === 'signup') {
    const googleBtnHtml = '<a class="auth-google-direct" href="/api/auth/google/start" id="auth-google-signup">' +
      GOOGLE_ICON_SVG +
      '<span>Sign up with Google</span>' +
    '</a>';
    $('auth-content').innerHTML = authFrame('CREATE ACCOUNT', 'Create your account', 'A simple account keeps your orders, payment updates, and subscriptions in one secure place.', googleBtnHtml + '<div class="auth-divider"><span>or register with email</span></div><form class="auth-form" id="signup-form"><label class="auth-field">Full name<input name="name" type="text" autocomplete="name" required maxlength="100"></label><label class="auth-field">Email address<input name="email" type="email" autocomplete="email" required></label>' + passwordField('password', 'Password', 'new-password', true) + passwordField('confirmPassword', 'Confirm password', 'new-password', true) + '<p class="password-help" id="password-help">Use 12 to 72 characters with upper- and lower-case letters, a number, and a symbol.</p><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Create account</span><span aria-hidden="true">→</span></button></form><p class="auth-switch">Already have an account? <button type="button" data-auth-mode="login">Sign in</button></p>');
    $('signup-form').onsubmit = register;
    const directG = $('auth-google-signup');
    if (directG) {
      directG.onclick = () => {
        if (state.pendingAction) {
          try { sessionStorage.setItem('dn_pending_action', JSON.stringify(state.pendingAction)); } catch (e) { void e; }
        }
      };
    }
  } else if (mode === 'forgot') {
    $('auth-content').innerHTML = authFrame('PASSWORD RECOVERY', 'Reset your password', 'Enter your email and we’ll send a recovery code when email delivery is available for this site.', '<form class="auth-form" id="forgot-form"><label class="auth-field">Email address<input name="email" type="email" autocomplete="email" value="' + email + '" required></label><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Send recovery code</span><span aria-hidden="true">→</span></button></form><p class="auth-switch"><button type="button" data-auth-mode="login">Back to sign in</button></p>');
    $('forgot-form').onsubmit = requestPasswordReset;
  } else if (mode === 'reset') {
    $('auth-content').innerHTML = authFrame('PASSWORD RECOVERY', 'Choose a new password', 'Use the code sent to your inbox and choose a strong new password.', '<form class="auth-form" id="reset-form"><label class="auth-field">Email address<input name="email" type="email" autocomplete="email" value="' + email + '" required></label><label class="auth-field">Recovery code<input name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{8}" maxlength="8" required></label>' + passwordField('password', 'New password', 'new-password', true) + passwordField('confirmPassword', 'Confirm password', 'new-password', true) + '<p class="password-help" id="password-help">Use 12 to 72 characters with upper- and lower-case letters, a number, and a symbol.</p><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Reset password</span><span aria-hidden="true">→</span></button></form><p class="auth-switch"><button type="button" data-auth-mode="login">Back to sign in</button></p>');
    $('reset-form').onsubmit = resetPassword;
  } else if (mode === 'mfa') {
    $('auth-content').innerHTML = authFrame('TWO-STEP VERIFICATION', 'Confirm it’s you', 'Enter the code from your authenticator app or a recovery code to continue.', '<form class="auth-form" id="mfa-form"><label class="auth-field">Authentication code<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="16" required autofocus></label><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Verify and sign in</span><span aria-hidden="true">→</span></button></form><p class="auth-switch"><button type="button" data-auth-mode="login">Use a different account</button></p>');
    $('mfa-form').onsubmit = event => login(event, data);
  } else if (mode === 'gmail-otp') {
    const googleBtnHtml = '<a class="auth-google-direct" href="/api/auth/google/start" id="auth-google-otp">' +
      GOOGLE_ICON_SVG +
      '<span>Sign in with Google</span>' +
    '</a>';
    $('auth-content').innerHTML = authFrame('GMAIL VERIFICATION', 'Login with Gmail OTP', 'Enter your email address to receive a instant 6-digit OTP code directly in your inbox.', googleBtnHtml + '<div class="auth-divider"><span>or use 6-digit OTP code</span></div><form class="auth-form" id="gmail-otp-form"><label class="auth-field">Email address<div style="display:flex;gap:8px;"><input name="email" id="gmail-otp-email" type="email" autocomplete="email" value="' + email + '" required placeholder="yourname@gmail.com" style="flex:1;" autofocus><button type="button" class="card-action card-buy" id="send-gmail-otp-btn" style="white-space:nowrap;padding:.5rem .9rem;font-size:.78rem;min-height:auto;">Send OTP</button></div></label><label class="auth-field">6-digit Gmail OTP code<input name="otp" id="gmail-otp-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" required></label><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Verify OTP & Sign in</span><span aria-hidden="true">→</span></button></form><p class="auth-switch">Prefer password sign in? <button type="button" data-auth-mode="login">Password Login</button></p>');
    $('gmail-otp-form').onsubmit = verifyGmailOtp;
    $('send-gmail-otp-btn').onclick = sendGmailOtp;
    const directG = $('auth-google-otp');
    if (directG) {
      directG.onclick = () => {
        if (state.pendingAction) {
          try { sessionStorage.setItem('dn_pending_action', JSON.stringify(state.pendingAction)); } catch (e) { void e; }
        }
      };
    }
  } else {
    const googleBtnHtml = '<a class="auth-google-direct" href="/api/auth/google/start" id="auth-google-direct">' +
      GOOGLE_ICON_SVG +
      '<span>Sign in with Google</span>' +
    '</a>';
    $('auth-content').innerHTML = authFrame('ACCOUNT ACCESS', 'Welcome back', 'Sign in to manage your subscriptions, orders, and account.', googleBtnHtml + '<div class="auth-divider"><span>or sign in with email</span></div><form class="auth-form" id="login-form"><label class="auth-field">Email address<input name="email" type="email" autocomplete="email" value="' + email + '" required autofocus></label>' + passwordField('password', 'Password', 'current-password') + '<div class="auth-options"><button type="button" class="auth-link" data-auth-mode="gmail-otp" style="font-weight:700;color:var(--red-bright);">📧 Login with Gmail OTP</button><button type="button" class="auth-link" data-auth-mode="forgot">Forgot password?</button></div><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Sign in</span><span aria-hidden="true">→</span></button></form><p class="auth-switch">New to Digi Nepal? <button type="button" data-auth-mode="signup">Create account</button></p>');
    $('login-form').onsubmit = login;
    const directG = $('auth-google-direct');
    if (directG) {
      directG.onclick = () => {
        if (state.pendingAction) {
          try { sessionStorage.setItem('dn_pending_action', JSON.stringify(state.pendingAction)); } catch (e) { void e; }
        }
      };
    }
  }
  setupPasswordToggles();
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.onclick = () => openAuth(button.dataset.authMode, { email: button.closest('form')?.elements.email?.value || data.email || '' }));
}

async function sendGmailOtp() {
  const emailInput = $('gmail-otp-email');
  const email = (emailInput?.value || '').trim();
  if (!email || !email.includes('@')) {
    authAlert('Please enter a valid email address.');
    return;
  }
  const btn = $('send-gmail-otp-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  const error = $('auth-error');
  if (error) error.hidden = true;
  try {
    const res = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
    toast(res.message, 'success');
    if (res.dev_otp) {
      toast(`DEV OTP CODE: ${res.dev_otp}`, 'warning');
      const codeInput = $('gmail-otp-code');
      if (codeInput) codeInput.value = res.dev_otp;
    }
    if (btn) {
      let count = 60;
      const timer = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = 'Resend OTP';
        } else {
          btn.textContent = `Resend (${count}s)`;
        }
      }, 1000);
    }
  } catch (err) {
    authAlert(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Send OTP'; }
  }
}

async function verifyGmailOtp(event) {
  event.preventDefault();
  const email = ($('gmail-otp-email')?.value || '').trim();
  const otp = ($('gmail-otp-code')?.value || '').trim();
  if (!email || !otp) {
    authAlert('Please enter both your email address and 6-digit OTP code.');
    return;
  }
  const form = event.currentTarget;
  setSubmitting(form, true, 'Verifying OTP…');
  const error = $('auth-error');
  if (error) error.hidden = true;
  try {
    const result = await api('/auth/login-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
    state.user = result.user;
    state.csrf = result.csrf || result.token || '';
    localStorage.setItem('dn_csrf', state.csrf);
    closeDialog('auth-dialog');
    renderAccount();
    toast(`Welcome back, ${state.user.name}! Signed in via Gmail OTP.`);
    resumePendingAction();
  } catch (err) {
    authAlert(err.message);
    setSubmitting(form, false, 'Verify OTP & Sign in');
  }
}

async function login(event, pending = {}) {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form), email = String(pending.email || values.get('email') || '').trim(), password = String(pending.password || values.get('password') || '');
  setSubmitting(form, true, 'Signing in…');
  const error = $('auth-error');
  error.hidden = true;
  try {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, code: values.get('code') || undefined }) });
    if (result.requires_mfa) { openAuth('mfa', { email, password }); return; }
    state.user = result.user;
    state.csrf = result.csrf || result.token || '';
    localStorage.setItem('dn_csrf', state.csrf);
    closeDialog('auth-dialog');
    renderAccount();
    toast('You are signed in.');
    resumePendingAction();
  } catch (err) {
    authAlert(err.message);
    setSubmitting(form, false, 'Sign in');
  }
}

function validateNewPassword(password, confirmPassword) {
  if (password !== confirmPassword) return 'Passwords do not match.';
  if (password.length < 12 || password.length > 72) return 'Use a password between 12 and 72 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'Use upper- and lower-case letters, a number, and a symbol.';
  return '';
}

async function register(event) {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form), password = String(values.get('password') || ''), confirmPassword = String(values.get('confirmPassword') || ''), validation = validateNewPassword(password, confirmPassword);
  if (validation) { authAlert(validation); return; }
  setSubmitting(form, true, 'Creating account…');
  try {
    const email = String(values.get('email') || '').trim(), result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: values.get('name'), email, password }) });
    if (result.user) {
      state.user = result.user;
      state.csrf = result.csrf || result.token || '';
      localStorage.setItem('dn_csrf', state.csrf);
      closeDialog('auth-dialog');
      renderAccount();
      toast('Your account is ready.');
      resumePendingAction();
      return;
    }
    $('auth-content').innerHTML = authFrame('EMAIL CONFIRMATION', 'Confirm your email', 'Enter the verification code sent to your inbox to complete your account.', '<form class="auth-form" id="verify-form"><label class="auth-field">Email address<input name="email" type="email" autocomplete="email" value="' + escapeHtml(email) + '" required readonly></label><label class="auth-field">Verification code<input name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{8}" maxlength="8" required autofocus></label><p class="auth-alert" id="auth-error" role="alert" hidden></p><button class="auth-primary" type="submit"><span>Confirm email</span><span aria-hidden="true">→</span></button></form><p class="auth-switch"><button type="button" data-auth-mode="login">Back to sign in</button></p>');
    $('verify-form').onsubmit = verifyRegistration;
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.onclick = () => openAuth(button.dataset.authMode, { email }));
  } catch (err) {
    authAlert(err.message);
    setSubmitting(form, false, 'Create account');
  }
}

async function verifyRegistration(event) {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form);
  setSubmitting(form, true, 'Confirming…');
  try {
    await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email: values.get('email'), otp: values.get('otp') }) });
    openAuth('login', { email: values.get('email') });
    toast('Your email is confirmed. Sign in to continue.');
  } catch (err) {
    authAlert(err.message);
    setSubmitting(form, false, 'Confirm email');
  }
}

async function requestPasswordReset(event) {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form), email = String(values.get('email') || '').trim();
  setSubmitting(form, true, 'Sending…');
  try {
    await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    openAuth('reset', { email });
    toast('If the address is eligible, a recovery code is on its way.');
  } catch (err) {
    authAlert(err.message);
    setSubmitting(form, false, 'Send recovery code');
  }
}

async function resetPassword(event) {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form), password = String(values.get('password') || ''), confirmPassword = String(values.get('confirmPassword') || ''), validation = validateNewPassword(password, confirmPassword);
  if (validation) { authAlert(validation); return; }
  setSubmitting(form, true, 'Resetting…');
  try {
    await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: values.get('email'), otp: values.get('otp'), password }) });
    openAuth('login', { email: values.get('email') });
    toast('Password reset. You can now sign in.');
  } catch (err) {
    authAlert(err.message);
    setSubmitting(form, false, 'Reset password');
  }
}

async function logoutUser() {
  try { await api('/auth/logout', { method: 'POST', body: '{}' }); } catch { void 0; }
  state.user = null;
  state.csrf = '';
  localStorage.removeItem('dn_csrf');
  renderAccount();
  toast('You are signed out.');
}

async function openOrders() {
  if (!state.user) { openAuth('login'); return; }
  showDialog('orders-dialog');
  $('orders-content').innerHTML = '<div class="profile-shell"><h2 id="orders-title">My Profile & Account</h2><p class="form-note">Loading your profile and order details…</p></div>';
  try {
    const result = await api('/orders/my?limit=50');
    const orders = result.items || result;
    const initial = (state.user.name || '?').charAt(0).toUpperCase();
    
    const ordersListHtml = orders.length ? orders.map(order => {
      const statusClass = 'status-' + escapeHtml(order.status);
      return '<article class="order-item">' +
        '<div class="order-item-header">' +
          '<div>' +
            '<h4>' + escapeHtml(order.product_name) + '</h4>' +
            '<p class="order-meta">' + formatMoney(order.price) + ' · Reference <b>' + escapeHtml(String(order.id).slice(0, 8).toUpperCase()) + '</b></p>' +
          '</div>' +
          '<span class="status-pill ' + statusClass + '">' + escapeHtml(order.status) + '</span>' +
        '</div>' +
        (order.note ? '<p class="order-note">' + escapeHtml(order.note) + '</p>' : '') +
        (!order.payment_id && order.status === 'pending' ? '<button type="button" class="order-pay" data-pay-order="' + escapeHtml(order.id) + '" data-pay-name="' + escapeHtml(order.product_name) + '" data-pay-price="' + escapeHtml(order.price) + '">Complete payment <span>→</span></button>' : '') +
      '</article>';
    }).join('') : '<div class="catalog-empty"><p>You haven’t placed any orders yet.</p><a href="#catalog" class="button button-small" onclick="closeDialog(\'orders-dialog\')">Explore subscriptions</a></div>';
    
    $('orders-content').innerHTML = 
      '<div class="profile-shell">' +
        '<div class="profile-card">' +
          '<div class="profile-avatar">' + escapeHtml(initial) + '</div>' +
          '<div class="profile-info">' +
            '<h3>' + escapeHtml(state.user.name) + '</h3>' +
            '<p>' + escapeHtml(state.user.email) + '</p>' +
            '<span class="profile-badge">Active Customer</span>' +
          '</div>' +
        '</div>' +
        
        '<h3 class="orders-section-title">Customer Details</h3>' +
        '<div class="profile-details-grid">' +
          '<div class="profile-field"><small>Full Name</small><span>' + escapeHtml(state.user.name) + '</span></div>' +
          '<div class="profile-field"><small>Email Address</small><span>' + escapeHtml(state.user.email) + '</span></div>' +
          '<div class="profile-field"><small>Account ID</small><span>' + escapeHtml(String(state.user.id || '').slice(0, 12)) + '...</span></div>' +
          '<div class="profile-field"><small>Two-Step Security</small><span>' + (state.user.mfa_enabled ? 'Enabled ✓' : 'Standard') + '</span></div>' +
        '</div>' +
        
        '<h3 class="orders-section-title">My Orders & Subscriptions</h3>' +
        '<div class="order-list">' + ordersListHtml + '</div>' +
      '</div>';
      
    $('orders-content').querySelectorAll('[data-pay-order]').forEach(button => button.onclick = () => { closeDialog('orders-dialog'); openPayment({ id: button.dataset.payOrder, product_name: button.dataset.payName, price: Number(button.dataset.payPrice) }); });
  } catch (error) {
    $('orders-content').innerHTML = '<div class="profile-shell"><h2 id="orders-title">My Account</h2><p class="form-error">' + escapeHtml(error.message) + '</p></div>';
  }
}

function setupSearch() {
  const input = $('search-input');
  if (!input) return;
  $('search-button').onclick = () => { showDialog('search-dialog'); input.focus(); };
  input.addEventListener('input', () => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(() => search(input.value), 350); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); showDialog('search-dialog'); input.focus(); }
    if (event.key === 'Escape') document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  });
}

function setupMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('motion-ready');
  const targets = document.querySelectorAll('.section-heading, .reason-copy, .reason-list, .faq-layout > div, .steps li, .trustbar, .final-cta .container');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('motion-visible'); observer.unobserve(entry.target); }
  }), { threshold: .14, rootMargin: '0px 0px -28px' });
  targets.forEach(target => observer.observe(target));
}

async function search(value) {
  const holder = $('search-results');
  if (!holder) return;
  if (value.trim().length < 2) { holder.innerHTML = '<p class="form-note">Type at least two characters to search the catalogue.</p>'; return; }
  if (state.searchController) state.searchController.abort();
  state.searchController = new AbortController();
  holder.innerHTML = '<p class="form-note">Searching subscriptions…</p>';
  try {
    const result = await api('/products?limit=6&search=' + encodeURIComponent(value), { signal: state.searchController.signal });
    const products = result.items || result;
    holder.innerHTML = products.length ? products.map(product => '<button type="button" class="search-result" data-search-product="' + escapeHtml(product.id) + '"><span>' + escapeHtml(product.name) + '</span><small>' + formatMoney(product.price) + ' →</small></button>').join('') : '<p class="form-note">No subscriptions match that search.</p>';
    holder.querySelectorAll('[data-search-product]').forEach(button => button.onclick = () => { closeDialog('search-dialog'); openProduct(button.dataset.searchProduct); });
  } catch (error) {
    if (error.name !== 'AbortError') holder.innerHTML = '<p class="form-error">' + escapeHtml(error.message) + '</p>';
  }
}

async function loadProviders() { try { state.providers = await api('/auth/providers'); } catch { state.providers = { google: false }; } }

async function loadSettings() {
  try {
    const settings = await api('/settings');
    if ($('footer-text')) $('footer-text').textContent = settings.footer_text || $('footer-text').textContent;
    if (settings.contact_email && $('contact-email')) { $('contact-email').textContent = settings.contact_email; $('contact-email').href = 'mailto:' + settings.contact_email; }
    if (settings.whatsapp_number && $('contact-whatsapp')) { $('contact-whatsapp').href = 'https://wa.me/' + settings.whatsapp_number; }
    if (settings.whatsapp_number && $('whatsapp-float')) { $('whatsapp-float').href = 'https://wa.me/' + settings.whatsapp_number + '?text=' + encodeURIComponent('Hello Digi Nepal, I want to order a subscription.'); }
  } catch { void 0; }
}

function bindUI() {
  const menuBtn = $('menu-button');
  const navShell = document.querySelector('.nav-shell');
  if (menuBtn && navShell) {
    const closeMenu = () => {
      navShell.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    };
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      const expanded = navShell.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', String(expanded));
    };
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('click', (e) => {
      if (navShell.classList.contains('menu-open') && !navShell.contains(e.target)) {
        closeMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navShell.classList.contains('menu-open')) {
        closeMenu();
      }
    });
  }
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => closeDialog(button.dataset.close));
  if ($('footer-login')) $('footer-login').onclick = () => openAuth('login');
  if ($('footer-orders')) $('footer-orders').onclick = openOrders;
  if ($('reset-filter')) $('reset-filter').onclick = () => { state.search = ''; const field = $('catalog-search'); if (field) field.value = ''; selectCategory(''); };
  if ($('product-sort')) $('product-sort').onchange = event => { state.sort = event.target.value; state.page = 1; loadProducts(); };
  if ($('catalog-search')) {
    const field = $('catalog-search');
    const wrap = $('catalog-search-wrap');
    const syncClear = () => { if (wrap) wrap.classList.toggle('has-value', field.value.length > 0); };
    const applySearch = () => { state.search = field.value.trim(); state.page = 1; loadProducts(); };
    field.addEventListener('input', () => { syncClear(); clearTimeout(state.catalogSearchTimer); state.catalogSearchTimer = setTimeout(applySearch, 350); });
    field.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(state.catalogSearchTimer); applySearch(); } });
    if ($('catalog-search-clear')) $('catalog-search-clear').onclick = () => { field.value = ''; syncClear(); clearTimeout(state.catalogSearchTimer); applySearch(); field.focus(); };
  }
  if ($('discovery-prev')) $('discovery-prev').onclick = () => $('discovery-rail').scrollBy({ left: -320, behavior: 'smooth' });
  if ($('discovery-next')) $('discovery-next').onclick = () => $('discovery-rail').scrollBy({ left: 320, behavior: 'smooth' });
  
  const grid = $('product-grid');
  if (grid) {
    grid.addEventListener('click', event => {
      const waBtn = event.target.closest('[data-whatsapp]');
      if (waBtn) {
        event.preventDefault();
        startWhatsAppOrder(waBtn.dataset.whatsapp);
        return;
      }
      const buyBtn = event.target.closest('[data-buy]');
      if (buyBtn) {
        event.preventDefault();
        startOrder(buyBtn.dataset.buy);
        return;
      }
      const viewBtn = event.target.closest('[data-product]');
      if (viewBtn) {
        event.preventDefault();
        openProduct(viewBtn.dataset.product);
        return;
      }
    });
  }

  setupDiscoveryAutoScroll();
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
}

function setupDiscoveryAutoScroll() {
  const rail = $('discovery-rail');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !rail) return;
  let paused = false;
  let resumeTimer;
  const pause = () => { paused = true; clearTimeout(resumeTimer); };
  const resume = () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { paused = false; }, 2400); };
  ['mouseenter', 'focusin', 'pointerdown', 'touchstart'].forEach(type => rail.addEventListener(type, pause, { passive: true }));
  ['mouseleave', 'focusout'].forEach(type => rail.addEventListener(type, resume, { passive: true }));
  setInterval(() => {
    if (paused || rail.scrollWidth <= rail.clientWidth) return;
    if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2) rail.scrollTo({ left: 0, behavior: 'smooth' });
    else rail.scrollLeft += 1;
  }, 90);
}

function setupLegacyPaymentActions() {
  const detail = $('product-detail'); if (!detail) return;
  const observer = new MutationObserver(() => {
    const start = $('start-order'); if (!start || detail.querySelector('.payment-shortcuts')) return;
    const id = start.dataset.id; const wrap = document.createElement('div'); wrap.className = 'payment-shortcuts';
    const qr = document.createElement('button'); qr.type = 'button'; qr.className = 'payment-alt payment-alt-primary'; qr.textContent = 'Pay via QR / eSewa / Khalti'; qr.onclick = () => startOrder(id);
    const whatsapp = document.createElement('button'); whatsapp.type = 'button'; whatsapp.className = 'payment-alt payment-alt-whatsapp'; whatsapp.innerHTML = WHATSAPP_ICON_SVG + '<span>Order via WhatsApp</span>'; whatsapp.onclick = () => startWhatsAppOrder(id);
    wrap.append(qr, whatsapp); start.insertAdjacentElement('afterend', wrap);
  });
  observer.observe(detail, { childList: true, subtree: true });
}

async function startWhatsAppOrder(productId) {
  if (!productId) return;
  if (!state.user) { state.pendingAction = { type: 'whatsapp', productId }; closeDialog('product-dialog'); openAuth('login'); toast('Please sign in or create an account to order via WhatsApp.'); return; }
  try {
    const order = await api('/orders', { method: 'POST', body: JSON.stringify({ product_id: productId, request_key: generateUUID() }) });
    const settings = await api('/settings');
    if (!settings.whatsapp_number) throw new Error('WhatsApp support is not configured.');
    const message = 'Hello Digi Nepal, I want to order ' + order.product_name + ' (' + formatMoney(order.price) + '). Order reference: ' + paymentReference(order);
    window.open('https://wa.me/' + settings.whatsapp_number + '?text=' + encodeURIComponent(message), '_blank', 'noopener');
    closeDialog('product-dialog');
    toast('Order created! Continue in WhatsApp to finalize details.');
  } catch (error) { toast(error.message, 'error'); }
}

async function init() {
  if ($('year')) $('year').textContent = new Date().getFullYear();
  bindUI();
  setupSearch();
  setupMotion();
  setProductLoading();
  setupLegacyPaymentActions();
  await Promise.allSettled([initAccount(), loadProviders(), loadCategories(), loadSettings(), loadProducts()]);

  const urlParams = new URLSearchParams(window.location.search);
  const authQuery = urlParams.get('auth');
  if (authQuery === 'google') {
    toast('Welcome! Signed in with Google.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      const saved = sessionStorage.getItem('dn_pending_action');
      if (saved) {
        state.pendingAction = JSON.parse(saved);
        sessionStorage.removeItem('dn_pending_action');
        resumePendingAction();
      }
    } catch (e) { void e; }
  } else if (authQuery === 'google-unavailable') {
    toast('Google sign-in is currently unavailable.', 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

init();
