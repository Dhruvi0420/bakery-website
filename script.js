(function(){
  // ===== Navigation Functionality =====
  function initNavigation() {
    // Update active navigation link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === currentPage || 
                      (currentPage === '' && href === 'index.html') ||
                      (currentPage === 'index.html' && href === 'index.html');
      
      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  // Initialize navigation on page load
  document.addEventListener('DOMContentLoaded', initNavigation);

  const STORAGE_KEY = 'cart';

  function $(sel, root=document){ return root.querySelector(sel); }
  function $$(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function parsePrice(text){
    if (!text) return 0;
    const n = String(text).replace(/[^\d.]/g,'');
    const v = parseFloat(n);
    return isNaN(v) ? 0 : v;
  }
  function formatINR(n){ n = Number(n)||0; return `₹${n.toFixed(2)}`; }
  function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  // ===== Orders Storage =====
  const ORDERS_KEY = 'ordersByUser';
  function getOrdersMap(){ try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || {}; } catch(e){ return {}; } }
  function saveOrdersMap(map){ localStorage.setItem(ORDERS_KEY, JSON.stringify(map)); }
  function getUserOrders(email){ if (!email) return []; const map = getOrdersMap(); return Array.isArray(map[email]) ? map[email] : []; }
  function setUserOrders(email, list){ if (!email) return; const map = getOrdersMap(); map[email] = Array.isArray(list) ? list : []; saveOrdersMap(map); }
  function computeCartTotal(items){ try { return (items||[]).reduce((sum,i)=> sum + (Number(i.price)||0)*(Number(i.qty)||0), 0); } catch(e){ return 0; } }
  function appendOrderForUser(user, items){
    try {
      if (!user || !user.email || !Array.isArray(items) || items.length === 0) return;
      const map = getOrdersMap();
      const list = Array.isArray(map[user.email]) ? map[user.email] : [];
      const order = {
        id: 'ORD-' + Date.now() + '-' + Math.floor(Math.random()*1000),
        ts: Date.now(),
        total: computeCartTotal(items),
        items: items
      };
      list.unshift(order);
      map[user.email] = list;
      saveOrdersMap(map);
    } catch(e){}
  }

  // ===== Auth (Sign In / Sign Up) =====
  const AUTH_KEY = 'authUser';
  let authSuccessCb = null;
  function getAuthUser(){ try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch(e){ return null; } }
  function isSignedIn(){ return !!getAuthUser(); }
  function setAuthUser(u){ if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }

  function clearAuthUser(){ try { localStorage.removeItem(AUTH_KEY); } catch(e){} }

  // Show/hide UI for guest vs signed-in users
  function updateAuthVisibility(){
    const signedIn = isSignedIn();
    document.querySelectorAll('[data-auth-show="guest"]').forEach(el => { el.style.display = signedIn ? 'none' : ''; });
    document.querySelectorAll('[data-auth-show="user"]').forEach(el => { el.style.display = signedIn ? '' : 'none'; });
    updateProfileChip();
  }


  function ensureProfileLink(){
    const nav = document.querySelector('.topbar .nav');
    if (!nav) return;
    // Remove any static 'Profile' link to avoid duplication with the dynamic profile chip
    try {
      nav.querySelectorAll('a.link').forEach(a => {
        const label = (a.textContent || '').trim().toLowerCase();
        const href = (a.getAttribute('href') || '').trim().toLowerCase();
        if (label === 'profile' || href.endsWith('profile.html') || href === '#profile') {
          a.remove();
        }
      });
    } catch(e){}
    // Signed-in profile chip
    let chip = nav.querySelector('.profile-chip');
    if (!chip){
      chip = document.createElement('a');
      chip.className = 'profile-chip';
      chip.href = 'profile.html';
      chip.setAttribute('aria-label','Your Profile');
      chip.setAttribute('data-auth-show','user');
      chip.innerHTML = `
        <span class="profile-avatar" aria-hidden="true">U</span>
        <span class="profile-name">User</span>
      `;
      nav.appendChild(chip);
    } else {
      // Ensure the existing chip navigates to the profile page
      chip.href = 'profile.html';
      chip.setAttribute('aria-label','Your Profile');
      chip.setAttribute('data-auth-show','user');
    }
    // Guest sign-in button on the right
    let signInBtn = nav.querySelector('#navSignInBtn');
    if (!signInBtn){
      signInBtn = document.createElement('button');
      signInBtn.id = 'navSignInBtn';
      signInBtn.type = 'button';
      signInBtn.className = 'btn btn-signin';
      signInBtn.textContent = 'Sign In';
      signInBtn.setAttribute('data-auth-show','guest');
      signInBtn.addEventListener('click', () => openAuthModal(() => { updateAuthVisibility(); }));
      nav.appendChild(signInBtn);
    }
    updateAuthVisibility();
  }

  function updateProfileChip(){
    try {
      const user = getAuthUser();
      const chip = document.querySelector('.topbar .nav .profile-chip');
      if (!chip) return;
      const avatar = chip.querySelector('.profile-avatar');
      const nameEl = chip.querySelector('.profile-name');
      if (!user){
        if (avatar) avatar.textContent = 'U';
        if (nameEl) nameEl.textContent = 'User';
        return;
      }
      const rawName = (user.name||'').trim();
      const isGuest = /^guest$/i.test(rawName);
      const displayName = isGuest ? (user.email || 'User') : (rawName || user.email || 'User');
      const initial = (displayName || 'U').trim().charAt(0).toUpperCase();
      if (avatar) avatar.textContent = initial || 'U';
      if (nameEl) nameEl.textContent = displayName;
    } catch(e){}
  }

  function ensureAuthModal(){
    if (document.querySelector('.auth-modal')) return;
    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-header">
        <h3 class="auth-title">Sign in or Sign up</h3>
        <button class="auth-close" id="authCloseBtn" aria-label="Close">✕</button>
      </div>
      <div class="auth-body">
        <div class="auth-tabs">
          <button class="auth-tab active" id="authTabIn" type="button">Sign In</button>
          <button class="auth-tab" id="authTabUp" type="button">Sign Up</button>
        </div>
        <form id="authSignInForm" class="auth-form" autocomplete="on">
          <input type="email" id="inEmail" placeholder="Email" required />
          <input type="password" id="inPass" placeholder="Password" required />
          <div class="auth-actions"><button class="btn-primary" type="submit">Sign In</button></div>
        </form>
        <form id="authSignUpForm" class="auth-form" style="display:none" autocomplete="on">
          <input type="text" id="upName" placeholder="Full Name" required />
          <input type="email" id="upEmail" placeholder="Email" required />
          <input type="password" id="upPass" placeholder="Password" required />
          <div class="auth-actions"><button class="btn-primary" type="submit">Create Account</button></div>
        </form>
        <div class="auth-hint">We only use this info to place your order.</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    function openTab(which){
      const tabIn = document.getElementById('authTabIn');
      const tabUp = document.getElementById('authTabUp');
      const inForm = document.getElementById('authSignInForm');
      const upForm = document.getElementById('authSignUpForm');
      if (!tabIn || !tabUp || !inForm || !upForm) return;
      if (which === 'in'){
        tabIn.classList.add('active'); tabUp.classList.remove('active');
        inForm.style.display='grid'; upForm.style.display='none';
      } else {
        tabUp.classList.add('active'); tabIn.classList.remove('active');
        upForm.style.display='grid'; inForm.style.display='none';
      }
    }

    document.getElementById('authTabIn').addEventListener('click', () => openTab('in'));
    document.getElementById('authTabUp').addEventListener('click', () => openTab('up'));
    document.getElementById('authCloseBtn').addEventListener('click', closeAuthModal);
    overlay.addEventListener('click', closeAuthModal);

    document.getElementById('authSignInForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = (document.getElementById('inEmail')?.value||'').trim();
      if (!email) return;
      // Simulate sign in
      const existing = getAuthUser();
      // Derive a readable name from the email local-part (e.g., john.doe -> John Doe)
      const local = String(email).split('@')[0].replace(/[._-]+/g,' ');
      const derivedName = local
        .split(' ')
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ') || 'User';

      if (existing && existing.email === email) {
        // Replace placeholder names like 'Guest' with a derived name
        const prevName = (existing.name || '').trim();
        if (!prevName || /^guest$/i.test(prevName)) {
          setAuthUser({ ...existing, name: derivedName, email });
        } else {
          // Keep existing profile info (including a custom name)
          setAuthUser(existing);
        }
      } else {
        setAuthUser({ name: derivedName, email });
      }
      closeAuthModal();
      if (typeof authSuccessCb === 'function'){ const cb = authSuccessCb; authSuccessCb=null; cb(); }
      updateAuthVisibility();
    });
    document.getElementById('authSignUpForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('upName')?.value||'').trim();
      const email = (document.getElementById('upEmail')?.value||'').trim();
      if (!name || !email) return;
      setAuthUser({ name, email });
      closeAuthModal();
      if (typeof authSuccessCb === 'function'){ const cb = authSuccessCb; authSuccessCb=null; cb(); }
      updateAuthVisibility();
    });
  }

  function openAuthModal(onSuccess){ ensureAuthModal(); authSuccessCb = onSuccess || null; document.querySelector('.auth-overlay')?.classList.add('open'); document.querySelector('.auth-modal')?.classList.add('open'); }
  function closeAuthModal(){ document.querySelector('.auth-overlay')?.classList.remove('open'); document.querySelector('.auth-modal')?.classList.remove('open'); }

  function finalizeCheckout(source){
    const user = getAuthUser();
    const items = getCart();
    if (user && items.length){
      appendOrderForUser(user, items);
    }
    // Removed order completion alert to avoid disruptive popups
    saveCart([]);
    if (source === 'drawer'){
      renderCartDrawer();
      closeCartDrawer();
    } else if (source === 'page'){
      const listEl = document.getElementById('cartItems');
      const totalEl = document.getElementById('cartTotal');
      const emptyEl = document.getElementById('cartEmpty');
      if (listEl) listEl.innerHTML='';
      if (totalEl) totalEl.textContent = formatINR(0);
      if (emptyEl) emptyEl.style.display='block';
    }
    updateCartCount();
  }

  function attemptCheckout(source){
    const cart = getCart();
    if (cart.length === 0){ alert('Your cart is empty.'); return; }
    if (!isSignedIn()){
      openAuthModal(() => finalizeCheckout(source));
      return;
    }
    finalizeCheckout(source);
  }


  function getCart(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; }
  }
  function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
  function cartCount(){ return getCart().reduce((sum,i)=>sum + (i.qty||0), 0); }

  function addToCart({id, name, price, image, qty}){
    const cart = getCart();
    const idx = cart.findIndex(it => it.id === id);
    if (idx >= 0){ cart[idx].qty += qty; }
    else { cart.push({id, name, price, image, qty}); }
    saveCart(cart);
    updateCartCount();
    showToast(`${name} added to cart`);
  }

  function updateCartCount(){
    const countEl = document.querySelector('.cart-fab .cart-fab-count');
    if (countEl) countEl.textContent = cartCount();
  }

  function showToast(msg){
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.position='fixed'; t.style.right='20px'; t.style.bottom='80px';
      t.style.background='#333'; t.style.color='#fff'; t.style.padding='10px 14px';
      t.style.borderRadius='8px'; t.style.boxShadow='0 4px 12px rgba(0,0,0,.2)';
      t.style.zIndex=2000; t.style.opacity='0';
      document.body.appendChild(t);
      requestAnimationFrame(()=>{ t.style.transition='opacity .2s ease, transform .2s ease'; t.style.opacity='1'; t.style.transform='translateY(-6px)'; });
      setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(0)'; setTimeout(()=>t.remove(), 250); }, 1200);
    } catch(e){}
  }

  function ensureCartFab(){
    if (document.querySelector('.cart-fab')) return;
    const btn = document.createElement('button');
    btn.className = 'cart-fab';
    btn.innerHTML = `🛒 <span class="cart-fab-count">0</span>`;
    btn.addEventListener('click', openCartDrawer);
    document.body.appendChild(btn);
    updateCartCount();
  }

  function ensureCartDrawer(){
    if (document.querySelector('.cart-drawer')) return;
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-header">
        <h3 class="cart-title">Your Cart</h3>
        <button class="cart-close" aria-label="Close">✕</button>
      </div>
      <div class="cart-body">
        <ul class="cart-items" id="drawerCartItems"></ul>
      </div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <span>Total</span>
          <span id="drawerCartTotal">₹0.00</span>
        </div>
        <button class="btn-checkout" id="drawerCheckoutBtn">Checkout</button>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeCartDrawer);
    drawer.querySelector('.cart-close').addEventListener('click', closeCartDrawer);

    // Drawer list interactions
    const listEl = drawer.querySelector('#drawerCartItems');
    listEl.addEventListener('click', (e) => {
      const qtyBtn = e.target.closest('.qty-btn');
      const remBtn = e.target.closest('.remove-btn');
      if (!qtyBtn && !remBtn) return;
      const li = e.target.closest('.cart-item');
      const id = li?.dataset?.id;
      if (!id) return;
      const cart = getCart();
      const idx = cart.findIndex(it => it.id === id);
      if (idx < 0) return;
      if (qtyBtn){
        const action = qtyBtn.dataset.action;
        if (action === 'inc') cart[idx].qty += 1;
        if (action === 'dec') cart[idx].qty -= 1;
        if (cart[idx].qty <= 0) cart.splice(idx,1);
      }
      if (remBtn){ cart.splice(idx,1); }
      saveCart(cart);
      renderCartDrawer();
    });

    drawer.querySelector('#drawerCheckoutBtn').addEventListener('click', () => {
      attemptCheckout('drawer');
    });
  }

  function openCartDrawer(){
    ensureCartDrawer();
    renderCartDrawer();
    const ov = document.querySelector('.cart-overlay');
    const dr = document.querySelector('.cart-drawer');
    try { closeMenuDrawer(); } catch(e){}
    if (ov) ov.classList.add('open');
    if (dr) dr.classList.add('open');
  }

  function closeCartDrawer(){
    const ov = document.querySelector('.cart-overlay');
    const dr = document.querySelector('.cart-drawer');
    if (ov) ov.classList.remove('open');
    if (dr) dr.classList.remove('open');
  }

  function renderCartDrawer(){
    const dr = document.querySelector('.cart-drawer');
    const listEl = dr?.querySelector('#drawerCartItems');
    const totalEl = dr?.querySelector('#drawerCartTotal');
    if (!dr || !listEl || !totalEl) return;
    const cart = getCart();
    listEl.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.dataset.id = item.id;
      li.innerHTML = `
        <img src="${item.image || ''}" alt="${item.name}">
        <div>
          <p class="cart-item-title">${item.name}</p>
          <p class="cart-item-price">${formatINR(item.price)}</p>
          <button type="button" class="remove-btn">Remove</button>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-action="dec">-</button>
          <span class="qty">${item.qty}</span>
          <button class="qty-btn" data-action="inc">+</button>
        </div>`;
      listEl.appendChild(li);
      total += (Number(item.price)||0) * (Number(item.qty)||0);
    });
    totalEl.textContent = formatINR(total);
    updateCartCount();
  }

  // ===== Menu Drawer (slide-in) =====
  function ensureMenuDrawer(){
    if (document.querySelector('.menu-drawer')) return;
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    const drawer = document.createElement('div');
    drawer.className = 'menu-drawer';
    drawer.innerHTML = `
      <div class="menu-header">
        <h3 class="menu-title">Menu</h3>
        <button class="menu-close" aria-label="Close">✕</button>
      </div>
      <div class="menu-body">
        <section class="menu-section">
          <h4 class="menu-section-title">Cakes</h4>
          <ul class="menu-list">
            <li><a href="cakess.html">All Cakes <span class="menu-arrow">›</span></a></li>
            <li><a href="Trending Cakes.html">Trending Cakes <span class="menu-arrow">›</span></a></li>
            <li><a href="Theme Cakes.html">Theme Cakes <span class="menu-arrow">›</span></a></li>
            <li><a href="Classic Cakes.html">Classic Cakes <span class="menu-arrow">›</span></a></li>
            <li><a href="birthday cakes.html">Birthday Cakes <span class="menu-arrow">›</span></a></li>
            <li><a href="Occassion Cakes.html">Occasion Cakes <span class="menu-arrow">›</span></a></li>
            <li><a href="Tea cakes.html">Tea Cakes <span class="menu-arrow">›</span></a></li>
          </ul>
        </section>
        <section class="menu-section">
          <h4 class="menu-section-title">Cupcakes</h4>
          <ul class="menu-list">
            <li><a href="cupcakes.html">All Cupcakes <span class="menu-arrow">›</span></a></li>
            <li><a href="cupcakes.html">Vanilla Coffee Cupcakes <span class="menu-arrow">›</span></a></li>
            <li><a href="cupcakes.html">Chocolate Cupcakes <span class="menu-arrow">›</span></a></li>
            <li><a href="cupcakes.html">Red Velvet Cupcakes <span class="menu-arrow">›</span></a></li>
            <li><a href="cupcakes.html">Oreo Cream Cupcakes <span class="menu-arrow">›</span></a></li>
          </ul>
        </section>
        <section class="menu-section">
          <h4 class="menu-section-title">Brownies</h4>
          <ul class="menu-list">
            <li><a href="Brownies.html">All Brownies <span class="menu-arrow">›</span></a></li>
            <li><a href="Brownies.html">Assorted Brownies <span class="menu-arrow">›</span></a></li>
            <li><a href="Brownies.html">Chocolate Brownies <span class="menu-arrow">›</span></a></li>
          </ul>
        </section>
        <section class="menu-section">
          <h4 class="menu-section-title">Cookies</h4>
          <ul class="menu-list">
            <li><a href="cookies.html">Chocolate Chip Cookies <span class="menu-arrow">›</span></a></li>
            <li><a href="cookies.html">Sugar Cookies <span class="menu-arrow">›</span></a></li>
            <li><a href="cookies.html">Oatmeal Cookies <span class="menu-arrow">›</span></a></li>
          </ul>
        </section>
        <section class="menu-section">
          <h4 class="menu-section-title">Pastries</h4>
          <ul class="menu-list">
            <li><a href="pastries.html">Croissants <span class="menu-arrow">›</span></a></li>
            <li><a href="pastries.html">Danish Pastries <span class="menu-arrow">›</span></a></li>
            <li><a href="pastries.html">Eclairs <span class="menu-arrow">›</span></a></li>
          </ul>
        </section>
        <section class="menu-section">
          <h4 class="menu-section-title">Desserts</h4>
          <ul class="menu-list">
            <li><a href="Desserts.html">All Desserts <span class="menu-arrow">›</span></a></li>
            <li><a href="Desserts.html">Chocolate Desserts <span class="menu-arrow">›</span></a></li>
            <li><a href="Desserts.html">Seasonal Specials <span class="menu-arrow">›</span></a></li>
          </ul>
        </section>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeMenuDrawer);
    drawer.querySelector('.menu-close').addEventListener('click', closeMenuDrawer);
    drawer.querySelector('.menu-body').addEventListener('click', (e)=>{
      const a = e.target.closest('a');
      if (a) closeMenuDrawer();
    });
  }

  function openMenuDrawer(){
    ensureMenuDrawer();
    try { closeCartDrawer(); } catch(e){}
    const ov = document.querySelector('.menu-overlay');
    const dr = document.querySelector('.menu-drawer');
    if (ov) ov.classList.add('open');
    if (dr) dr.classList.add('open');
  }

  function closeMenuDrawer(){
    const ov = document.querySelector('.menu-overlay');
    const dr = document.querySelector('.menu-drawer');
    if (ov) ov.classList.remove('open');
    if (dr) dr.classList.remove('open');
  }

  // ===== Profile Modal (pop-out) =====
  function ensureProfileModal(){
    if (document.querySelector('.profile-modal')) return;
    const overlay = document.createElement('div');
    overlay.className = 'profile-overlay';
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.innerHTML = `
      <div class="profile-header">
        <h3 class="profile-title">Your Profile</h3>
        <button class="profile-close" aria-label="Close">✕</button>
      </div>
      <div class="profile-body">
        <div data-auth-show="guest" style="display:none">
          <h3>Sign in to view your orders</h3>
          <p class="hint">Please sign in so we can show you your order history.</p>
          <div class="profile-actions">
            <button id="modalProfileSignInBtn" class="btn btn-search" type="button">Sign In</button>
          </div>
        </div>
        <div data-auth-show="user" style="display:none">
          <div class="profile-card-header">
            <div>
              <h3>Welcome, <span id="modalProfileUserName">User</span></h3>
              <p class="hint" style="margin:0;">Email: <span id="modalProfileUserEmail"></span></p>
            </div>
            <div>
              <button id="modalSignOutBtn" class="btn" type="button" style="background:#fff6ef; border:1px solid #f0d1b7; color:#5b4032; border-radius:10px; font-weight:800;">Sign Out</button>
            </div>
          </div>
          <hr>
          <h3 style="margin:0 0 10px; color:#3A2C29;">Previous Orders</h3>
          <div id="modalOrdersEmpty" style="display:none; text-align:center; color:#5b4032; margin:10px 0 14px;">You have no orders yet.</div>
          <ul id="modalOrdersList" class="cart-items"></ul>
          <div class="cart-footer" style="padding-left:0; padding-right:0;">
            <button id="modalClearOrdersBtn" class="btn-checkout" type="button" style="display:none; background:#6b4a39;">Clear Order History</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    overlay.addEventListener('click', closeProfileModal);
    modal.querySelector('.profile-close')?.addEventListener('click', closeProfileModal);
  }

  function openProfileModal(){
    ensureProfileModal();
    try { closeCartDrawer(); } catch(e){}
    try { closeMenuDrawer(); } catch(e){}
    const ov = document.querySelector('.profile-overlay');
    const md = document.querySelector('.profile-modal');
    if (ov) ov.classList.add('open');
    if (md) md.classList.add('open');
    renderProfileModal();
    updateAuthVisibility();
  }

  function closeProfileModal(){
    const ov = document.querySelector('.profile-overlay');
    const md = document.querySelector('.profile-modal');
    if (ov) ov.classList.remove('open');
    if (md) md.classList.remove('open');
  }

  function renderProfileModal(){
    const user = getAuthUser();
    const nameEl = document.getElementById('modalProfileUserName');
    const emailEl = document.getElementById('modalProfileUserEmail');
    const ordersList = document.getElementById('modalOrdersList');
    const emptyEl = document.getElementById('modalOrdersEmpty');
    const clearBtn = document.getElementById('modalClearOrdersBtn');
    const signInBtn = document.getElementById('modalProfileSignInBtn');
    const signOutBtn = document.getElementById('modalSignOutBtn');

    if (signInBtn){ signInBtn.onclick = () => openAuthModal(() => { updateAuthVisibility(); renderProfileModal(); }); }
    if (signOutBtn){ signOutBtn.onclick = () => { clearAuthUser(); updateAuthVisibility(); renderProfileModal(); }; }

    if (!user){
      if (ordersList) ordersList.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }
    const rawName = (user.name||'').trim();
    const displayName = /^guest$/i.test(rawName) ? (user.email || 'User') : (rawName || user.email || 'User');
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email || '';

    const orders = getUserOrders(user.email);
    if (!ordersList || !Array.isArray(orders)) return;
    ordersList.innerHTML = '';
    if (orders.length === 0){
      if (emptyEl) emptyEl.style.display = 'block';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (clearBtn){
      clearBtn.style.display = '';
      clearBtn.onclick = () => {
        if (confirm('Clear your order history?')){
          setUserOrders(user.email, []);
          renderProfileModal();
        }
      };
    }

    orders.forEach(order => {
      const li = document.createElement('li');
      li.className = 'cart-item order-item';
      li.dataset.orderId = order.id;
      const first = (order.items && order.items[0]) || {};
      const when = new Date(order.ts||Date.now());
      const lines = (order.items||[]).slice(0,3).map(it => `${it.name} × ${it.qty}`).join(', ') + ((order.items||[]).length > 3 ? ', …' : '');
      li.innerHTML = `
        <img src="${first.image || ''}" alt="Order">
        <div>
          <p class="cart-item-title">Order ${order.id}</p>
          <p class="cart-item-price">${formatINR(order.total||0)}</p>
          <div class="order-lines" style="color:#7a5a48; font-size:12px; margin-top:4px;">${lines}</div>
          <div class="order-meta" style="color:#9a7e6b; font-size:12px; margin-top:2px;">${when.toLocaleString()}</div>
        </div>
        <div class="qty-controls">
          <span class="qty">${(order.items||[]).length} items</span>
        </div>
      `;
      ordersList.appendChild(li);
    });
  }

  function injectAddButtons(){
    const cards = document.querySelectorAll('.gallery-grid .product-card');
    cards.forEach(card => {
      if (card.querySelector('.btn-add, .add-to-cart')) return;
      if (!card.querySelector('.product-price')) return; // only inject on real product items with price
      const info = card.querySelector('.product-info');
      if (!info) return;
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='btn-add';
      btn.textContent='Add to Cart';
      info.appendChild(btn);
    });
  }

  function normalizeLinks(){
    try {
      document.querySelectorAll('a[href]').forEach(a => {
        let href = a.getAttribute('href') || '';
        const label = (a.textContent || '').trim().toLowerCase();

        // Normalize legacy home links
        if (href === 'index.html' || href.startsWith('index.html#')){
          // If the visible label says "menu", route to menu.html instead of home
          if (label === 'menu') {
            a.setAttribute('href', 'menu.html');
          } else {
            a.setAttribute('href', href.replace('index1.html','index.html'));
          }
        }

        // Normalize legacy profile anchors
        if (href === '#profile' || href.startsWith('#profile')){
          a.setAttribute('href', 'profile.html');
        }

        // Ensure any explicit Home link points to our actual landing page
        if ((label === 'home' || label === 'homepage') && (href === 'index.html' || href === './' || href === '/')){
          a.setAttribute('href', 'index.html');
        }

        // If a link text says Menu but points to Home, make it open the drawer via menu.html
        if (label === 'menu' && (href === 'index.html' || href === './')){
          a.setAttribute('href', 'menu.html');
        }
      });
    } catch(e) { /* no-op */ }
  }

  function handleClicks(){
    document.addEventListener('click', (e) => {
      // Fallback: if any legacy link still uses #profile, route to profile.html
      const legacyProfile = e.target.closest('a[href="#profile"], a[href^="#profile"]');
      if (legacyProfile){ e.preventDefault(); window.location.href = 'profile.html'; return; }
      // Ensure clicking the profile chip always navigates to the profile page
      const chipLink = e.target.closest('.topbar .nav .profile-chip');
      if (chipLink){ e.preventDefault(); window.location.href = 'profile.html'; return; }
      // Open Menu drawer when clicking any Menu link
      const menuLink = e.target.closest('a[href="menu.html"], a[href$="menu.html"], a[href="#menu"], .nav a.link[href*="menu"]');
      if (menuLink){ e.preventDefault(); openMenuDrawer(); return; }
      // Open Cart drawer for #cart anchors as a legacy/fallback
      const cartHash = e.target.closest('a[href="#cart"], a[href^="#cart"]');
      if (cartHash){ e.preventDefault(); openCartDrawer(); return; }
      // Open drawer when clicking any Cart link
      const cartLink = e.target.closest('a[href$="cart.html"]');
      if (cartLink){ e.preventDefault(); openCartDrawer(); return; }
      const btn = e.target.closest('.btn-add, .add-to-cart');
      if (!btn) return;
      e.preventDefault();
      const card = btn.closest('.product-card');
      if (!card) return;
      const nameEl = card.querySelector('.product-info h3, .product-info h2, .product-info h4');
      const name = nameEl ? nameEl.textContent.trim() : 'Item';
      const priceEl = card.querySelector('.product-price');
      const price = priceEl ? parsePrice(priceEl.textContent) : 0;
      const imgEl = card.querySelector('.product-image .img-default') || card.querySelector('.product-image img');
      const image = imgEl ? imgEl.src : '';
      const id = slugify(name) + '-' + (price||0);
      addToCart({id, name, price, image, qty: 1});
      openCartDrawer();
    });
  }

  // Removed setupMenuHandler - menu link now works normally

  function isProfilePage(){
    return /profile\.html(?:\?|#|$)/i.test(window.location.pathname) || document.body.classList.contains('profile-page');
  }

  function isCartPage(){
    return /cart\.html(?:\?|#|$)/i.test(window.location.pathname) || document.body.classList.contains('cart-page');
  }

  function renderCartPage(){
    const listEl = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const emptyEl = document.getElementById('cartEmpty');

    function refresh(){
      const cart = getCart();
      if (!listEl || !totalEl) return;
      listEl.innerHTML = '';
      if (cart.length === 0){
        if (emptyEl) emptyEl.style.display = 'block';
        totalEl.textContent = formatINR(0);
        updateCartCount();
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      let total = 0;
      cart.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.dataset.id = item.id;
        li.innerHTML = `
          <img src="${item.image || ''}" alt="${item.name}">
          <div>
            <p class="cart-item-title">${item.name}</p>
            <p class="cart-item-price">₹${item.price}</p>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" data-action="dec">-</button>
            <span class="qty">${item.qty}</span>
            <button class="qty-btn" data-action="inc">+</button>
          </div>
        `;
        listEl.appendChild(li);
        total += (Number(item.price)||0) * (Number(item.qty)||0);
      });
      totalEl.textContent = formatINR(total);
      updateCartCount();
    }

    if (listEl){
      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.qty-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        const li = btn.closest('.cart-item');
        const id = li?.dataset?.id;
        if (!id) return;
        const cart = getCart();
        const idx = cart.findIndex(it => it.id === id);
        if (idx < 0) return;
        if (action === 'inc') cart[idx].qty += 1;
        if (action === 'dec') cart[idx].qty -= 1;
        if (cart[idx].qty <= 0) cart.splice(idx,1);
        saveCart(cart);
        refresh();
      });
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn){ checkoutBtn.addEventListener('click', () => attemptCheckout('page')); }

    refresh();
  }

  function renderProfilePage(){
    const user = getAuthUser();
    const nameEl = document.getElementById('profileUserName');
    const emailEl = document.getElementById('profileUserEmail');
    const ordersList = document.getElementById('ordersList');
    const emptyEl = document.getElementById('ordersEmpty');
    const clearBtn = document.getElementById('clearOrdersBtn');
    const signInBtn = document.getElementById('profileSignInBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    if (signInBtn){ signInBtn.onclick = () => openAuthModal(() => { updateAuthVisibility(); renderProfilePage(); }); }
    if (signOutBtn){ signOutBtn.onclick = () => { clearAuthUser(); updateAuthVisibility(); renderProfilePage(); }; }

    if (!user){
      if (ordersList) ordersList.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }

    const rawName = (user.name||'').trim();
    const displayName = /^guest$/i.test(rawName) ? (user.email || 'User') : (rawName || user.email || 'User');
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email || '';

    const orders = getUserOrders(user.email);
    if (!ordersList || !Array.isArray(orders)) return;

    ordersList.innerHTML = '';
    if (orders.length === 0){
      if (emptyEl) emptyEl.style.display = 'block';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (clearBtn){
      clearBtn.style.display = '';
      clearBtn.onclick = () => {
        if (confirm('Clear your order history?')){
          setUserOrders(user.email, []);
          renderProfilePage();
        }
      };
    }

    orders.forEach(order => {
      const li = document.createElement('li');
      li.className = 'cart-item order-item';
      li.dataset.orderId = order.id;
      const first = (order.items && order.items[0]) || {};
      const when = new Date(order.ts||Date.now());
      const lines = (order.items||[]).slice(0,3).map(it => `${it.name} × ${it.qty}`).join(', ') + ((order.items||[]).length > 3 ? ', …' : '');
      li.innerHTML = `
        <img src="${first.image || ''}" alt="Order">
        <div>
          <p class="cart-item-title">Order ${order.id}</p>
          <p class="cart-item-price">${formatINR(order.total||0)}</p>
          <div class="order-lines" style="color:#7a5a48; font-size:12px; margin-top:4px;">${lines}</div>
          <div class="order-meta" style="color:#9a7e6b; font-size:12px; margin-top:2px;">${when.toLocaleString()}</div>
        </div>
        <div class="qty-controls">
          <span class="qty">${(order.items||[]).length} items</span>
        </div>
      `;
      ordersList.appendChild(li);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    try {
      ensureCartFab();
      ensureCartDrawer();
      ensureMenuDrawer();
      ensureProfileLink(); // Profile chip in navbar restored
      // ensureProfileModal(); // Profile modal disabled
      injectAddButtons();
      normalizeLinks();
      handleClicks();
      // setupMenuHandler(); // not used; click interception below handles Menu
      if (isCartPage()) renderCartPage();
      if (isProfilePage()) renderProfilePage();
    } catch (e) { console.error(e); }
  });
})();
