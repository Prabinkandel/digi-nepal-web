const API='/api';
let token=localStorage.getItem('tv_token'),adminUser=null;

const $=id=>document.getElementById(id);
const fmt=n=>`Rs ${Number(n).toLocaleString()}`;

async function api(path,opts={}){
  const h={'Content-Type':'application/json'};
  if(token)h['Authorization']=`Bearer ${token}`;
  const r=await fetch(API+path,{...opts,headers:{...h,...(opts.headers||{})}});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
}

function toast(msg,type='success'){
  const t=$('a-toast');t.textContent=msg;t.className=`toast ${type} show`;
  setTimeout(()=>t.classList.remove('show'),3000);
}

function confirm(msg,cb){
  $('confirm-overlay').hidden=false;
  $('confirm-msg').textContent=msg;
  $('confirm-yes').onclick=()=>{$('confirm-overlay').hidden=true;cb();};
  $('confirm-no').onclick=()=>$('confirm-overlay').hidden=true;
}

function openDrawer(title,html,onSave){
  $('drawer-title').textContent=title;
  $('drawer-body').innerHTML=html;
  $('drawer-overlay').hidden=false;
  const saveBtn=$('drawer-save');
  if(saveBtn)saveBtn.onclick=onSave;
}
function closeDrawer(){$('drawer-overlay').hidden=true;}
$('drawer-close').onclick=closeDrawer;
$('drawer-overlay').addEventListener('click',e=>{if(e.target===$('drawer-overlay'))closeDrawer();});

// LOGIN
$('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('login-btn');btn.disabled=true;btn.textContent='Signing in...';
  try{
    const d=await api('/auth/login',{method:'POST',body:JSON.stringify({email:$('l-email').value,password:$('l-pass').value})});
    if(d.user.role!=='admin')throw new Error('Admin access required');
    token=d.token;adminUser=d.user;
    localStorage.setItem('tv_token',token);
    $('login-screen').hidden=true;$('admin-app').hidden=false;
    $('admin-name-display').textContent=`👤 ${adminUser.name}`;
    navigate('dashboard');
  }catch(err){
    $('login-error').textContent=err.message;$('login-error').hidden=false;
    btn.disabled=false;btn.textContent='Login to Admin';
  }
});

$('admin-logout').onclick=()=>{localStorage.removeItem('tv_token');location.reload();};
$('sidebar-toggle').onclick=()=>$('sidebar').classList.toggle('open');

// NAV
document.querySelectorAll('.nav-item').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    navigate(a.dataset.page);
  });
});

const pageTitles={dashboard:'Dashboard',products:'Products',categories:'Categories',orders:'Orders',offers:'Flash Offers',payments:'Payments',users:'Users'};
function navigate(page){
  $('page-title').textContent=pageTitles[page]||page;
  const pages={dashboard:renderDashboard,products:renderProducts,categories:renderCategories,orders:renderOrders,offers:renderOffers,payments:renderPayments,users:renderUsers};
  if(pages[page])pages[page]();
}

// DASHBOARD
async function renderDashboard(){
  $('page-content').innerHTML=`<div style="color:var(--text3);text-align:center;padding:40px">Loading...</div>`;
  try{
    const s=await api('/users/stats');
    $('page-content').innerHTML=`
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-card-icon">📦</div><div class="stat-card-val">${s.totalProducts}</div><div class="stat-card-label">Active Products</div></div>
        <div class="stat-card green"><div class="stat-card-icon">✅</div><div class="stat-card-val">${s.totalOrders}</div><div class="stat-card-label">Total Orders</div></div>
        <div class="stat-card orange"><div class="stat-card-icon">⏳</div><div class="stat-card-val">${s.pendingOrders}</div><div class="stat-card-label">Pending Orders</div></div>
        <div class="stat-card violet"><div class="stat-card-icon">👥</div><div class="stat-card-val">${s.totalUsers}</div><div class="stat-card-label">Customers</div></div>
        <div class="stat-card green"><div class="stat-card-icon">💰</div><div class="stat-card-val">${fmt(s.revenue)}</div><div class="stat-card-label">Verified Revenue</div></div>
      </div>
      <div class="recent-orders">
        <h3>Recent Orders</h3>
        ${s.recentOrders.map(o=>`
          <div class="order-row">
            <div class="order-info"><div class="name">${o.product_name}</div><div class="sub">${o.user_name||'Unknown'} · ${new Date(o.created_at).toLocaleDateString()}</div></div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="order-price">${fmt(o.price)}</span>
              <span class="badge badge-${o.status}">${o.status}</span>
            </div>
          </div>`).join('')}
      </div>`;
  }catch(e){$('page-content').innerHTML=`<div style="color:var(--sale);padding:20px">${e.message}</div>`;}
}

