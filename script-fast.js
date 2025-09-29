// =============== STORAGE HELPERS ===============
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const load = (key, def = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(def));

// =============== APP STATE ===============
let currentBill = { items: [], total: 0, payment: null };

// =============== INIT ===============
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('report-date').value = today;
  renderFoodGrid();
  renderMenuList();
  bindEvents();
});

// =============== UI NAVIGATION ===============
function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(`${screenName}-screen`).classList.add('active');
}

// =============== EVENT BINDING ===============
function bindEvents() {
  document.getElementById('btn-open-menu').onclick = () => showScreen('menu');
  document.getElementById('btn-back').onclick = () => showScreen('sales');
  document.getElementById('btn-back-report').onclick = () => showScreen('sales');
  document.getElementById('btn-open-report').onclick = () => {
    document.getElementById('report-date').valueAsDate = new Date();
    showScreen('report');
  };
  document.getElementById('btn-cash').onclick = () => setPayment('cash');
  document.getElementById('btn-online').onclick = () => setPayment('online');
  document.getElementById('btn-complete').onclick = completeSale;
  document.getElementById('btn-add-item').onclick = addItem;
  document.getElementById('btn-load-report').onclick = loadReport;
  document.getElementById('btn-clear-data').onclick = clearDataForDate;
}

// =============== FOOD GRID ===============
function renderFoodGrid() {
  const grid = document.getElementById('food-grid');
  const items = load('menuItems');
  grid.innerHTML = items.length ? 
    items.map(item => `
      <button class="food-btn" data-id="${item.id}" data-price="${item.price}">
        <div class="food-name">${item.name}</div>
        <div class="food-price">Rs. ${item.price}</div>
      </button>
    `).join('') 
    : '<p style="text-align:center;padding:40px;color:#888">No items. Add from MENU.</p>';
  grid.onclick = (e) => {
    const btn = e.target.closest('.food-btn');
    if (btn) {
      const id = btn.dataset.id;
      const price = parseInt(btn.dataset.price);
      const name = btn.querySelector('.food-name').textContent;
      addToBill({ id, name, price });
    }
  };
}

// =============== BILL LOGIC ===============
function addToBill(item) {
  const existing = currentBill.items.find(i => i.id === item.id);
  if (existing) {
    existing.qty++;
  } else {
    currentBill.items.push({ ...item, qty: 1 });
  }
  currentBill.total = currentBill.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  updateUI();
  renderCurrentBill();
}

function setPayment(method) {
  currentBill.payment = method;
  document.getElementById('payment-status').textContent = method.toUpperCase();
  document.getElementById('btn-complete').disabled = false;
}

function updateUI() {
  document.getElementById('total').textContent = currentBill.total;
}

