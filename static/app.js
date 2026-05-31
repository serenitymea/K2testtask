const BASE = '';

//State
let clients = [], products = [], orderItems = [];

//Navigation
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('nav-' + page)?.classList.add('active');
  if (page === 'dashboard') loadDashboard();
  if (page === 'clients') loadClients();
  if (page === 'products') loadProducts();
  if (page === 'orders') loadOrderPage();
}

//Toast
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

//API helpers
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

//Clients
async function loadClients() {
  clients = await api('GET', '/api/clients/');
  const el = document.getElementById('clients-table');
  if (!clients.length) { el.innerHTML = '<div class="empty-state"><div class="icon">◉</div>Клієнтів поки немає</div>'; return; }
  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Ім'я</th><th>Email</th><th>Телефон</th><th>Дата</th></tr></thead>
    <tbody>${clients.map(c => `
      <tr>
        <td><span class="badge badge-blue">${c.id}</span></td>
        <td>${esc(c.name)}</td><td>${esc(c.email)}</td>
        <td>${esc(c.phone || '—')}</td>
        <td style="color:var(--muted)">${fmtDate(c.created_at)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  updateSelects();
}

async function createClient() {
  try {
    await api('POST', '/api/clients/', {
      name: val('c-name'), email: val('c-email'),
      phone: val('c-phone') || null,
    });
    toast('Клієнта створено ✓');
    ['c-name','c-email','c-phone'].forEach(id => document.getElementById(id).value = '');
    loadClients();
  } catch(e) { toast(e.message, 'error'); }
}

//Products
async function loadProducts() {
  products = await api('GET', '/api/products/');
  const el = document.getElementById('products-table');
  if (!products.length) { el.innerHTML = '<div class="empty-state"><div class="icon">◆</div>Товарів поки немає</div>'; return; }
  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Назва</th><th>Опис</th><th>Ціна</th><th>Дата</th></tr></thead>
    <tbody>${products.map(p => `
      <tr>
        <td><span class="badge badge-green">${p.id}</span></td>
        <td>${esc(p.name)}</td><td style="color:var(--muted)">${esc(p.description||'—')}</td>
        <td><span class="badge badge-yellow">${fmtMoney(p.price)} грн</span></td>
        <td style="color:var(--muted)">${fmtDate(p.created_at)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  updateSelects();
}

async function createProduct() {
  try {
    await api('POST', '/api/products/', {
      name: val('p-name'), price: parseFloat(val('p-price')),
      description: val('p-desc') || null,
    });
    toast('Товар додано ✓');
    ['p-name','p-price','p-desc'].forEach(id => document.getElementById(id).value = '');
    loadProducts();
  } catch(e) { toast(e.message, 'error'); }
}

//Orders
let itemRows = [];

function addItemRow() {
  const id = Date.now();
  itemRows.push(id);
  renderItemRows();
}

function removeItemRow(id) {
  itemRows = itemRows.filter(x => x !== id);
  renderItemRows();
}

function renderItemRows() {
  const container = document.getElementById('items-builder');
  if (!itemRows.length) {
    container.innerHTML = '<div style="padding:12px; color:var(--muted); font-size:12px; text-align:center;">Натисніть "+ Додати товар" щоб обрати позиції</div>';
    updateOrderTotal(); return;
  }
  container.innerHTML = itemRows.map(id => `
    <div class="item-row" id="row-${id}">
      <select id="prod-${id}" onchange="updateOrderTotal()">
        <option value="">— товар —</option>
        ${products.map(p => `<option value="${p.id}" data-price="${p.price}">${esc(p.name)} — ${fmtMoney(p.price)} грн</option>`).join('')}
      </select>
      <input type="number" id="qty-${id}" value="1" min="1" onchange="updateOrderTotal()" oninput="updateOrderTotal()">
      <button class="rm-btn" onclick="removeItemRow(${id})">×</button>
    </div>`).join('');
  updateOrderTotal();
}

function updateOrderTotal() {
  let total = 0;
  itemRows.forEach(id => {
    const sel = document.getElementById('prod-'+id);
    const qty = parseInt(document.getElementById('qty-'+id)?.value) || 0;
    if (sel?.value) {
      const opt = sel.options[sel.selectedIndex];
      total += parseFloat(opt.dataset.price) * qty;
    }
  });
  document.getElementById('order-total').innerHTML = `${fmtMoney(total)} <span>грн</span>`;
}

async function createOrder() {
  const clientId = parseInt(document.getElementById('o-client').value);
  if (!clientId) { toast('Оберіть клієнта', 'error'); return; }
  const items = itemRows.map(id => ({
    product_id: parseInt(document.getElementById('prod-'+id).value),
    quantity: parseInt(document.getElementById('qty-'+id).value) || 1,
  })).filter(x => x.product_id);
  if (!items.length) { toast('Додайте хоча б один товар', 'error'); return; }
  try {
    await api('POST', '/api/orders/', { client_id: clientId, items });
    toast('Замовлення оформлено ✓');
    itemRows = [];
    renderItemRows();
    document.getElementById('o-client').value = '';
    loadOrders();
  } catch(e) { toast(e.message, 'error'); }
}

async function loadOrders() {
  const filterClient = document.getElementById('filter-client')?.value;
  let url = filterClient ? `/api/orders/client/${filterClient}` : '/api/orders/';
  const orders = await api('GET', url);
  const el = document.getElementById('orders-table');
  if (!orders.length) { el.innerHTML = '<div class="empty-state"><div class="icon">◇</div>Замовлень поки немає</div>'; return; }
  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Клієнт</th><th>Товари</th><th>Сума</th><th>Статус</th><th>Дата</th></tr></thead>
    <tbody>${orders.map(o => `
      <tr>
        <td><span class="badge badge-blue">${o.id}</span></td>
        <td>${esc(o.client.name)}</td>
        <td><div class="order-items-list">${o.items.map(i => `<span class="order-item-chip">${esc(i.product.name)} ×${i.quantity}</span>`).join('')}</div></td>
        <td><strong style="color:var(--accent); font-family:var(--mono)">${fmtMoney(o.total_amount)} грн</strong></td>
        <td><span class="badge badge-yellow">${o.status}</span></td>
        <td style="color:var(--muted)">${fmtDate(o.created_at)}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

async function loadOrderPage() {
  clients = await api('GET', '/api/clients/');
  products = await api('GET', '/api/products/');
  updateSelects();
  if (!itemRows.length) renderItemRows();
  loadOrders();
}

function updateSelects() {
  const oc = document.getElementById('o-client');
  const fc = document.getElementById('filter-client');
  if (oc) {
    const prev = oc.value;
    oc.innerHTML = '<option value="">— оберіть клієнта —</option>' + clients.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.email)})</option>`).join('');
    if (prev) oc.value = prev;
  }
  if (fc) {
    const prev = fc.value;
    fc.innerHTML = '<option value="">Усі клієнти</option>' + clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    if (prev) fc.value = prev;
  }
}

//Dashboard
async function loadDashboard() {
  const [cls, prs, ords] = await Promise.all([
    api('GET', '/api/clients/'),
    api('GET', '/api/products/'),
    api('GET', '/api/orders/'),
  ]);
  clients = cls; products = prs;
  document.getElementById('stat-clients').textContent = cls.length;
  document.getElementById('stat-products').textContent = prs.length;
  document.getElementById('stat-orders').textContent = ords.length;

  const el = document.getElementById('recent-orders-table');
  const recent = ords.slice(0, 8);
  if (!recent.length) { el.innerHTML = '<div class="empty-state"><div class="icon">◇</div>Замовлень поки немає</div>'; return; }
  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Клієнт</th><th>Товарів</th><th>Сума</th><th>Дата</th></tr></thead>
    <tbody>${recent.map(o => `
      <tr>
        <td><span class="badge badge-blue">${o.id}</span></td>
        <td>${esc(o.client.name)}</td>
        <td style="color:var(--muted)">${o.items.length} поз.</td>
        <td style="color:var(--accent); font-family:var(--mono); font-weight:600">${fmtMoney(o.total_amount)} грн</td>
        <td style="color:var(--muted)">${fmtDate(o.created_at)}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

//Utils
const val = id => document.getElementById(id)?.value?.trim() || '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtMoney = v => parseFloat(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmtDate = s => new Date(s).toLocaleDateString('uk-UA', {day:'2-digit',month:'2-digit',year:'numeric', hour:'2-digit', minute:'2-digit'});

//Init
loadDashboard();