// PRODUCTS
async function renderProducts(){
  $('page-content').innerHTML=`<div style="color:var(--text3);text-align:center;padding:40px">Loading...</div>`;
  const [products,cats]=await Promise.all([api('/products'),api('/categories')]);
  const catMap={};cats.forEach(c=>catMap[c.id]=c);
  $('page-content').innerHTML=`
    <div class="section-header">
      <h2>Products <span style="color:var(--text3);font-weight:400;font-size:1rem">(${products.length})</span></h2>
      <button class="btn-primary" id="add-product-btn">+ Add Product</button>
    </div>
    <div class="table-wrap">
      <div class="table-header">
        <h3>All Products</h3>
        <div class="table-controls">
          <input class="search-box" id="prod-search" placeholder="Search..."/>
          <select class="filter-select" id="prod-cat-filter">
            <option value="">All Categories</option>
            ${cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Badge</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="prod-tbody">${renderProductRows(products,catMap)}</tbody>
      </table></div>
    </div>`;
  $('add-product-btn').onclick=()=>openProductForm(null,cats);
  $('prod-search').addEventListener('input',()=>{
    const q=$('prod-search').value.toLowerCase();
    const filtered=products.filter(p=>p.name.toLowerCase().includes(q));
    $('prod-tbody').innerHTML=renderProductRows(filtered,catMap);
    attachProductActions(filtered,cats);
  });
  $('prod-cat-filter').addEventListener('change',()=>{
    const cid=$('prod-cat-filter').value;
    const filtered=cid?products.filter(p=>p.category_id===cid):products;
    $('prod-tbody').innerHTML=renderProductRows(filtered,catMap);
    attachProductActions(filtered,cats);
  });
  attachProductActions(products,cats);
}

function renderProductRows(products,catMap){
  if(!products.length)return`<tr class="empty-row"><td colspan="6">No products found</td></tr>`;
  return products.map(p=>`
    <tr data-id="${p.id}">
      <td><div style="display:flex;align-items:center;gap:10px">
        ${p.image_url?`<img src="${p.image_url}" class="td-img" alt=""/>`:`<div class="td-icon">${p.category_icon||'📦'}</div>`}
        <div><div class="td-name">${p.name}</div><div class="td-sub">${fmt(p.price)}</div></div>
      </div></td>
      <td>${catMap[p.category_id]?.name||'-'}</td>
      <td>${fmt(p.price)}${p.original_price?`<br/><span style="color:var(--text3);text-decoration:line-through;font-size:.8rem">${fmt(p.original_price)}</span>`:''}</td>
      <td>${p.badge?`<span class="badge badge-${p.badge==='sale'?'pending':p.badge==='popular'?'verified':'active'}">${p.badge}</span>`:'—'}</td>
      <td><span class="badge ${p.is_active?'badge-active':'badge-inactive'}">${p.is_active?'Active':'Hidden'}</span></td>
      <td><div class="td-actions">
        <button class="btn-outline btn-sm edit-prod" data-id="${p.id}">Edit</button>
        <button class="btn-danger btn-sm del-prod" data-id="${p.id}">${p.is_active?'Hide':'Show'}</button>
      </div></td>
    </tr>`).join('');
}

function attachProductActions(products,cats){
  document.querySelectorAll('.edit-prod').forEach(b=>b.onclick=()=>{
    const p=products.find(x=>x.id===b.dataset.id);if(p)openProductForm(p,cats);
  });
  document.querySelectorAll('.del-prod').forEach(b=>b.onclick=()=>{
    const p=products.find(x=>x.id===b.dataset.id);if(!p)return;
    confirm(`${p.is_active?'Hide':'Show'} "${p.name}"?`,async()=>{
      await api(`/products/${p.id}`,{method:p.is_active?'DELETE':'PUT',body:JSON.stringify({...p,is_active:1})});
      toast('Product updated'); renderProducts();
    });
  });
}