// =============== RENDER CURRENT BILL ===============
function renderCurrentBill() {
  const billEl = document.getElementById('current-bill');
  if (currentBill.items.length === 0) {
    billEl.style.display = 'none';
    return;
  }
  billEl.style.display = 'block';
  billEl.innerHTML = '<strong>Current Bill:</strong><br/>';
  currentBill.items.forEach((item, index) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <span style="background:#e0f7fa;padding:4px 8px;border-radius:6px;margin:4px 0;display:inline-block;">
        ${item.name} ×${item.qty} = Rs. ${item.price * item.qty}
        <span class="remove-item" data-index="${index}" style="color:#e74c3c;cursor:pointer;font-weight:bold;"> ✕</span>
      </span>
    `;
    billEl.appendChild(div);
  });
  billEl.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      removeItemFromBill(index);
    });
  });
}

function removeItemFromBill(index) {
  const item = currentBill.items[index];
  if (item.qty > 1) {
    item.qty--;
  } else {
    currentBill.items.splice(index, 1);
  }
  currentBill.total = currentBill.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  renderCurrentBill();
  updateUI();
}

// =============== COMPLETE SALE WITH BEEP ===============
function completeSale() {
  if (!currentBill.payment || currentBill.total === 0) return;
  const sale = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    items: currentBill.items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
    total: currentBill.total,
    payment: currentBill.payment
  };
  const sales = load('sales');
  sales.push(sale);
  save('sales', sales);
  playBeep();
  currentBill = { items: [], total: 0, payment: null };
  updateUI();
  renderCurrentBill();
  document.getElementById('payment-status').textContent = 'Select Payment';
  document.getElementById('btn-complete').disabled = true;
}

// =============== BEEP FUNCTION ===============
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (e) {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  }
}

// =============== MENU MANAGEMENT ===============
function addItem() {
  const name = document.getElementById('item-name').value.trim();
  const price = parseInt(document.getElementById('item-price').value);
  if (!name || !price || price < 10 || price > 200) {
    alert('Enter valid name & price (Rs. 10–200)');
    return;
  }
  const items = load('menuItems');
  items.push({ id: Date.now().toString(), name, price });
  save('menuItems', items);
  document.getElementById('item-name').value = '';
  document.getElementById('item-price').value = '';
  renderFoodGrid();
  renderMenuList();
}

function renderMenuList() {
  const list = document.getElementById('menu-list');
  const items = load('menuItems');
  list.innerHTML = items.length ? 
    items.map(item => `
      <div class="menu-item">
        ${item.name} - Rs. ${item.price}
        <button class="delete-btn" data-id="${item.id}">DEL</button>
      </div>
    `).join('') 
    : '<p style="padding:15px;color:#777;text-align:center">No items added yet</p>';
  list.onclick = (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      const updated = items.filter(i => i.id !== id);
      save('menuItems', updated);
      renderFoodGrid();
      renderMenuList();
    }
  };
}

// =============== REPORTS ===============
function loadReport() {
  const date = document.getElementById('report-date').value;
  if (!date) {
    alert('Select a date');
    return;
  }
  const sales = load('sales').filter(s => {
    return s && s.timestamp && s.timestamp.split('T')[0] === date;
  });
  const content = document.getElementById('report-content');
  if (sales.length === 0) {
    content.innerHTML = '<p style="padding:25px;text-align:center;color:#e74c3c">No sales on this date</p>';
    return;
  }
  const cash = sales.filter(s => s.payment === 'cash').reduce((sum, s) => sum + s.total, 0);
  const online = sales.filter(s => s.payment === 'online').reduce((sum, s) => sum + s.total, 0);
  const totalOrders = sales.length;
  let html = `
    <div style="padding:15px;background:white;margin:15px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
      <h3 style="margin-bottom:10px;">Summary</h3>
      <div><strong>Orders:</strong> ${totalOrders}</div>
      <div><strong>Cash Sales:</strong> Rs. ${cash}</div>
      <div><strong>Online Sales:</strong> Rs. ${online}</div>
      <div><strong>Grand Total:</strong> Rs. ${cash + online}</div>
    </div>
    <h3 style="padding:0 20px;">Transactions</h3>
  `;
  sales.forEach((sale, idx) => {
    const time = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payment = sale.payment || 'unknown';
    const paymentColor = payment === 'cash' ? '#27ae60' : '#3498db';
    const items = sale.items.map(i => `${i.name} (x${i.qty})`).join(', ');
    html += `
      <div style="padding:12px;margin:10px 20px;background:#f9f9f9;border-radius:10px;font-size:14px;">
        <div><strong>#${idx + 1} • ${time}</strong></div>
        <div>${items}</div>
        <div style="color:${paymentColor}; margin-top:4px;">
          Rs. ${sale.total} • ${payment.toUpperCase()}
        </div>
      </div>
    `;
  });
  content.innerHTML = html;
}

// =============== CLEAR DATA (DATE-WISE) ===============
function clearDataForDate() {
  const date = document.getElementById('report-date').value;
  if (!date) {
    alert('Select a date first');
    return;
  }
  const passkey = prompt('Enter passkey to confirm deletion (hint: 5544):');
  if (passkey !== '5544') {
    alert('❌ Incorrect passkey. Data NOT deleted.');
    return;
  }
  if (!confirm(`⚠️ Delete ALL sales for ${date}? This cannot be undone.`)) {
    return;
  }
  const sales = load('sales');
  const remainingSales = sales.filter(sale => {
    return !(sale && sale.timestamp && sale.timestamp.split('T')[0] === date);
  });
  save('sales', remainingSales);
  loadReport();
  alert(`✅ Sales for ${date} deleted successfully!`);
}