function openProductForm(p,cats){
  const feats=p?JSON.parse(p.features||'[]'):[];
  openDrawer(p?'Edit Product':'Add Product',`
    <div class="form-group"><label>Product Name *</label><input id="f-name" value="${p?.name||''}"/></div>
    <div class="form-group"><label>Category</label>
      <select id="f-cat">${cats.map(c=>`<option value="${c.id}" ${p?.category_id===c.id?'selected':''}>${c.name}</option>`).join('')}</select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Price (Rs) *</label><input id="f-price" type="number" value="${p?.price||''}"/></div>
      <div class="form-group"><label>Original Price</label><input id="f-orig" type="number" value="${p?.original_price||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Discount %</label><input id="f-disc" type="number" value="${p?.discount||0}"/></div>
      <div class="form-group"><label>Badge</label>
        <select id="f-badge">
          <option value="">None</option>
          ${['sale','popular','cheap','lifetime'].map(b=>`<option value="${b}" ${p?.badge===b?'selected':''}>${b}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label>Rating</label><input id="f-rating" type="number" step="0.1" min="1" max="5" value="${p?.rating||4.8}"/></div>
    <div class="form-group"><label>Description</label><textarea id="f-desc">${p?.description||''}</textarea></div>
    <div class="form-group"><label>Features (one per line)</label><textarea id="f-feats" style="min-height:100px">${feats.join('\n')}</textarea></div>
    <div class="form-group"><label>Product Image</label>
      <div class="upload-zone" id="upload-zone">
        <p>Click to upload image (JPG, PNG, WebP — max 5MB)</p>
        <input type="file" id="f-img-file" accept="image/*" style="display:none"/>
      </div>
      <div class="upload-preview" id="upload-preview">
        ${p?.image_url?`<img src="${p.image_url}" alt=""/><span style="font-size:.82rem;color:var(--text3)">Current image</span>`:''}
      </div>
      <input type="hidden" id="f-img-url" value="${p?.image_url||''}"/>
    </div>
    <div class="form-actions">
      <button class="btn-outline" onclick="closeDrawer()">Cancel</button>
      <button class="btn-primary" id="drawer-save">Save Product</button>
    </div>`,
    async()=>{
      const imgFile=$('f-img-file').files[0];
      let imgUrl=$('f-img-url').value;
      if(imgFile){
        const fd=new FormData();fd.append('image',imgFile);
        const h={};if(token)h['Authorization']=`Bearer ${token}`;
        const r=await fetch(API+'/upload',{method:'POST',headers:h,body:fd});
        const d=await r.json();
        if(!r.ok)return toast(d.error,'error');
        imgUrl=d.url;
      }
      const featsArr=$('f-feats').value.split('\n').map(x=>x.trim()).filter(Boolean);
      const body={name:$('f-name').value,category_id:$('f-cat').value,price:+$('f-price').value,
        original_price:+$('f-orig').value||null,discount:+$('f-disc').value||0,
        badge:$('f-badge').value||null,rating:+$('f-rating').value||4.8,
        description:$('f-desc').value,features:featsArr,image_url:imgUrl,is_active:1};
      try{
        if(p)await api(`/products/${p.id}`,{method:'PUT',body:JSON.stringify(body)});
        else await api('/products',{method:'POST',body:JSON.stringify(body)});
        closeDrawer();toast('Product saved!');renderProducts();
      }catch(e){toast(e.message,'error');}
    }
  );
  $('upload-zone').onclick=()=>$('f-img-file').click();
  $('f-img-file').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const url=URL.createObjectURL(f);
    $('upload-preview').innerHTML=`<img src="${url}" alt=""/><span style="font-size:.82rem;color:var(--text3)">${f.name}</span>`;
  };
}

// CATEGORIES
async function renderCategories(){
  const cats=await api('/categories');
  $('page-content').innerHTML=`
    <div class="section-header"><h2>Categories</h2><button class="btn-primary" id="add-cat-btn">+ Add Category</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Category</th><th>Icon</th><th>Products</th><th>Actions</th></tr></thead>
      <tbody>${cats.map(c=>`
        <tr>
          <td><div class="td-name">${c.name}</div></td>
          <td><span style="font-size:1.5rem">${c.icon}</span></td>
          <td>—</td>
          <td><div class="td-actions">
            <button class="btn-outline btn-sm" onclick='openCatForm(${JSON.stringify(c)})'>Edit</button>
            <button class="btn-danger btn-sm" onclick="delCat('${c.id}','${c.name}')">Delete</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  $('add-cat-btn').onclick=()=>openCatForm(null);
}

window.openCatForm=function(c){
  openDrawer(c?'Edit Category':'Add Category',`
    <div class="form-group"><label>Name *</label><input id="c-name" value="${c?.name||''}"/></div>
    <div class="form-group"><label>Icon (emoji)</label><input id="c-icon" value="${c?.icon||'📦'}" style="font-size:1.5rem;text-align:center"/></div>
    <div class="form-group"><label>Color Gradient (CSS)</label><input id="c-color" value="${c?.color||'linear-gradient(135deg,#667eea,#764ba2)'}" placeholder="linear-gradient(...)"/></div>
    <div class="form-group"><label>Sort Order</label><input id="c-sort" type="number" value="${c?.sort_order||0}"/></div>
    <div class="form-actions">
      <button class="btn-outline" onclick="closeDrawer()">Cancel</button>
      <button class="btn-primary" id="drawer-save">Save</button>
    </div>`,
    async()=>{
      const body={name:$('c-name').value,icon:$('c-icon').value,color:$('c-color').value,sort_order:+$('c-sort').value};
      try{
        if(c)await api(`/categories/${c.id}`,{method:'PUT',body:JSON.stringify(body)});
        else await api('/categories',{method:'POST',body:JSON.stringify(body)});
        closeDrawer();toast('Category saved!');renderCategories();
      }catch(e){toast(e.message,'error');}
    }
  );
};

window.delCat=function(id,name){
  confirm(`Delete category "${name}"?`,async()=>{
    await api(`/categories/${id}`,{method:'DELETE'});
    toast('Category deleted');renderCategories();
  });
};

// ORDERS
async function renderOrders(){
  const orders=await api('/orders/all');
  $('page-content').innerHTML=`
    <div class="section-header"><h2>Orders</h2>
      <select class="filter-select" id="order-filter">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
        <option value="delivered">Delivered</option>
      </select>
    </div>
    <div class="table-wrap"><div style="overflow-x:auto"><table>
      <thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Price</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody id="orders-tbody">${renderOrderRows(orders)}</tbody>
    </table></div></div>`;
  $('order-filter').onchange=async()=>{
    const s=$('order-filter').value;
    const all=s?await api(`/orders/all?status=${s}`):await api('/orders/all');
    $('orders-tbody').innerHTML=renderOrderRows(all);
    attachOrderActions(all);
  };
  attachOrderActions(orders);
}

function renderOrderRows(orders){
  if(!orders.length)return`<tr class="empty-row"><td colspan="7">No orders</td></tr>`;
  return orders.map(o=>`
    <tr>
      <td><code style="font-size:.8rem;color:var(--blue-light)">#${o.id.split('-')[0].toUpperCase()}</code></td>
      <td><div class="td-name">${o.user_name||'—'}</div><div class="td-sub">${o.user_email||''}</div></td>
      <td>${o.product_name}</td>
      <td>${fmt(o.price)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td style="font-size:.8rem;color:var(--text3)">${new Date(o.created_at).toLocaleDateString()}</td>
      <td><div class="td-actions">
        <select class="filter-select" style="padding:5px 8px;font-size:.8rem" data-oid="${o.id}" onchange="updateOrderStatus(this,'${o.id}')">
          ${['pending','verified','rejected','delivered'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <a href="https://wa.me/9779705985657?text=${encodeURIComponent(o.wa_message||'')}" target="_blank" class="btn-success btn-sm">WA</a>
      </div></td>
    </tr>`).join('');
}

window.updateOrderStatus=async function(sel,id){
  try{
    await api(`/orders/${id}/status`,{method:'PUT',body:JSON.stringify({status:sel.value})});
    toast(`Order marked as ${sel.value}`);
  }catch(e){toast(e.message,'error');}
};

function attachOrderActions(){}

// OFFERS
async function renderOffers(){
  const [offers,products]=await Promise.all([api('/offers/all'),api('/products')]);
  $('page-content').innerHTML=`
    <div class="section-header"><h2>Flash Offers</h2><button class="btn-primary" id="add-offer-btn">+ Add Offer</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Product</th><th>Label</th><th>Discount</th><th>Valid Until</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${offers.map(o=>`
        <tr>
          <td>${o.product_name||'—'}</td>
          <td>${o.label}</td>
          <td><span style="color:var(--success);font-weight:700">${o.discount_pct}% OFF</span></td>
          <td style="font-size:.82rem;color:var(--text3)">${o.valid_until||'No expiry'}</td>
          <td><span class="badge ${o.is_active?'badge-active':'badge-inactive'}">${o.is_active?'Active':'Inactive'}</span></td>
          <td><div class="td-actions">
            <button class="btn-outline btn-sm" onclick='openOfferForm(${JSON.stringify(o)},${JSON.stringify(products)})'>Edit</button>
            <button class="btn-danger btn-sm" onclick="toggleOffer('${o.id}',${o.is_active})">${o.is_active?'Disable':'Enable'}</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  $('add-offer-btn').onclick=()=>openOfferForm(null,products);
}

window.openOfferForm=function(o,products){
  openDrawer(o?'Edit Offer':'Add Offer',`
    <div class="form-group"><label>Product *</label>
      <select id="o-prod">${products.map(p=>`<option value="${p.id}" ${o?.product_id===p.id?'selected':''}>${p.name}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Offer Label *</label><input id="o-label" value="${o?.label||''}" placeholder="e.g. 50% Summer Sale"/></div>
    <div class="form-group"><label>Discount %</label><input id="o-disc" type="number" value="${o?.discount_pct||0}" min="0" max="100"/></div>
    <div class="form-group"><label>Valid Until (optional)</label><input id="o-until" type="date" value="${o?.valid_until||''}"/></div>
    <div class="form-actions">
      <button class="btn-outline" onclick="closeDrawer()">Cancel</button>
      <button class="btn-primary" id="drawer-save">Save Offer</button>
    </div>`,
    async()=>{
      const body={product_id:$('o-prod').value,label:$('o-label').value,discount_pct:+$('o-disc').value,valid_until:$('o-until').value||null};
      try{
        if(o)await api(`/offers/${o.id}`,{method:'PUT',body:JSON.stringify(body)});
        else await api('/offers',{method:'POST',body:JSON.stringify(body)});
        closeDrawer();toast('Offer saved!');renderOffers();
      }catch(e){toast(e.message,'error');}
    }
  );
};

window.toggleOffer=async function(id,active){
  await api(`/offers/${id}`,{method:'PUT',body:JSON.stringify({is_active:active?0:1,label:'',discount_pct:0})});
  toast('Offer updated');renderOffers();
};

// PAYMENTS
async function renderPayments(){
  const statusFilter=$('pay-filter')?.value||'';
  const url=statusFilter?`/payments/all?status=${statusFilter}`:'/payments/all';
  let payments;
  try{ payments=await api(url); }catch(e){ $('page-content').innerHTML=`<div style="color:var(--sale);padding:20px">${e.message}</div>`; return; }
  const statusBadge={pending:'badge-pending',verified:'badge-verified',rejected:'badge-rejected'};
  $('page-content').innerHTML=`
    <div class="section-header"><h2>Payments <span style="color:var(--text3);font-weight:400;font-size:1rem">(${payments.length})</span></h2>
      <select class="filter-select" id="pay-filter" onchange="renderPayments()">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
    <div class="table-wrap"><div style="overflow-x:auto"><table>
      <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Amount</th><th>Method</th><th>Txn ID</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${payments.length?payments.map(p=>`
        <tr>
          <td style="font-size:.8rem;color:var(--text3)">${new Date(p.created_at).toLocaleDateString()}</td>
          <td><div class="td-name">${p.user_name||'—'}</div><div class="td-sub">${p.user_email||''}</div><div class="td-sub">${p.phone||''}</div></td>
          <td>${p.product_name||'—'}</td>
          <td><strong style="color:var(--blue-light)">Rs ${Number(p.amount).toLocaleString()}</strong></td>
          <td><span class="badge badge-active">${p.payment_method}</span></td>
          <td><code style="font-size:.78rem;color:var(--cyan)">${p.transaction_id}</code>
            ${p.screenshot_url?`<br/><a href="${p.screenshot_url}" target="_blank" style="font-size:.75rem;color:var(--blue-light)">📷 View SS</a>`:''}
            ${p.note?`<div style="font-size:.75rem;color:var(--text3);margin-top:4px">📝 ${p.note}</div>`:''}</td>
          <td><span class="badge ${statusBadge[p.status]||'badge-pending'}">${p.status}</span>
            ${p.admin_note?`<div style="font-size:.75rem;color:var(--text3);margin-top:4px">${p.admin_note}</div>`:''}</td>
          <td><div class="td-actions">
            ${p.status==='pending'?`
              <button class="btn-success btn-sm" onclick="verifyPayment('${p.id}','verified')">✅ Verify</button>
              <button class="btn-danger btn-sm" onclick="verifyPayment('${p.id}','rejected')">❌ Reject</button>
            `:`<span style="color:var(--text3);font-size:.8rem">${p.status}</span>`}
          </div></td>
        </tr>`).join(''):`<tr class="empty-row"><td colspan="8">No payments found</td></tr>`}
      </tbody>
    </table></div></div>`;
}

window.verifyPayment=async function(id,status){
  const note=status==='rejected'?prompt('Rejection reason (optional):')||'':'';
  try{
    await api(`/payments/${id}/status`,{method:'PUT',body:JSON.stringify({status,admin_note:note})});
    toast(`Payment ${status}!`,status==='verified'?'success':'error');
    renderPayments();
  }catch(e){toast(e.message,'error');}
};

// USERS
async function renderUsers(){
  const users=await api('/users');
  $('page-content').innerHTML=`
    <div class="section-header"><h2>Users</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>${users.map(u=>`
        <tr>
          <td class="td-name">${u.name}</td>
          <td style="font-size:.85rem">${u.email}</td>
          <td><span class="badge badge-${u.role}">${u.role}</span></td>
          <td><span class="badge ${u.is_active?'badge-active':'badge-inactive'}">${u.is_active?'Active':'Disabled'}</span></td>
          <td style="font-size:.8rem;color:var(--text3)">${new Date(u.created_at).toLocaleDateString()}</td>
          <td><div class="td-actions">
            ${u.role!=='admin'?`<button class="btn-outline btn-sm" onclick="toggleUser('${u.id}','${u.name}',${u.is_active})">${u.is_active?'Disable':'Enable'}</button>
            <button class="btn-success btn-sm" onclick="promoteUser('${u.id}','${u.name}')">Make Admin</button>`:'<span style="color:var(--text3);font-size:.8rem">Admin</span>'}
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

window.toggleUser=function(id,name,active){
  confirm(`${active?'Disable':'Enable'} user "${name}"?`,async()=>{
    await api(`/users/${id}/toggle`,{method:'PUT'});toast('User updated');renderUsers();
  });
};

window.promoteUser=function(id,name){
  confirm(`Make "${name}" an admin? This cannot be undone.`,async()=>{
    await api(`/users/${id}/promote`,{method:'PUT'});toast('User promoted to admin');renderUsers();
  });
};

// INIT
(async()=>{
  if(token){
    try{
      const u=await api('/auth/me');
      if(u.role==='admin'){
        adminUser=u;
        $('login-screen').hidden=true;$('admin-app').hidden=false;
        $('admin-name-display').textContent=`👤 ${u.name}`;
        navigate('dashboard');
        return;
      }
    }catch(e){localStorage.removeItem('tv_token');token=null;}
  }
})();
