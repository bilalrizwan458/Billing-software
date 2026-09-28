// Storage Keys
const DB = {
  AUTH: 'jn_auth',
  USER: 'jn_user',
  PASS: 'jn_pass',
  PROD: 'jn_products',
  CUST: 'jn_customers',
  INV: 'jn_invoices',
  PAY: 'jn_payments',
  RET: 'jn_returns',
  EXP: 'jn_expenses',
  SUPP: 'jn_suppliers',
  LOGO: 'jn_logo',
  COUNT: 'jn_counter',
  SET: 'jn_settings',
  EXP_COUNT: 'jn_exp_count',
  PURCHASES: 'jn_purchases'  // NEW: Store purchase history
};

// Data storage
let products = [];
let customers = [];
let invoices = [];
let payments = [];
let returns = [];
let lastReturnData = null;
let expenses = [];
let suppliers = [];
let purchases = [];  // NEW: Purchase records
let currentInv = { items: [] };
let selectedCust = null;
let companyLogo = null;

// Initialize
window.onload = function() {
  checkAuth();
  if(localStorage.getItem(DB.AUTH) === 'true') {
    loadData();
    initDates();
    loadLogo();
  }
};

function checkAuth() {
  if (localStorage.getItem(DB.AUTH) === 'true') {
    showApp();
  } else {
    if (!localStorage.getItem(DB.USER)) {
      localStorage.setItem(DB.USER, 'admin');
      localStorage.setItem(DB.PASS, 'admin123');
      localStorage.setItem(DB.COUNT, '1000');
      localStorage.setItem('threshold', '5');
    }
    const user = localStorage.getItem(DB.USER);
    const pass = localStorage.getItem(DB.PASS);
    document.getElementById('loginHint').innerText = `Default: ${user} / ${pass}`;
  }
}

function login() {
  const user = document.getElementById('inpUsername').value.trim();
  const pass = document.getElementById('inpPassword').value;
  const savedUser = localStorage.getItem(DB.USER);
  const savedPass = localStorage.getItem(DB.PASS);
  
  if (!user || !pass) {
    alert('Please enter both username and password');
    return;
  }
  
  if (user === savedUser && pass === savedPass) {
    localStorage.setItem(DB.AUTH, 'true');
    showApp();
  } else {
    alert('Invalid credentials! Please try again.');
    document.getElementById('inpPassword').value = '';
    document.getElementById('inpPassword').focus();
  }
}

function logout() {
  if(confirm('Are you sure you want to logout?')) {
    localStorage.removeItem(DB.AUTH);
    location.reload();
  }
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  
  loadData();
  initDates();
  updateDashboard();
  loadSettings();
  loadLogo();
  
  document.getElementById('displayUsername').innerText = localStorage.getItem(DB.USER);
  document.getElementById('currentUserDisplay').innerText = localStorage.getItem(DB.USER);
}

function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  // Re-render charts with new theme colors
  setTimeout(renderDashboardCharts, 150);
  localStorage.setItem('theme', newTheme);
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  
  document.getElementById('page-' + page).classList.add('active');
  
  const buttons = document.getElementById('navButtons').getElementsByTagName('button');
  for (let btn of buttons) {
    if (btn.getAttribute('onclick').includes(page)) {
      btn.classList.add('active');
    }
  }
  
  if (window.innerWidth <= 768) {
    toggleMenu();
  }
  
  switch(page) {
    case 'dashboard': updateDashboard(); break; // charts rendered inside updateDashboard
    case 'invoice': initInvoice(); break;
    case 'customers': renderCust(); break;
    case 'products': renderProd(); break;
    case 'part-search': initPartSearch(); break;
    case 'stock-list': initStockList(); break;
    case 'item-sales': renderItemSales(); break;
    case 'sales': renderSales(); break;
    case 'returns': initReturns(); break;
    case 'ledger': initLedger(); break;
    case 'expenses': renderExpenses(); break;
    case 'settings': loadSettings(); loadLogo(); break;
  }
}

function loadData() {
  products  = JSON.parse(localStorage.getItem(DB.PROD)      || '[]');
  customers = JSON.parse(localStorage.getItem(DB.CUST)      || '[]');
  invoices  = JSON.parse(localStorage.getItem(DB.INV)       || '[]');
  payments  = JSON.parse(localStorage.getItem(DB.PAY)       || '[]');
  returns   = JSON.parse(localStorage.getItem(DB.RET)       || '[]');
  expenses  = JSON.parse(localStorage.getItem(DB.EXP)       || '[]');
  suppliers = JSON.parse(localStorage.getItem(DB.SUPP)      || '[]');
  purchases = JSON.parse(localStorage.getItem(DB.PURCHASES) || '[]');
  companyLogo = localStorage.getItem(DB.LOGO) || null;

  // ── Auto-fix: remove duplicate payments by ID ──────────────────────
  const seenPayIds = new Set();
  const beforeCount = payments.length;
  payments = payments.filter(p => {
    if (!p.id || seenPayIds.has(p.id)) return false;
    seenPayIds.add(p.id);
    return true;
  });
  if (payments.length < beforeCount) {
    localStorage.setItem(DB.PAY, JSON.stringify(payments));
    console.log(`🧹 Removed ${beforeCount - payments.length} duplicate payment(s)`);
  }

  // ── Auto-fix: remove duplicate invoices by ID ──────────────────────
  const seenInvIds = new Set();
  invoices = invoices.filter(i => {
    if (!i.id || seenInvIds.has(i.id)) return false;
    seenInvIds.add(i.id);
    return true;
  });

  // ── Auto-fix: remove duplicate customers by ID ─────────────────────
  const seenCustIds = new Set();
  customers = customers.filter(c => {
    if (!c.id || seenCustIds.has(c.id)) return false;
    seenCustIds.add(c.id);
    return true;
  });
}

function _coreWriteData() {
  localStorage.setItem(DB.PROD, JSON.stringify(products));
  localStorage.setItem(DB.CUST, JSON.stringify(customers));
  localStorage.setItem(DB.INV, JSON.stringify(invoices));
  localStorage.setItem(DB.PAY, JSON.stringify(payments));
  localStorage.setItem(DB.RET, JSON.stringify(returns));
  localStorage.setItem(DB.EXP, JSON.stringify(expenses));
  localStorage.setItem(DB.SUPP, JSON.stringify(suppliers));
  localStorage.setItem(DB.PURCHASES, JSON.stringify(purchases));
  if(companyLogo) localStorage.setItem(DB.LOGO, companyLogo);
}

let _fbSaveTimer = null;
let fbLocalSaveTime = 0;

function saveData() {
  _coreWriteData();
  fbLocalSaveTime = Date.now();
  if (typeof fbConnected !== 'undefined' && fbConnected) {
    clearTimeout(_fbSaveTimer);
    _fbSaveTimer = setTimeout(() => { if(typeof fbPush==='function') fbPush(true); }, 1500);
  }
}

function initDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invDate').value = today;
  document.getElementById('ledFrom').value = today;
  document.getElementById('ledTo').value = today;
  document.getElementById('expDate').value = today;
  document.getElementById('payDate').value = today;
  document.getElementById('purchaseDate').value = today;
  document.getElementById('stockMoveFrom').value = today;
  document.getElementById('stockMoveTo').value = today;
}

function genId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase();
}

// ── Date helpers (timezone-safe) ──────────────────
// Invoices store date as "YYYY-MM-DD" string (local).
// new Date("YYYY-MM-DD") parses as UTC midnight which
// causes off-by-one errors in Pakistan (UTC+5) and any
// other timezone. We compare strings directly instead.
function dateStr(d) {
  // Convert a local Date object → "YYYY-MM-DD" string
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function invDateGte(invDate, startDate) {
  // invDate  : "YYYY-MM-DD" string stored on the invoice
  // startDate: a local Date object (midnight of the start day)
  return invDate >= dateStr(startDate);
}
// ───────────────────────────────────────────────────

function fmtMoney(amount) {
  const num = Number(amount) || 0;
  return 'PKR ' + num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function getBalance(custId) {
  const c = customers.find(x => x.id === custId);
  if (!c) return 0;
  const creditSales = invoices
    .filter(i => i.customerId === custId && i.paymentType === 'credit')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  // Deduplicate payments by ID to prevent double-counting
  const seen = new Set();
  const paid = payments
    .filter(p => {
      if (p.customerId !== custId) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  return (c.opening || 0) + creditSales - paid;
}

// LOGO FUNCTIONS
function loadLogo() {
  companyLogo = localStorage.getItem(DB.LOGO);
  const uploadArea = document.getElementById('logoUploadArea');
  const uploadContent = document.getElementById('logoUploadContent');
  const preview = document.getElementById('logoPreview');
  const actions = document.getElementById('logoActions');
  const sidebarLogo = document.getElementById('sidebarLogo');
  const sidebarText = document.getElementById('sidebarLogoText');
  
  if (companyLogo) {
    uploadArea.classList.add('hasImage');
    uploadContent.classList.add('hidden');
    preview.src = companyLogo;
    preview.classList.remove('hidden');
    actions.classList.remove('hidden');
    
    sidebarLogo.src = companyLogo;
    sidebarLogo.style.display = 'block';
    sidebarText.style.display = 'none';
  } else {
    uploadArea.classList.remove('hasImage');
    uploadContent.classList.remove('hidden');
    preview.classList.add('hidden');
    actions.classList.add('hidden');
    
    sidebarLogo.style.display = 'none';
    sidebarText.style.display = 'flex';
  }
}

function uploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  if (file.size > 2 * 1024 * 1024) {
    alert('File size must be less than 2MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    companyLogo = e.target.result;
    localStorage.setItem(DB.LOGO, companyLogo);
    loadLogo();
    alert('Logo uploaded successfully!');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  if (!confirm('Remove company logo?')) return;
  companyLogo = null;
  localStorage.removeItem(DB.LOGO);
  loadLogo();
  alert('Logo removed');
}

function previewLogoOnInvoice() {
  preparePrintInvoice();
  document.getElementById('invoicePrintArea').classList.remove('hidden');
  document.getElementById('printableInvoice').scrollIntoView({behavior: 'smooth'});
}

function updateInvoiceLogo() {
  const printLogo = document.getElementById('printLogo');
  const printLogoText = document.getElementById('printLogoText');
  
  if (companyLogo) {
    printLogo.src = companyLogo;
    printLogo.style.display = 'block';
    printLogoText.style.display = 'none';
  } else {
    printLogo.style.display = 'none';
    printLogoText.style.display = 'block';
  }
}

// DASHBOARD FUNCTIONS
function updateDashboard() {
  // Debounce: avoid multiple rapid calls hammering the DOM
  clearTimeout(updateDashboard._t);
  updateDashboard._t = setTimeout(_doUpdateDashboard, 120);
}

function _doUpdateDashboard() {
  document.getElementById('statCustomers').innerText = customers.length;
  
  const stockVal = products.reduce((sum, p) => sum + (p.qty * (p.cost || 0)), 0);
  document.getElementById('statStock').innerText = fmtMoney(stockVal);
  
  let outstanding = 0;
  customers.forEach(c => {
    const bal = getBalance(c.id);
    if (bal > 0) outstanding += bal;
  });
  document.getElementById('statCredit').innerText = fmtMoney(outstanding);
  
  const now = new Date();
  const todaySales = invoices.filter(i => i.date === dateStr(now));
  const todayTotal = todaySales.reduce((sum, i) => sum + i.total, 0);
  document.getElementById('statToday').innerText = fmtMoney(todayTotal);
  
  const todayProfit = todaySales.reduce((sum, inv) => sum + (inv.profit || 0), 0);
  document.getElementById('statProfit').innerText = fmtMoney(todayProfit);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSales = invoices.filter(i => invDateGte(i.date, monthStart)).reduce((a, i) => a + i.total, 0);
  document.getElementById('statMonth').innerText = fmtMoney(monthSales);
  
  const monthExp = expenses.filter(e => invDateGte(e.date, monthStart)).reduce((a, e) => a + e.amount, 0);
  document.getElementById('statExpense').innerText = fmtMoney(monthExp);
  
  const threshold = parseInt(localStorage.getItem('threshold') || 5);
  const lowStock = products.filter(p => p.qty <= threshold);
  document.getElementById('statLow').innerText = lowStock.length;
  
  // Recent Activity
  const recent = [...invoices.slice(-10), ...payments.slice(-10)].sort((a, b) => 
    new Date(b.date || b.created) - new Date(a.date || a.created)
  ).slice(0, 10);
  
  const actDiv = document.getElementById('recentActivity');
  if (recent.length === 0) {
    actDiv.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px">No recent activity</p>';
  } else {
    actDiv.innerHTML = recent.map(r => {
      if (r.number) return `<div style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;color:var(--primary)">${r.number}</div>
        <small style="color:#64748b">${r.customerName} • ${new Date(r.date).toLocaleDateString()}</small></div>
        <div style="text-align:right"><div style="font-weight:700">${fmtMoney(r.total)}</div>
        <span class="${r.paymentType === 'credit' ? 'badgeWarning' : 'badgeSuccess'}">${r.paymentType}</span></div>
      </div>`;
      else return `<div style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;color:var(--success)">Payment Received</div>
        <small style="color:#64748b">${customers.find(c=>c.id===r.customerId)?.name || 'Unknown'} • ${new Date(r.date).toLocaleDateString()}</small></div>
        <div style="font-weight:700;color:var(--success)">${fmtMoney(r.amount)}</div>
      </div>`;
    }).join('');
  }
  
  // Low Stock List
  const lowDiv = document.getElementById('lowStockList');
  if (lowStock.length === 0) {
    lowDiv.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px">No low stock items</p>';
  } else {
    lowDiv.innerHTML = lowStock.map(p => `
      <div class="lowStockItem" style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div><div style="font-weight:700;color:var(--text)">${p.name}</div><small style="color:#94a3b8">${p.sku}</small></div>
        <span class="badge badgeDanger">Stock: ${p.qty}</span>
      </div>
    `).join('');
  }

  // Only render charts if dashboard is visible
  const dashPage = document.getElementById('page-dashboard');
  if (dashPage && dashPage.classList.contains('active')) {
    setTimeout(renderDashboardCharts, 100);
  }
}

function quickBackup() {
  backupData();
}

// ═══════════════════════════════════════════════════
// DASHBOARD CHARTS
// ═══════════════════════════════════════════════════
let chartSalesProfit = null;
let chartTopProducts = null;
let chartMonthly     = null;
let chartPayType     = null;

function getChartColors() {
  const dark = document.body.getAttribute('data-theme') === 'dark';
  return {
    grid:    dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    text:    dark ? '#94a3b8' : '#64748b',
    bg:      dark ? '#1e293b' : '#ffffff',
  };
}

function destroyChart(c) { if (c) { try { c.destroy(); } catch(e){} } return null; }

function renderDashboardCharts() {
  const now   = new Date();
  const dark  = document.body.getAttribute('data-theme') === 'dark';
  const col   = getChartColors();
  Chart.defaults.color = col.text;
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
  Chart.defaults.font.size   = 12;

  // ── 1. Sales & Profit Line Chart (last 30 days) ─────────────────
  const days30 = [];
  const salesArr = [];
  const profitArr = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    days30.push(d.toLocaleDateString('en-PK', {month:'short', day:'numeric'}));
    const dayInvs = invoices.filter(inv => inv.date === ds);
    salesArr.push(dayInvs.reduce((s, inv) => s + inv.total, 0));
    profitArr.push(dayInvs.reduce((s, inv) => s + (inv.profit || 0), 0));
  }

  chartSalesProfit = destroyChart(chartSalesProfit);
  const ctx1 = document.getElementById('chartSalesProfit');
  if (ctx1) {
    chartSalesProfit = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: days30,
        datasets: [
          {
            label: 'Sales (PKR)',
            data: salesArr,
            borderColor: '#0b5fa5',
            backgroundColor: 'rgba(11,95,165,0.12)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#0b5fa5',
          },
          {
            label: 'Profit (PKR)',
            data: profitArr,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.10)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#16a34a',
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, padding: 15 } },
          tooltip: {
            callbacks: {
              label: ctx => ' PKR ' + ctx.parsed.y.toLocaleString('en-US', {minimumFractionDigits:0})
            }
          }
        },
        scales: {
          x: { grid: { color: col.grid }, ticks: { maxTicksLimit: 10, color: col.text } },
          y: {
            grid: { color: col.grid },
            ticks: {
              color: col.text,
              callback: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v
            }
          }
        }
      }
    });
  }

  // ── 2. Top 8 Products Bar Chart ──────────────────────────────────
  const prodRev = {};
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      if (!prodRev[item.name]) prodRev[item.name] = 0;
      prodRev[item.name] += item.total;
    });
  });
  const sorted = Object.entries(prodRev).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const prodLabels = sorted.map(([n]) => n.length > 14 ? n.slice(0,12)+'…' : n);
  const prodData   = sorted.map(([,v]) => v);
  const barColors  = ['#0b5fa5','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2','#ec4899','#ea580c'];

  chartTopProducts = destroyChart(chartTopProducts);
  const ctx2 = document.getElementById('chartTopProducts');
  if (ctx2) {
    chartTopProducts = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: prodLabels,
        datasets: [{
          label: 'Revenue (PKR)',
          data: prodData,
          backgroundColor: barColors,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' PKR ' + ctx.parsed.y.toLocaleString('en-US', {minimumFractionDigits:0})
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: col.text } },
          y: {
            grid: { color: col.grid },
            ticks: {
              color: col.text,
              callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
            }
          }
        }
      }
    });
  }

  // ── 3. Monthly Revenue vs Expenses (last 6 months) ───────────────
  const months6Labels = [];
  const months6Sales  = [];
  const months6Exp    = [];
  const months6Profit = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const mStr = d.toLocaleDateString('en-PK', {month:'short', year:'2-digit'});
    months6Labels.push(mStr);
    const mStart = dateStr(d);
    const mEnd   = dateStr(end);
    const mSales = invoices.filter(inv => inv.date >= mStart && inv.date <= mEnd)
                           .reduce((s, inv) => s + inv.total, 0);
    const mExp   = expenses.filter(e => e.date >= mStart && e.date <= mEnd)
                           .reduce((s, e) => s + e.amount, 0);
    const mProfit = invoices.filter(inv => inv.date >= mStart && inv.date <= mEnd)
                            .reduce((s, inv) => s + (inv.profit || 0), 0);
    months6Sales.push(mSales);
    months6Exp.push(mExp);
    months6Profit.push(mProfit);
  }

  chartMonthly = destroyChart(chartMonthly);
  const ctx3 = document.getElementById('chartMonthly');
  if (ctx3) {
    chartMonthly = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: months6Labels,
        datasets: [
          {
            label: 'Revenue',
            data: months6Sales,
            backgroundColor: 'rgba(11,95,165,0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Profit',
            data: months6Profit,
            backgroundColor: 'rgba(22,163,74,0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Expenses',
            data: months6Exp,
            backgroundColor: 'rgba(220,38,38,0.80)',
            borderRadius: 6,
            borderSkipped: false,
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, padding: 15 } },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + ctx.dataset.label + ': PKR ' + ctx.parsed.y.toLocaleString('en-US', {minimumFractionDigits:0})
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: col.text } },
          y: {
            grid: { color: col.grid },
            ticks: {
              color: col.text,
              callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
            }
          }
        }
      }
    });
  }

  // ── 4. Cash vs Credit Donut Chart ────────────────────────────────
  const cashTotal   = invoices.filter(i => i.paymentType === 'cash').reduce((s,i) => s+i.total, 0);
  const creditTotal = invoices.filter(i => i.paymentType === 'credit').reduce((s,i) => s+i.total, 0);

  chartPayType = destroyChart(chartPayType);
  const ctx4 = document.getElementById('chartPayType');
  if (ctx4) {
    chartPayType = new Chart(ctx4, {
      type: 'doughnut',
      data: {
        labels: ['Cash Sales', 'Credit Sales'],
        datasets: [{
          data: [cashTotal || 0, creditTotal || 0],
          backgroundColor: ['#16a34a', '#f59e0b'],
          borderColor: dark ? '#1e293b' : '#ffffff',
          borderWidth: 4,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
          tooltip: {
            callbacks: {
              label: ctx => ' PKR ' + ctx.parsed.toLocaleString('en-US', {minimumFractionDigits:0})
            }
          }
        }
      }
    });
  }
}

// INVOICE FUNCTIONS
function initInvoice() {
  let count = parseInt(localStorage.getItem(DB.COUNT) || '1000');
  document.getElementById('invNo').value = 'JN-' + String(count + 1).padStart(4, '0');
  
  const cSel = document.getElementById('invCustomer');
  cSel.innerHTML = '<option value="">-- Walk-in Customer --</option>';
  customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
    cSel.add(new Option(`${c.name} - ${c.phone}`, c.id));
  });
  
  // Populate hidden selProd for backward compat
  const pSel = document.getElementById('selProd');
  pSel.innerHTML = '<option value="">-- Select Product --</option>';
  products.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
    pSel.add(new Option(p.name, p.id));
  });
  // Reset search tab
  selectedProd = null;
  switchItemTab('inventory');
  
  // Update QR website text
  const website = localStorage.getItem('compWeb') || 'www.jnautos.store';
  document.getElementById('qrWebsite').innerText = website;
}

function fillCustomer() {
  const id = document.getElementById('invCustomer').value;
  if (!id) {
    document.getElementById('invPhone').value = '';
    document.getElementById('invEmail').value = '';
    document.getElementById('invAddress').value = '';
    document.getElementById('custBalanceBox').style.display = 'none';
    document.getElementById('invPrevBalance').value = '0';
    calcTotals();
    return;
  }
  const c = customers.find(x => x.id === id);
  if (c) {
    document.getElementById('invPhone').value = c.phone || '';
    document.getElementById('invEmail').value = c.email || '';
    document.getElementById('invAddress').value = c.address || '';

    // Calculate current outstanding balance from ledger
    const opening = c.opening || 0;
    const totalInvoiced = invoices.filter(i => i.customerId === id).reduce((s,i) => s + (i.total||0), 0);
    const totalPaid = payments.filter(p => p.customerId === id).reduce((s,p) => s + (p.amount||0), 0);
    const currentBalance = opening + totalInvoiced - totalPaid;

    // Show box and auto-fill editable field (only if customer has a balance)
    document.getElementById('custBalanceName').innerText = currentBalance > 0
      ? `Auto-filled from ledger — PKR ${currentBalance.toLocaleString()} outstanding`
      : currentBalance < 0
      ? `Customer has advance/credit of PKR ${Math.abs(currentBalance).toLocaleString()}`
      : 'Account is settled — no outstanding balance';
    document.getElementById('custBalanceBox').style.display = 'block';
    document.getElementById('invPrevBalance').value = currentBalance > 0 ? currentBalance.toFixed(2) : '0';
    calcTotals();
  }
}

function loadProd() {
  // kept for backward compat — now driven by selectProduct()
}

// ── Item Tab Switcher ─────────────────────────────
function switchItemTab(tab) {
  const isInv = tab === 'inventory';
  document.getElementById('tabInventoryContent').style.display = isInv ? 'block' : 'none';
  document.getElementById('tabManualContent').style.display   = isInv ? 'none'  : 'block';
  document.getElementById('tabInventory').style.background = isInv ? 'var(--primary)' : '#f1f5f9';
  document.getElementById('tabInventory').style.color      = isInv ? '#fff' : '#64748b';
  document.getElementById('tabManual').style.background    = isInv ? '#f1f5f9' : 'var(--warning)';
  document.getElementById('tabManual').style.color         = isInv ? '#64748b' : '#fff';
}

// ── Product Search (name or SKU) ─────────────────
let selectedProd = null;
let suggHighlight = -1;

function searchProduct() {
  const q = document.getElementById('prodSearch').value.trim().toLowerCase();
  const box = document.getElementById('prodSuggestions');
  selectedProd = null;
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodStock').value = '';
  document.getElementById('prodQty').max = '';
  document.getElementById('selectedProdInfo').style.display = 'none';

  if (q.length < 1) { box.style.display = 'none'; return; }

  const matches = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q)
  ).slice(0, 10);

  if (matches.length === 0) {
    const isDarkNF = document.body.getAttribute('data-theme') === 'dark';
    box.innerHTML = `<div style="padding:14px 16px;color:${isDarkNF?'#94a3b8':'#64748b'};font-size:13px;background:${isDarkNF?'#1e293b':'#fff'}">No products found — use Manual Entry tab</div>`;
    box.style.display = 'block';
    return;
  }

  box.innerHTML = matches.map((p, i) => {
    const stockColor = p.qty === 0 ? '#dc2626' : p.qty <= 5 ? '#f59e0b' : '#16a34a';
    const stockLabel = p.qty === 0 ? '⛔ Out of Stock' : `✅ ${p.qty} units`;
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const suggBg = isDark ? '#1e293b' : '#fff';
    const suggBorder = isDark ? '#334155' : '#f1f5f9';
    const subTextColor = isDark ? '#94a3b8' : '#64748b';
    const codeBg = isDark ? '#0f172a' : '#f1f5f9';
    const codeColor = isDark ? '#93c5fd' : '#0f172a';
    const nameColor = isDark ? '#f1f5f9' : '#0f172a';
    return `<div class="prod-suggestion" data-id="${p.id}" data-idx="${i}"
      onclick="selectProduct('${p.id}')"
      onmouseenter="suggHighlight=${i};highlightSugg()"
      style="padding:12px 16px;cursor:pointer;border-bottom:1px solid ${suggBorder};display:flex;justify-content:space-between;align-items:center;background:${suggBg}">
      <div>
        <div style="font-weight:700;font-size:14px;color:${nameColor}">${p.name}</div>
        <div style="font-size:12px;color:${subTextColor};margin-top:2px">
          SKU: <code style="background:${codeBg};color:${codeColor};padding:1px 5px;border-radius:4px">${p.sku}</code>
          &nbsp;|&nbsp; ${p.category || 'General'}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800;color:var(--primary);font-size:14px">PKR ${p.price.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
        <div style="font-size:11px;font-weight:700;color:${stockColor}">${stockLabel}</div>
      </div>
    </div>`;
  }).join('');

  suggHighlight = -1;
  box.style.display = 'block';
}

function highlightSugg() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('.prod-suggestion').forEach((el, i) => {
    el.style.background = i === suggHighlight
      ? (isDark ? '#1e3a5f' : '#eff6ff')
      : (isDark ? '#1e293b' : '#fff');
  });
}

function prodSearchKeyNav(e) {
  const items = document.querySelectorAll('.prod-suggestion');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    suggHighlight = Math.min(suggHighlight + 1, items.length - 1);
    highlightSugg();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    suggHighlight = Math.max(suggHighlight - 1, 0);
    highlightSugg();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (suggHighlight >= 0 && items[suggHighlight]) {
      const id = items[suggHighlight].dataset.id;
      selectProduct(id);
    }
  } else if (e.key === 'Escape') {
    document.getElementById('prodSuggestions').style.display = 'none';
  }
}

function selectProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  selectedProd = p;

  // Fill search box with product name
  document.getElementById('prodSearch').value = p.name;
  document.getElementById('prodSuggestions').style.display = 'none';

  // Fill price and stock
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodStock').value = p.qty + ' units';
  document.getElementById('prodQty').value = 1;
  document.getElementById('prodQty').max = p.qty;

  // Show selected badge
  const info = document.getElementById('selectedProdInfo');
  document.getElementById('selectedProdName').innerText = p.name;
  document.getElementById('selectedProdMeta').innerText =
    'SKU: ' + p.sku + '  |  Category: ' + (p.category || 'General') +
    '  |  Cost: PKR ' + p.cost.toLocaleString() + '  |  Price: PKR ' + p.price.toLocaleString();
  info.style.display = 'flex';

  // Keep hidden select in sync
  let opt = document.querySelector(`#selProd option[value="${id}"]`);
  if (!opt) {
    opt = document.createElement('option');
    opt.value = id;
    document.getElementById('selProd').appendChild(opt);
  }
  document.getElementById('selProd').value = id;

  // Focus qty
  document.getElementById('prodQty').focus();
  document.getElementById('prodQty').select();
}

function clearProdSelection() {
  selectedProd = null;
  document.getElementById('prodSearch').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodStock').value = '';
  document.getElementById('prodQty').value = '1';
  document.getElementById('selProd').value = '';
  document.getElementById('selectedProdInfo').style.display = 'none';
  document.getElementById('prodSearch').focus();
}

// Close suggestions when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('#tabInventoryContent')) {
    const box = document.getElementById('prodSuggestions');
    if (box) box.style.display = 'none';
  }
});

// ── Manual Item Entry ─────────────────────────────
function addManualItem() {
  const name  = document.getElementById('manualProdName').value.trim();
  const sku   = document.getElementById('manualSku').value.trim() || 'MANUAL';
  const qty   = parseInt(document.getElementById('manualQty').value) || 0;
  const price = parseFloat(document.getElementById('manualPrice').value) || 0;

  if (!name) { alert('Please enter product name'); document.getElementById('manualProdName').focus(); return; }
  if (qty <= 0) { alert('Please enter valid quantity'); document.getElementById('manualQty').focus(); return; }
  if (price <= 0) { alert('Please enter valid price'); document.getElementById('manualPrice').focus(); return; }

  currentInv.items.push({
    productId: 'MANUAL-' + Date.now(),
    name: name,
    sku: sku,
    qty: qty,
    price: price,
    cost: 0,
    total: qty * price,
    isManual: true
  });

  renderInvTable();
  calcTotals();

  // Clear fields
  document.getElementById('manualProdName').value = '';
  document.getElementById('manualSku').value = '';
  document.getElementById('manualQty').value = '1';
  document.getElementById('manualPrice').value = '';
  document.getElementById('manualProdName').focus();
}

function toggleCredit() {
  const isCredit = document.getElementById('invType').value === 'credit';
  const row = document.getElementById('creditRow');
  if (isCredit) {
    row.style.opacity = '1';
    row.style.pointerEvents = 'all';
    const d = new Date();
    d.setDate(d.getDate() + 30);
    document.getElementById('invDue').value = d.toISOString().split('T')[0];
  } else {
    row.style.opacity = '0.5';
    row.style.pointerEvents = 'none';
    document.getElementById('invDue').value = '';
  }
}

function addItem() {
  const prod = selectedProd || products.find(x => x.id === document.getElementById('selProd').value);
  if (!prod) {
    alert('Please search and select a product first');
    document.getElementById('prodSearch').focus();
    return;
  }

  const qty = parseInt(document.getElementById('prodQty').value) || 0;
  if (qty <= 0) { alert('Please enter valid quantity'); return; }
  if (qty > prod.qty) {
    alert('Insufficient stock! Only ' + prod.qty + ' units available.');
    return;
  }

  const price = parseFloat(document.getElementById('prodPrice').value) || prod.price;
  if (price <= 0) { alert('Please enter valid price'); return; }

  const existing = currentInv.items.find(i => i.productId === prod.id);
  if (existing) {
    if (existing.qty + qty > prod.qty) { alert('Total quantity exceeds available stock!'); return; }
    existing.qty += qty;
    existing.total = existing.qty * existing.price;
  } else {
    currentInv.items.push({
      productId: prod.id,
      name: prod.name,
      sku: prod.sku,
      qty: qty,
      price: price,
      cost: prod.cost || 0,
      total: qty * price
    });
  }

  renderInvTable();
  calcTotals();
  clearProdSelection();
}

function renderInvTable() {
  const tb = document.getElementById('itemTable');
  tb.innerHTML = '';
  currentInv.items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.sku}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">${fmtMoney(item.price)}</td>
      <td style="text-align:right">${fmtMoney(item.total)}</td>
      <td class="noPrint" style="text-align:center;white-space:nowrap">
        <button class="iconBtn" onclick="editItem(${idx})" title="Edit Item" style="background:#dbeafe;color:#1e40af">✏️</button>
        <button class="iconBtn danger" onclick="removeItem(${idx})" title="Remove Item">🗑️</button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

function removeItem(idx) {
  if(confirm('Remove this item?')) {
    currentInv.items.splice(idx, 1);
    renderInvTable();
    calcTotals();
  }
}

function editItem(idx) {
  const item = currentInv.items[idx];
  if (!item) return;
  document.getElementById('editItemIdx').value = idx;
  document.getElementById('editItemName').value = item.name;
  document.getElementById('editItemSku').value = item.sku;
  document.getElementById('editItemQty').value = item.qty;
  document.getElementById('editItemPrice').value = item.price;
  updateEditTotal();
  document.getElementById('editItemModal').classList.add('show');
}

function updateEditTotal() {
  const qty = parseFloat(document.getElementById('editItemQty').value) || 0;
  const price = parseFloat(document.getElementById('editItemPrice').value) || 0;
  document.getElementById('editItemTotal').innerText = fmtMoney(qty * price);
}

function closeEditItemModal() {
  document.getElementById('editItemModal').classList.remove('show');
}

function saveEditItem() {
  const idx = parseInt(document.getElementById('editItemIdx').value);
  const name = document.getElementById('editItemName').value.trim();
  const sku = document.getElementById('editItemSku').value.trim();
  const qty = parseFloat(document.getElementById('editItemQty').value) || 0;
  const price = parseFloat(document.getElementById('editItemPrice').value) || 0;

  if (!name) { alert('Product name cannot be empty'); return; }
  if (qty <= 0) { alert('Quantity must be greater than 0'); return; }
  if (price < 0) { alert('Price cannot be negative'); return; }

  const item = currentInv.items[idx];
  item.name = name;
  item.sku = sku;
  item.qty = qty;
  item.price = price;
  item.total = qty * price;

  closeEditItemModal();
  renderInvTable();
  calcTotals();
}

function calcTotals() {
  const sub = currentInv.items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = parseFloat(document.getElementById('invTax').value) || 0;
  const discount = parseFloat(document.getElementById('invDiscount').value) || 0;
  const prevBal = parseFloat(document.getElementById('invPrevBalance')?.value) || 0;
  const tax = sub * (taxRate / 100);
  const total = sub + tax - discount + prevBal;
  const profit = currentInv.items.reduce((sum, item) => sum + ((item.price - item.cost) * item.qty), 0) - discount;

  document.getElementById('valSub').innerText = fmtMoney(sub);
  document.getElementById('valTax').innerText = fmtMoney(tax);
  document.getElementById('valDiscount').innerText = fmtMoney(discount);
  document.getElementById('valTotal').innerText = fmtMoney(total);
  document.getElementById('valProfit').innerText = fmtMoney(profit);

  // Show/hide previous balance row in totals panel
  const prevBalRow = document.getElementById('prevBalRow');
  if (prevBalRow) {
    if (prevBal > 0) {
      prevBalRow.style.display = 'flex';
      document.getElementById('valPrevBal').innerText = fmtMoney(prevBal);
    } else {
      prevBalRow.style.display = 'none';
    }
  }

  currentInv.subtotal = sub;
  currentInv.tax = tax;
  currentInv.discount = discount;
  currentInv.prevBalance = prevBal;
  currentInv.total = total;
  currentInv.profit = profit;
}

function previewInvoice() {
  if (currentInv.items.length === 0) {
    alert('Please add items to preview');
    return;
  }
  preparePrintInvoice();
  document.getElementById('invoicePrintArea').classList.remove('hidden');
  document.getElementById('printableInvoice').scrollIntoView({behavior: 'smooth'});
}

function preparePrintInvoice() {
  updateInvoiceLogo();
  
  document.getElementById('printCompName').innerText = localStorage.getItem('compName') || 'JN AUTOS';
  document.getElementById('printCompPhone').innerText = '📞 ' + (localStorage.getItem('compPhone') || '');
  document.getElementById('printCompAddr').innerText = localStorage.getItem('compAddr') || '';
  
  document.getElementById('printInvNo').innerText = document.getElementById('invNo').value;
  document.getElementById('printDate').innerText = new Date(document.getElementById('invDate').value).toLocaleDateString();
  document.getElementById('printTime').innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: true});
  
  const statusSpan = document.getElementById('printStatus');
  const isCredit = document.getElementById('invType').value === 'credit';
  statusSpan.innerText = isCredit ? 'UNPAID' : 'PAID';
  statusSpan.style.color = isCredit ? '#f59e0b' : '#16a34a';
  statusSpan.style.fontWeight = '800';
  statusSpan.style.padding = '4px 12px';
  statusSpan.style.borderRadius = '6px';
  statusSpan.style.background = isCredit ? '#fef3c7' : '#dcfce7';
  
  const custId = document.getElementById('invCustomer').value;
  if (custId) {
    const c = customers.find(x => x.id === custId);
    document.getElementById('printCustName').innerText = c.name;
    document.getElementById('printCustPhone').innerText = c.phone ? `📞 ${c.phone}` : '';
    document.getElementById('printCustEmail').innerText = c.email ? `✉️ ${c.email}` : '';
    document.getElementById('printCustAddr').innerText = c.address ? `📍 ${c.address}` : '';
  } else {
    document.getElementById('printCustName').innerText = 'Walk-in Customer';
    document.getElementById('printCustPhone').innerText = document.getElementById('invPhone').value ? `📞 ${document.getElementById('invPhone').value}` : '';
    document.getElementById('printCustEmail').innerText = '';
    document.getElementById('printCustAddr').innerText = '';
  }
  
  document.getElementById('printPayType').innerText = document.getElementById('invType').value.toUpperCase();
  const dueBox = document.getElementById('printDueDateBox');
  if (isCredit) {
    dueBox.style.display = 'block';
    document.getElementById('printDueDate').innerText = new Date(document.getElementById('invDue').value).toLocaleDateString();
  } else {
    dueBox.style.display = 'none';
  }
  
  document.getElementById('printUser').innerText = localStorage.getItem(DB.USER);
  
  const tbody = document.getElementById('printItems');
  tbody.innerHTML = currentInv.items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${item.name}</strong></td>
      <td><code class="skuCode">${item.sku}</code></td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">${fmtMoney(item.price)}</td>
      <td style="text-align:right"><strong>${fmtMoney(item.total)}</strong></td>
    </tr>
  `).join('');
  
  document.getElementById('printSub').innerText = fmtMoney(currentInv.subtotal);
  document.getElementById('printTax').innerText = fmtMoney(currentInv.tax);
  document.getElementById('printDiscount').innerText = fmtMoney(currentInv.discount || 0);
  document.getElementById('printTotal').innerText = fmtMoney(currentInv.total);

  // Previous balance row on print
  const prevBal = currentInv.prevBalance || 0;
  const printPrevRow = document.getElementById('printPrevBalRow');
  if (printPrevRow) {
    if (prevBal > 0) {
      printPrevRow.style.display = 'flex';
      document.getElementById('printPrevBal').innerText = fmtMoney(prevBal);
    } else {
      printPrevRow.style.display = 'none';
    }
  }

  const notes = document.getElementById('invNotes').value.trim();
  document.getElementById('printNotes').innerText = notes || 'No additional notes';
}

// FIXED: Separate save and print functions with proper timing
async function saveInvoice(shouldPrint = false) {
  if (currentInv.items.length === 0) {
    alert('Please add at least one item');
    return;
  }
  
  const isCredit = document.getElementById('invType').value === 'credit';
  const custId = document.getElementById('invCustomer').value;
  
  if (isCredit && !custId) {
    alert('Please select a registered customer for credit sales');
    return;
  }
  
  const inv = {
    id: genId('INV'),
    number: document.getElementById('invNo').value,
    date: document.getElementById('invDate').value,
    dueDate: isCredit ? document.getElementById('invDue').value : null,
    customerId: custId,
    customerName: custId ? customers.find(c => c.id === custId)?.name : (document.getElementById('invPhone').value || 'Walk-in'),
    customerPhone: document.getElementById('invPhone').value,
    customerEmail: document.getElementById('invEmail').value,
    customerAddress: document.getElementById('invAddress').value,
    paymentType: isCredit ? 'credit' : 'cash',
    status: isCredit ? 'unpaid' : 'paid',
    items: JSON.parse(JSON.stringify(currentInv.items)),
    subtotal: currentInv.subtotal,
    tax: currentInv.tax,
    discount: currentInv.discount || 0,
    prevBalance: currentInv.prevBalance || 0,
    total: currentInv.total,
    profit: currentInv.profit,
    notes: document.getElementById('invNotes').value,
    createdAt: new Date().toISOString(),
    invoiceTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: true})
  };
  
  // Deduct stock
  inv.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.qty -= item.qty;
      if(prod.qty < 0) prod.qty = 0;
    }
  });
  
  invoices.unshift(inv);
  
  let count = parseInt(localStorage.getItem(DB.COUNT) || '1000');
  localStorage.setItem(DB.COUNT, count + 1);
  
  saveData();
  
  // Prepare print preview BEFORE any reset or alert
  preparePrintInvoice();
  document.getElementById('invoicePrintArea').classList.remove('hidden');

  // Capture the fully-rendered invoice HTML RIGHT NOW before resetInv() clears it
  const capturedPrintHTML = document.getElementById('printableInvoice').innerHTML;

  downloadInvoice(inv);
  
  alert(`Invoice ${inv.number} saved successfully!`);
  resetInv();
  updateDashboard();

  // Print AFTER reset, using the captured HTML snapshot (so reset can't wipe it)
  if (shouldPrint) {
    printInvoiceFromHTML(capturedPrintHTML, companyLogo);
  }
}

// Preview-only print (reads live DOM)
function printInvoice() {
  const printable = document.getElementById('printableInvoice');
  if (!printable) return;
  document.getElementById('invoicePrintArea').classList.remove('hidden');
  // Capture logo from memory BEFORE passing to print
  printInvoiceFromHTML(printable.innerHTML, companyLogo);
}

// Core shared print function - accepts pre-captured HTML so resetInv() cannot wipe it
function printInvoiceFromHTML(printContent, logoData) {
  // logoData = base64 string or null
  const _logo = logoData || companyLogo || null;
  const printWindow = window.open('', '_blank', 'width=820,height=1000');
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice Print</title>
  <style>
    :root {
      --primary: #0b5fa5;
      --primary-dark: #074a85;
      --success: #16a34a;
      --warning: #f59e0b;
      --danger: #dc2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    body { background: #fff; color: #0f172a; font-size: 14px; line-height: 1.5; }

    /* ── Invoice wrapper ── */
    .invoicePreview {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 30px 40px;
      max-width: 210mm;
      width: 100%;
      margin: 10px auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }

    /* ── Header ── */
    .invoiceHeader {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid var(--primary);
      align-items: center;
    }
    .invoiceLogoSection { display: flex; align-items: center; gap: 20px; flex: 1; }
    .invoiceLogoImg {
      width: 100px; height: 100px; object-fit: contain;
      border-radius: 10px; border: 2px solid #e2e8f0;
      padding: 5px; background: #fff;
    }
    .invoiceLogo { font-size: 42px; font-weight: 900; color: var(--primary); line-height: 1; }
    .invoiceLogoText { flex: 1; }
    .invoiceCompany { flex: 1; text-align: right; }
    .invoiceCompany h2 { margin: 0; font-size: 28px; color: var(--primary); }
    .invoiceCompany p { margin: 5px 0; color: #64748b; font-size: 14px; }

    /* ── Details grid ── */
    .invoiceDetails {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 40px; margin-bottom: 40px;
    }
    .invoiceBox { background: #f8fafc; padding: 20px; border-radius: 10px; }
    .invoiceBox h4 { margin: 0 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .invoiceBox p { margin: 4px 0; font-size: 14px; }

    /* ── Items table ── */
    .invoiceTable { width: 100%; margin: 30px 0; border-collapse: collapse; }
    .invoiceTable th {
      background: #f1f5f9; padding: 12px; font-weight: 700;
      text-align: left; border-bottom: 2px solid #e2e8f0;
    }
    .invoiceTable td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .invoiceTable td code {
      background: #f1f5f9; padding: 2px 6px; border-radius: 4px;
      font-family: monospace; font-size: 12px;
    }

    /* ── Totals ── */
    .invoiceTotals { margin-left: auto; width: 350px; margin-top: 30px; }
    .invoiceTotalsRow {
      display: flex; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid #e2e8f0;
    }
    .invoiceTotalsRow.total {
      border-top: 3px solid var(--primary); border-bottom: none;
      padding-top: 15px; margin-top: 10px;
      font-size: 20px; font-weight: 800; color: var(--primary);
    }

    /* ── Notes ── */
    .printNoteBox {
      margin-top: 40px; padding: 20px;
      background: #f8fafc; border-radius: 10px;
      border-left: 4px solid var(--primary);
    }
    .printNoteBox p { margin-top: 5px; color: #64748b; }

    /* ── Footer ── */
    .invoiceFooter {
      margin-top: 50px; padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center; color: #64748b; font-size: 13px;
    }
    .invoiceFooter .thankyou { font-size: 16px; margin-bottom: 10px; font-weight: 700; color: #0f172a; }

    /* ── Status badge ── */
    .statusPaid   { color: #16a34a; font-weight: 800; padding: 4px 12px; border-radius: 6px; background: #dcfce7; }
    .statusUnpaid { color: #f59e0b; font-weight: 800; padding: 4px 12px; border-radius: 6px; background: #fef3c7; }

    /* ── Print ── */
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { background: #fff !important; margin: 0; }
      .invoicePreview {
        border: none !important; box-shadow: none !important;
        margin: 0 !important; padding: 15px !important;
        max-width: 100% !important; width: 100% !important; border-radius: 0 !important;
      }
      .invoiceHeader { border-bottom: 3px solid #0b5fa5 !important; }
      .invoiceTable th { background: #f1f5f9 !important; }
      .invoiceBox { background: #f8fafc !important; }
      .printNoteBox { background: #f8fafc !important; border-left: 4px solid #0b5fa5 !important; }
      .invoiceTotalsRow.total { border-top: 3px solid #0b5fa5 !important; color: #0b5fa5 !important; }
      .invoiceTotals { page-break-inside: avoid; }
      .invoiceTable { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="invoicePreview">
    ${printContent}
  </div>
  <script>
    window.onload = function() {
      // ── Inject logo from base64 if available ──
      var logoData = "${_logo ? _logo.replace(/`/g,'') : ''}";
      var img = document.getElementById('printLogo');
      var txt = document.getElementById('printLogoText');
      if (logoData && logoData.length > 50) {
        if (img) { img.src = logoData; img.style.display = 'block'; img.style.maxWidth='90px'; img.style.maxHeight='90px'; }
        if (txt) txt.style.display = 'none';
      } else {
        if (img) img.style.display = 'none';
        if (txt) txt.style.display = 'block';
      }
      // ── Fix status badge ──
      var status = document.getElementById('printStatus');
      if (status) {
        var text = status.innerText.trim();
        status.className = (text === 'PAID') ? 'statusPaid' : 'statusUnpaid';
        status.removeAttribute('style');
      }
      setTimeout(function() { window.print(); window.close(); }, 400);
    };
  <\/script>
</body>
</html>`);
  printWindow.document.close();
}

// NEW: Save and print wrapper function
function saveAndPrintInvoice() {
  saveInvoice(true);
}

function downloadInvoice(inv) {
  // Build the same styled HTML as printInvoiceFromHTML but auto-triggers Save as PDF
  const compName = localStorage.getItem('compName') || 'JN AUTOS';
  const compPhone = localStorage.getItem('compPhone') || '';
  const compAddr = localStorage.getItem('compAddr') || '';
  const invoiceTime = inv.invoiceTime || new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});

  const itemRows = inv.items.map((item, idx) => `
    <tr>
      <td>${idx+1}</td>
      <td><strong>${item.name}</strong><br><small style="color:#64748b">${item.sku}</small></td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">PKR ${item.price.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
      <td style="text-align:right"><strong>PKR ${item.total.toLocaleString('en-US',{minimumFractionDigits:2})}</strong></td>
    </tr>`).join('');

  const statusColor = inv.paymentType === 'credit' ? '#f59e0b' : '#16a34a';
  const statusBg    = inv.paymentType === 'credit' ? '#fef3c7' : '#dcfce7';
  const statusText  = inv.paymentType === 'credit' ? 'UNPAID'  : 'PAID';

  // Capture logo BEFORE opening new window (companyLogo is base64 in memory)
  const logoHTML = companyLogo
    ? `<img src="${companyLogo}" style="width:72px;height:72px;object-fit:contain;border-radius:12px;border:2px solid #e2e8f0;padding:4px;background:#fff;" alt="Logo">`
    : `<div style="width:72px;height:72px;background:linear-gradient(135deg,#0b5fa5,#074a85);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff">JN</div>`;

  const win = window.open('', '_blank', 'width=820,height=1000');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${inv.number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',system-ui,sans-serif}
    body{background:#fff;color:#0f172a;font-size:14px;line-height:1.5}
    .wrap{max-width:210mm;width:100%;margin:10px auto;padding:30px 40px;border:1px solid #e2e8f0;border-radius:12px}
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:25px;border-bottom:3px solid #0b5fa5;margin-bottom:30px}
    .logo-section{display:flex;align-items:center;gap:16px}
    .logo-box{width:72px;height:72px;background:linear-gradient(135deg,#0b5fa5,#074a85);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff}
    .comp-name{font-size:22px;font-weight:800;color:#0b5fa5}
    .comp-sub{font-size:12px;color:#64748b;margin-top:2px}
    .inv-title{text-align:right}
    .inv-title h2{font-size:30px;font-weight:900;color:#0b5fa5;letter-spacing:3px}
    .inv-title p{font-size:13px;color:#64748b;margin-top:5px}
    .inv-title strong{color:#0f172a}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-bottom:25px}
    .box{background:#f8fafc;padding:18px;border-radius:10px;border:1px solid #e2e8f0}
    .box h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin-bottom:10px}
    .box p{margin:4px 0;font-size:14px}
    .box .big{font-size:17px;font-weight:800;color:#0f172a}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    thead tr{background:#0b5fa5}
    th{padding:11px 12px;color:#fff;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
    td{padding:11px 12px;border-bottom:1px solid #f1f5f9}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .totals{margin-left:auto;width:320px;margin-top:5px}
    .trow{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
    .trow.grand{border-top:3px solid #0b5fa5;border-bottom:none;padding-top:14px;margin-top:8px;font-size:20px;font-weight:800;color:#0b5fa5}
    .notes{background:#f8fafc;border-left:4px solid #0b5fa5;border-radius:8px;padding:15px 18px;margin-top:20px;font-size:13px}
    .footer{margin-top:35px;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px}
    .footer .ty{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:6px;font-weight:800;font-size:13px;background:${statusBg};color:${statusColor}}
    @page{size:A4 portrait;margin:10mm}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0}
      .wrap{border:none;margin:0;padding:15px 20px;max-width:100%;width:100%;border-radius:0}
      thead tr{background:#0b5fa5!important}
      .box{background:#f8fafc!important}
      .notes{background:#f8fafc!important}
      tbody tr:nth-child(even) td{background:#f8fafc!important}
      table{page-break-inside:auto}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
    }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo-section">
      ${logoHTML}
      <div>
        <div class="comp-name">${compName}</div>
        ${compAddr ? '<div class="comp-sub">'+compAddr+'</div>' : ''}
        ${compPhone ? '<div class="comp-sub">📞 '+compPhone+'</div>' : ''}
      </div>
    </div>
    <div class="inv-title">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${inv.number}</p>
      <p><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${invoiceTime}</p>
      <p><strong>Status:</strong> <span class="status-badge">${statusText}</span></p>
    </div>
  </div>

  <div class="details">
    <div class="box">
      <h4>Bill To</h4>
      <p class="big">${inv.customerName}</p>
      ${inv.customerPhone ? '<p>📞 '+inv.customerPhone+'</p>' : ''}
      ${inv.customerAddress ? '<p>📍 '+inv.customerAddress+'</p>' : ''}
    </div>
    <div class="box">
      <h4>Payment Details</h4>
      <p><strong>Type:</strong> ${inv.paymentType.toUpperCase()}</p>
      ${inv.dueDate ? '<p><strong>Due Date:</strong> '+new Date(inv.dueDate).toLocaleDateString()+'</p>' : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="trow"><span>Subtotal:</span><span>PKR ${inv.subtotal.toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
    <div class="trow"><span>Tax:</span><span>PKR ${(inv.tax||0).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
    <div class="trow"><span>Discount:</span><span>PKR ${(inv.discount||0).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
    ${(inv.prevBalance||0) > 0 ? `<div class="trow" style="color:#dc2626"><span>Previous Balance:</span><span>PKR ${(inv.prevBalance).toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>` : ''}
    <div class="trow grand"><span>Total:</span><span>PKR ${inv.total.toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>
  </div>

  ${inv.notes ? '<div class="notes"><strong>Notes:</strong> '+inv.notes+'</div>' : ''}

  <div class="footer">
    <div class="ty">Thank you for your business!</div>
    <p>For any queries please contact us &nbsp;|&nbsp; ${compName}</p>
    <p style="margin-top:5px;color:#94a3b8">This is a computer-generated invoice and does not require a signature.</p>
  </div>
</div>
<script>
  window.onload = function() {
    // Set document title so PDF filename = Invoice number
    document.title = 'Invoice_${inv.number}';
    window.print();
  };
<\/script>
</body></html>`);
  win.document.close();
}

function loadLastInvoice() {
  if (invoices.length === 0) {
    alert('No previous invoices found');
    return;
  }
  const last = invoices[0];
  document.getElementById('invCustomer').value = last.customerId || '';
  fillCustomer();
  document.getElementById('invType').value = last.paymentType;
  toggleCredit();
  document.getElementById('invTax').value = ((last.tax / last.subtotal) * 100) || 0;
  document.getElementById('invDiscount').value = last.discount || 0;
  document.getElementById('invNotes').value = last.notes || '';
  
  currentInv.items = JSON.parse(JSON.stringify(last.items));
  renderInvTable();
  calcTotals();
}

function genQR() {
  if (currentInv.items.length === 0) return alert('Add items first');
  
  const container = document.getElementById('qrcode');
  container.innerHTML = '';
  
  const qrData = {
    store: localStorage.getItem('compName') || 'JN AUTOS',
    invoice: document.getElementById('invNo').value,
    total: currentInv.total,
    date: new Date().toISOString()
  };
  
  new QRCode(container, {
    text: JSON.stringify(qrData),
    width: 150,
    height: 150
  });
  
  document.getElementById('qrBox').classList.remove('hidden');
}

function resetInv() {
  currentInv = { items: [] };
  renderInvTable();
  calcTotals();
  document.getElementById('invCustomer').value = '';
  document.getElementById('invPhone').value = '';
  document.getElementById('invEmail').value = '';
  document.getElementById('invAddress').value = '';
  document.getElementById('invType').value = 'cash';
  document.getElementById('invTax').value = '0';
  document.getElementById('invDiscount').value = '0';
  document.getElementById('invNotes').value = '';
  document.getElementById('qrBox').classList.add('hidden');
  // Clear new search fields
  if (document.getElementById('prodSearch')) document.getElementById('prodSearch').value = '';
  if (document.getElementById('prodStock')) document.getElementById('prodStock').value = '';
  if (document.getElementById('prodPrice')) document.getElementById('prodPrice').value = '';
  if (document.getElementById('selectedProdInfo')) document.getElementById('selectedProdInfo').style.display = 'none';
  if (document.getElementById('prodSuggestions')) document.getElementById('prodSuggestions').style.display = 'none';
  if (document.getElementById('manualProdName')) document.getElementById('manualProdName').value = '';
  if (document.getElementById('manualSku')) document.getElementById('manualSku').value = '';
  if (document.getElementById('manualQty')) document.getElementById('manualQty').value = '1';
  if (document.getElementById('manualPrice')) document.getElementById('manualPrice').value = '';
  selectedProd = null;
  switchItemTab('inventory');
  document.getElementById('invoicePrintArea').classList.add('hidden');
  document.getElementById('custBalanceBox').style.display = 'none';
  document.getElementById('invPrevBalance').value = '0';
  toggleCredit();
  initInvoice();
}

// CUSTOMER FUNCTIONS
let _custSaving = false;
function addCustomer() {
  if (_custSaving) return;

  const name    = document.getElementById('newCustName').value.trim();
  const phone   = document.getElementById('newCustPhone').value.trim();
  const email   = document.getElementById('newCustEmail').value.trim();
  const address = document.getElementById('newCustAddr').value.trim();
  const opening = parseFloat(document.getElementById('newCustOpen').value) || 0;

  if (!name) {
    showAppToast('❌ Customer name is required!', 'error');
    document.getElementById('newCustName').focus();
    return;
  }
  if (!phone) {
    showAppToast('❌ Phone number is required!', 'error');
    document.getElementById('newCustPhone').focus();
    return;
  }

  // Always re-read from localStorage to avoid stale in-memory data
  // (Firebase sync can silently overwrite the in-memory array)
  customers = JSON.parse(localStorage.getItem(DB.CUST) || '[]');

  const phoneClean = phone.replace(/\s+/g, '');
  if (customers.find(c => c.phone.replace(/\s+/g, '') === phoneClean)) {
    showAppToast('❌ A customer with this phone number already exists!', 'error');
    document.getElementById('newCustPhone').focus();
    return;
  }

  _custSaving = true;

  try {
    customers.push({
      id:      genId('CUST'),
      name:    name,
      phone:   phone,
      email:   email,
      address: address,
      opening: opening,
      created: new Date().toISOString()
    });

    saveData();

    // Immediately push to Firebase so remote can't overwrite this new customer
    if (typeof fbConnected !== 'undefined' && fbConnected) {
      clearTimeout(_fbSaveTimer);
      if (typeof fbPush === 'function') fbPush(true);
    }

    document.getElementById('newCustName').value  = '';
    document.getElementById('newCustPhone').value = '';
    document.getElementById('newCustEmail').value = '';
    document.getElementById('newCustAddr').value  = '';
    document.getElementById('newCustOpen').value  = '0';

    renderCust();
    showAppToast(`✅ Customer "${name}" saved successfully!`, 'success');
  } catch(err) {
    console.error('addCustomer error:', err);
    showAppToast('❌ Failed to save customer. Please try again.', 'error');
  } finally {
    // Always reset the flag so button is never permanently stuck
    _custSaving = false;
  }
}

function buildBalanceCache() {
  // Pre-compute all balances in one pass instead of re-scanning arrays per customer
  const cache = {};
  customers.forEach(c => { cache[c.id] = c.opening || 0; });
  invoices.forEach(i => {
    if (i.paymentType === 'credit' && cache[i.customerId] !== undefined)
      cache[i.customerId] += (i.total || 0);
  });
  const seen = new Set();
  payments.forEach(p => {
    if (!p.id || seen.has(p.id)) return;
    seen.add(p.id);
    if (cache[p.customerId] !== undefined)
      cache[p.customerId] -= (p.amount || 0);
  });
  return cache;
}

function renderCust() {
  const search = document.getElementById('searchCust').value.toLowerCase();
  const tb = document.getElementById('custTable');
  tb.innerHTML = '';

  // Build all balances in one fast pass (avoids N×M loop per customer)
  const balCache = buildBalanceCache();

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search) ||
    c.phone.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search))
  );

  // Build all rows as one HTML string — much faster than per-row DOM append
  tb.innerHTML = filtered.map(c => {
    const bal = balCache[c.id] ?? 0;
    return `<tr>
      <td>
        <div style="font-weight:700">${c.name}</div>
        <small style="color:#64748b">${c.email || ''}</small>
      </td>
      <td>
        <div>📞 ${c.phone}</div>
        <small style="color:#64748b">${c.address || ''}</small>
      </td>
      <td>
        <span class="badge ${bal > 0 ? 'badgeWarning' : bal < 0 ? 'badgeInfo' : 'badgeSuccess'}" style="font-size:13px;padding:6px 12px">
          ${bal < 0 ? '↑ Advance: ' + fmtMoney(Math.abs(bal)) : fmtMoney(bal)}
        </span>
      </td>
      <td class="noPrint">
        <button class="iconBtn" onclick="viewCust('${c.id}')" title="View Details">👁️</button>
        <button class="iconBtn success" onclick="quickPay('${c.id}')" title="Receive Payment">💰</button>
        <button class="iconBtn danger" onclick="deleteCustomer('${c.id}')" title="Delete Customer Permanently" style="background:#fee2e2;color:#dc2626">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function viewCust(id) {
  selectedCust = id;
  const c = customers.find(x => x.id === id);
  const bal = getBalance(id);
  
  // Create modal dynamically
  const modalHtml = `
    <div class="modal show" id="custDetailModal">
      <div class="modalContent" style="max-width:900px">
        <div class="modalHeader">
          <h3>👤 Customer Details</h3>
          <button class="closeBtn" onclick="closeCustDetail()">×</button>
        </div>
        <div class="modalBody">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:20px">
            <div>
              <div style="font-size:12px;color:#64748b;text-transform:uppercase">Customer Name</div>
              <div style="font-size:20px;font-weight:800">${c.name}</div>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;text-transform:uppercase">Current Balance</div>
              <div style="font-size:28px;font-weight:800;color:${bal > 0 ? '#ca8a04' : '#16a34a'}">${bal < 0 ? 'Advance: ' + fmtMoney(Math.abs(bal)) : fmtMoney(bal)}</div>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;text-transform:uppercase">Phone</div>
              <div style="font-weight:600">${c.phone}</div>
            </div>
            <div>
              <div style="font-size:12px;color:#64748b;text-transform:uppercase">Since</div>
              <div style="font-weight:600">${new Date(c.created).toLocaleDateString()}</div>
            </div>
          </div>
          
          <div style="border-bottom:2px solid var(--border);margin-bottom:20px">
            <div style="display:flex;gap:5px">
              <button class="tabBtn active" onclick="switchCustTab('purchases')">Purchases</button>
              <button class="tabBtn" onclick="switchCustTab('payments')">Payments</button>
              <button class="tabBtn" onclick="switchCustTab('ledger')">Ledger</button>
            </div>
          </div>
          
          <div id="custTab-purchases" class="tabContent active">
            <div style="overflow-x:auto;max-height:300px">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody id="custPurchTable"></tbody>
              </table>
            </div>
          </div>
          
          <div id="custTab-payments" class="tabContent">
            <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
              <button onclick="cleanDuplicatePayments('${id}')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">🧹 Remove Duplicate Payments</button>
            </div>
            <div style="overflow-x:auto;max-height:300px">
              <table>
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Note</th>
                    <th style="text-align:center">Actions</th>
                  </tr>
                </thead>
                <tbody id="custPayTable"></tbody>
              </table>
            </div>
          </div>
          
          <div id="custTab-ledger" class="tabContent">
            <div style="overflow-x:auto;max-height:300px">
              <table class="ledgerTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody id="custLedgerTable"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existing = document.getElementById('custDetailModal');
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Populate data
  const purch = invoices.filter(i => i.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('custPurchTable').innerHTML = purch.length ? purch.map(inv => `
    <tr>
      <td>${new Date(inv.date).toLocaleDateString()}</td>
      <td><strong>${inv.number}</strong></td>
      <td>${inv.items.length} items</td>
      <td>${fmtMoney(inv.total)}</td>
      <td><span class="${inv.paymentType === 'credit' ? 'creditBadge' : 'paidBadge'}">${inv.paymentType.toUpperCase()}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;padding:30px;color:#64748b">No purchases found</td></tr>';
  
  const pays = payments.filter(p => p.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('custPayTable').innerHTML = pays.length ? pays.map(p => `
    <tr id="payrow_${p.id}">
      <td><code class="skuCode">${p.receiptNo || '—'}</code></td>
      <td>${new Date(p.date).toLocaleDateString()}<br><small style="color:#94a3b8">${p.created ? new Date(p.created).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</small></td>
      <td style="color:var(--success);font-weight:800;font-size:15px">${fmtMoney(p.amount)}</td>
      <td>${p.method || 'Cash'}</td>
      <td style="color:#64748b;font-size:12px">${p.note || '—'}</td>
      <td style="text-align:center;white-space:nowrap">
        <button class="iconBtn" onclick="reprintPaymentReceipt('${p.id}')" title="Print / Download Receipt" style="background:#0b5fa5;color:#fff">🖨️</button>
        <button class="iconBtn danger" onclick="deletePayment('${p.id}','${id}')" title="Delete Payment" style="background:#fee2e2;color:#dc2626">🗑️</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748b">No payments found</td></tr>';
  
  // Generate mini ledger
  let balance = c.opening || 0;
  let html = `<tr style="background:#f8fafc;font-weight:700">
    <td>-</td>
    <td>OPEN</td>
    <td>Opening Balance</td>
    <td class="debit" style="text-align:right">${c.opening > 0 ? fmtMoney(c.opening) : '-'}</td>
    <td class="credit" style="text-align:right">${c.opening < 0 ? fmtMoney(Math.abs(c.opening)) : '-'}</td>
    <td class="balance" style="text-align:right">${fmtMoney(balance)}</td>
  </tr>`;
  
  let trans = [];
  purch.forEach(i => trans.push({date: i.date, type: 'sale', amt: i.total, ref: i.number}));
  pays.forEach(p => trans.push({date: p.date, type: 'pay', amt: p.amount, ref: p.id.substr(-6)}));
  trans.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  trans.forEach(t => {
    if (t.type === 'sale') {
      balance += t.amt;
      html += `<tr>
        <td>${new Date(t.date).toLocaleDateString()}</td>
        <td><strong>${t.ref}</strong></td>
        <td>Sale</td>
        <td class="debit" style="text-align:right">${fmtMoney(t.amt)}</td>
        <td style="text-align:right">-</td>
        <td class="balance" style="text-align:right;background:#f8fafc">${fmtMoney(balance)}</td>
      </tr>`;
    } else {
      balance -= t.amt;
      html += `<tr>
        <td>${new Date(t.date).toLocaleDateString()}</td>
        <td>${t.ref}</td>
        <td>Payment</td>
        <td style="text-align:right">-</td>
        <td class="credit" style="text-align:right">${fmtMoney(t.amt)}</td>
        <td class="balance" style="text-align:right;background:#f8fafc">${fmtMoney(balance)}</td>
      </tr>`;
    }
  });
  
  document.getElementById('custLedgerTable').innerHTML = html;
}

function closeCustDetail() {
  const modal = document.getElementById('custDetailModal');
  if (modal) modal.remove();
}

// ── Permanently delete a customer and all their data ──────────────────
function deleteCustomer(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;

  const custInvoices = invoices.filter(i => i.customerId === id);
  const custPayments = payments.filter(p => p.customerId === id);
  const bal = getBalance(id);

  // First confirmation
  const msg1 = `⚠️ DELETE CUSTOMER PERMANENTLY?\n\n` +
    `Customer: ${c.name}\n` +
    `Phone: ${c.phone}\n` +
    `Invoices: ${custInvoices.length}\n` +
    `Payments: ${custPayments.length}\n` +
    `Current Balance: ${fmtMoney(bal)}\n\n` +
    `This will PERMANENTLY delete:\n` +
    `• The customer record\n` +
    `• All ${custInvoices.length} invoice(s)\n` +
    `• All ${custPayments.length} payment(s)\n\n` +
    `This CANNOT be undone! Are you sure?`;

  if (!confirm(msg1)) return;

  // Second confirmation — type the name to confirm
  const typed = prompt(`⛔ FINAL WARNING!\n\nTo confirm permanent deletion, type the customer name exactly:\n\n"${c.name}"`);
  if (typed === null) return; // cancelled
  if (typed.trim() !== c.name.trim()) {
    showAppToast('❌ Name did not match. Deletion cancelled.', 'error');
    return;
  }

  // Delete the customer, their invoices, and their payments
  customers = customers.filter(x => x.id !== id);
  invoices  = invoices.filter(i => i.customerId !== id);
  payments  = payments.filter(p => p.customerId !== id);

  saveData();
  renderCust();
  updateDashboard();

  // Close the detail modal if it's open for this customer
  const modal = document.getElementById('custDetailModal');
  if (modal) modal.remove();

  showAppToast(`🗑️ Customer "${c.name}" and all their data deleted permanently.`, 'error');
}

function switchCustTab(tab) {
  document.querySelectorAll('#custDetailModal .tabBtn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#custDetailModal .tabContent').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('custTab-' + tab).classList.add('active');
}

// ── Delete a received payment ─────────────────────────────────────────
function deletePayment(payId, custId) {
  const p = payments.find(x => x.id === payId);
  if (!p) return;
  const c = customers.find(x => x.id === custId);
  if (!confirm(`⚠️ Delete this payment?\n\nCustomer: ${p.customerName || (c ? c.name : '')}\nAmount: ${fmtMoney(p.amount)}\nDate: ${new Date(p.date).toLocaleDateString()}\n\nThis will add the amount back to the customer balance.`)) return;

  payments = payments.filter(x => x.id !== payId);
  saveData();

  // Remove row from table without full reload for speed
  const row = document.getElementById('payrow_' + payId);
  if (row) {
    row.style.transition = 'opacity .3s';
    row.style.opacity = '0';
    setTimeout(() => {
      row.remove();
      // Refresh balance shown in modal header
      const balEl = document.querySelector('#custDetailModal [style*="font-size:28px"]');
      if (balEl) {
        const newBal = getBalance(custId);
        balEl.innerText = fmtMoney(newBal);
        balEl.style.color = newBal > 0 ? '#ca8a04' : '#16a34a';
      }
    }, 300);
  }

  renderCust();
  updateDashboard();
  showAppToast(`🗑️ Payment of ${fmtMoney(p.amount)} deleted. Balance updated.`, 'error');
}

// ── Reprint receipt for any past payment ─────────────────────────────
function reprintPaymentReceipt(payId) {
  const p = payments.find(x => x.id === payId);
  if (!p) { showAppToast('❌ Payment record not found', 'error'); return; }
  const c = customers.find(x => x.id === p.customerId);

  // Recalculate balBefore from history (sum of all payments before this one)
  const allPays = payments
    .filter(x => x.customerId === p.customerId && new Date(x.created) < new Date(p.created))
    .reduce((s, x) => s + x.amount, 0);
  const allSales = invoices
    .filter(i => i.customerId === p.customerId && i.paymentType === 'credit')
    .reduce((s, i) => s + i.total, 0);
  const opening = (c ? c.opening : 0) || 0;
  const balBefore = opening + allSales - allPays;
  const balAfter  = balBefore - p.amount;

  printPaymentReceipt({
    receiptNo:     p.receiptNo || ('RCP-' + p.id.slice(-6)),
    customerName:  p.customerName  || (c ? c.name  : 'Unknown'),
    customerPhone: p.customerPhone || (c ? c.phone : ''),
    customerAddr:  p.customerAddr  || (c ? c.address || '' : ''),
    amount:        p.amount,
    date:          p.date,
    method:        p.method || 'Cash',
    note:          p.note   || '',
    balBefore,
    balAfter,
    createdAt:     p.created || new Date().toISOString()
  });
}

// ── Remove duplicate payments for a customer ─────────────────────────
function cleanDuplicatePayments(custId) {
  const custPayments = payments.filter(p => p.customerId === custId);
  if (custPayments.length === 0) {
    showAppToast('✅ No payments found for this customer', 'success');
    return;
  }

  // Find duplicates: same amount + same date + within 5 minutes of each other
  const seen = [];
  const toRemove = [];

  custPayments
    .sort((a, b) => new Date(a.created) - new Date(b.created))
    .forEach(p => {
      const isDup = seen.find(s =>
        s.amount === p.amount &&
        s.date   === p.date   &&
        Math.abs(new Date(s.created) - new Date(p.created)) < 5 * 60 * 1000
      );
      if (isDup) {
        toRemove.push(p.id);
      } else {
        seen.push(p);
      }
    });

  if (toRemove.length === 0) {
    showAppToast('✅ No duplicate payments found — all records are clean!', 'success');
    return;
  }

  if (!confirm(`⚠️ Found ${toRemove.length} duplicate payment(s) for this customer.\n\nThese appear to be the same payment recorded more than once.\n\nClick OK to remove the duplicates and fix the balance.`)) return;

  payments = payments.filter(p => !toRemove.includes(p.id));
  saveData();
  renderCust();
  updateDashboard();

  // Refresh the modal
  closeCustDetail();
  setTimeout(() => viewCust(custId), 200);

  showAppToast(`✅ Removed ${toRemove.length} duplicate payment(s). Balance is now correct!`, 'success');
}

function quickPay(custId) {
  selectedCust = custId;
  const c = customers.find(x => x.id === custId);
  if (!c) return;
  document.getElementById('payCustomer').innerHTML = `<option value="${c.id}">${c.name} - ${c.phone}</option>`;
  const bal = getBalance(custId);
  const balEl = document.getElementById('payBalance');
  balEl.value = fmtMoney(bal);
  balEl.style.color = bal <= 0 ? 'var(--success)' : 'var(--warning)';
  document.getElementById('payAmount').value = '';
  document.getElementById('payNote').value = '';
  document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('paymentModal').classList.add('show');
}

function openPaymentModal() {
  const sel = document.getElementById('payCustomer');
  sel.innerHTML = '<option value="">-- Select Customer --</option>';
  customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
    sel.add(new Option(`${c.name} - ${c.phone}`, c.id));
  });
  document.getElementById('payBalance').value = 'Select customer';
  document.getElementById('payAmount').value = '';
  document.getElementById('paymentModal').classList.add('show');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('show');
}

document.getElementById('payCustomer').onchange = function() {
  if (this.value) {
    const bal = getBalance(this.value);
    const balEl = document.getElementById('payBalance');
    balEl.value = fmtMoney(bal);
    balEl.style.color = bal <= 0 ? 'var(--success)' : 'var(--warning)';
  } else {
    document.getElementById('payBalance').value = '';
  }
};

function payFullAmount() {
  const custId = document.getElementById('payCustomer').value;
  if (!custId) { alert('Please select a customer first'); return; }
  const bal = getBalance(custId);
  if (bal <= 0) { alert('This customer has no outstanding balance'); return; }
  document.getElementById('payAmount').value = bal.toFixed(2);
}

function processPayment() {
  // Guard against double-click / double submission
  if (processPayment._running) return;
  processPayment._running = true;
  setTimeout(() => { processPayment._running = false; }, 3000);

  const custId = document.getElementById('payCustomer').value;
  const amount = parseFloat(document.getElementById('payAmount').value) || 0;
  const date   = document.getElementById('payDate').value;
  const method = document.getElementById('payMethod').value;
  const note   = document.getElementById('payNote').value.trim();

  if (!custId) { showPayMsg('❌ Please select a customer first!', 'error'); return; }
  if (amount <= 0) { showPayMsg('❌ Please enter a valid payment amount!', 'error'); return; }
  if (!date) { showPayMsg('❌ Please select a payment date!', 'error'); return; }

  const c = customers.find(x => x.id === custId);
  if (!c) { showPayMsg('❌ Customer not found!', 'error'); return; }

  const balBefore = getBalance(custId);
  if (amount > balBefore + 0.01) {
    if (!confirm(`⚠️ Amount ${fmtMoney(amount)} exceeds outstanding balance of ${fmtMoney(balBefore)}.\n\nContinue anyway?`)) return;
  }

  const payId    = genId('PAY');
  const now      = new Date();
  const receiptNo = 'RCP-' + now.getFullYear().toString().slice(-2) + String(now.getMonth()+1).padStart(2,'0') + '-' + Date.now().toString().slice(-5);

  payments.push({
    id:           payId,
    receiptNo:    receiptNo,
    customerId:   custId,
    customerName: c.name,
    customerPhone: c.phone || '',
    customerAddr: c.address || '',
    amount:       amount,
    date:         date,
    method:       method,
    note:         note,
    balBefore:    balBefore,
    created:      now.toISOString()
  });

  saveData();

  const balAfter = getBalance(custId);

  // Update balance display in modal
  const balEl = document.getElementById('payBalance');
  balEl.value = fmtMoney(balAfter);
  balEl.style.color = balAfter <= 0 ? 'var(--success)' : 'var(--warning)';

  // Refresh UI
  renderCust();
  updateDashboard();
  closePaymentModal();

  // Show success message toast
  showAppToast(`✅ Payment of ${fmtMoney(amount)} received from ${c.name}. Receipt opening...`, 'success');

  // Open print receipt
  setTimeout(() => {
    printPaymentReceipt({
      receiptNo,
      customerName:  c.name,
      customerPhone: c.phone  || '',
      customerAddr:  c.address || '',
      amount,
      date,
      method,
      note,
      balBefore,
      balAfter,
      createdAt: now.toISOString()
    });
  }, 400);
}

// ── In-app toast message ──────────────────────────────────────────────
function showAppToast(msg, type = 'success') {
  let t = document.getElementById('appToastMsg');
  if (!t) {
    t = document.createElement('div');
    t.id = 'appToastMsg';
    t.style.cssText = `
      position:fixed;top:24px;left:50%;transform:translateX(-50%);
      z-index:99999;padding:14px 28px;border-radius:12px;font-size:14px;
      font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,0.2);
      opacity:0;transition:opacity .35s;max-width:90vw;text-align:center;
      display:flex;align-items:center;gap:10px;white-space:nowrap;
    `;
    document.body.appendChild(t);
  }
  t.style.background = type === 'success' ? '#16a34a' : '#dc2626';
  t.style.color = '#fff';
  t.innerText = msg;
  t.style.opacity = '1';
  clearTimeout(t._hide);
  t._hide = setTimeout(() => { t.style.opacity = '0'; }, 4000);
}

function showPayMsg(msg, type) { showAppToast(msg, type); }

// ── Payment Receipt (PDF quality) ────────────────────────────────────
function printPaymentReceipt(p) {
  const compName   = localStorage.getItem('compName')  || 'JN AUTOS';
  const compPhone  = localStorage.getItem('compPhone') || '';
  const compEmail  = localStorage.getItem('compEmail') || '';
  const compAddr   = localStorage.getItem('compAddr')  || '';
  const compWeb    = localStorage.getItem('compWeb')   || '';
  const logo       = companyLogo || null;

  const printedAt  = new Date(p.createdAt).toLocaleString('en-PK', {
    year:'numeric', month:'long', day:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
  const dateFormatted = new Date(p.date).toLocaleDateString('en-PK', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  const balAfterAmt = Math.abs(p.balAfter);
  const isCleared   = p.balAfter <= 0.009;
  const isOverpaid  = p.balAfter < -0.009;
  const balColor    = isCleared ? '#16a34a' : '#dc2626';
  const balText     = isOverpaid
    ? `${fmtMoney(balAfterAmt)} (Advance)`
    : isCleared ? 'PKR 0.00 — FULLY CLEARED ✅'
    : `${fmtMoney(p.balAfter)}`;

  const logoHtml = logo
    ? `<img src="${logo}" style="height:70px;max-width:130px;object-fit:contain;border-radius:8px;background:#fff;padding:4px;border:2px solid rgba(255,255,255,.25)">`
    : `<div style="width:64px;height:64px;background:rgba(255,255,255,.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px">${compName.slice(0,2).toUpperCase()}</div>`;

  const methodIcon = {Cash:'💵', 'Bank Transfer':'🏦', Cheque:'📝', Online:'📱'}[p.method] || '💳';

  const win = window.open('', '_blank', 'width=860,height=1000');
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment Receipt ${p.receiptNo} — ${p.customerName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif}
body{background:#e8ecf0;min-height:100vh;padding:30px 20px}
.page{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.18)}

/* ── HEADER ── */
.header{background:linear-gradient(135deg,#0b5fa5 0%,#074a85 100%);color:#fff;padding:28px 36px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.header-left{display:flex;align-items:center;gap:16px}
.comp-name{font-size:22px;font-weight:900;letter-spacing:.5px}
.comp-info{font-size:12px;opacity:.85;margin-top:3px;line-height:1.7}
.header-right{text-align:right}
.receipt-label{font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:2px;font-weight:700}
.receipt-num{font-size:22px;font-weight:900;letter-spacing:1px;color:#93c5fd;margin-top:4px}
.receipt-date{font-size:11px;opacity:.75;margin-top:4px}

/* ── GREEN BAND ── */
.green-band{background:linear-gradient(90deg,#16a34a,#15803d);color:#fff;padding:12px 36px;display:flex;justify-content:space-between;align-items:center}
.green-band-title{font-size:16px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
.green-band-icon{font-size:24px}

/* ── AMOUNT BOX ── */
.amount-section{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-bottom:3px solid #16a34a;padding:28px 36px;text-align:center}
.amt-label{font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px}
.amt-value{font-size:48px;font-weight:900;color:#15803d;line-height:1;letter-spacing:-1px}
.amt-words{font-size:13px;color:#166534;margin-top:8px;font-style:italic;opacity:.8}

/* ── BODY ── */
.body{padding:28px 36px}
.section-title{font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #f1f5f9}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.info-cell{padding:13px 16px;border-bottom:1px solid #f1f5f9}
.info-cell:nth-last-child(-n+2){border-bottom:none}
.info-cell:nth-child(odd){border-right:1px solid #f1f5f9;background:#fafbfc}
.info-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:4px}
.info-value{font-size:14px;font-weight:700;color:#0f172a}

/* ── BALANCE TABLE ── */
.bal-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px}
.bal-table th{background:#f8fafc;padding:11px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;color:#64748b;text-align:left}
.bal-table td{padding:13px 16px;border-top:1px solid #f1f5f9;font-size:14px;font-weight:600}
.bal-table tr:last-child td{background:#f0fdf4;font-weight:800;font-size:15px}

/* ── STAMP ── */
.stamp-wrap{text-align:center;margin:20px 0}
.stamp{display:inline-block;border:4px solid #16a34a;border-radius:12px;padding:8px 32px;color:#16a34a;font-weight:900;font-size:20px;letter-spacing:4px;transform:rotate(-3deg);opacity:.9;box-shadow:inset 0 0 0 2px rgba(22,163,74,.15)}

/* ── FOOTER ── */
.footer{background:#f8fafc;border-top:2px dashed #e2e8f0;padding:20px 36px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.footer-note{font-size:12px;color:#64748b;line-height:1.7}
.footer-comp{text-align:right;font-size:12px;color:#64748b}
.footer-comp strong{display:block;color:#0b5fa5;font-size:13px;font-weight:800}
.sig-line{border-top:1.5px solid #cbd5e1;padding-top:6px;margin-top:18px;font-size:11px;color:#94a3b8;text-align:center;letter-spacing:.5px}

/* ── PRINT BUTTON ── */
.print-bar{background:#1e293b;padding:16px 36px;display:flex;gap:12px;justify-content:center}
.print-bar button{border:none;border-radius:8px;padding:11px 28px;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s}
.print-bar button:hover{opacity:.85}
.btn-print{background:#0b5fa5;color:#fff}
.btn-pdf{background:#16a34a;color:#fff}
.btn-close{background:#475569;color:#fff}

@media print{
  body{background:#fff;padding:0}
  .print-bar{display:none}
  .page{box-shadow:none;border-radius:0;max-width:100%}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}
@page{size:A4;margin:15mm}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div>
        <div class="comp-name">${compName}</div>
        <div class="comp-info">
          ${compAddr ? compAddr + '<br>' : ''}
          ${compPhone ? '📞 ' + compPhone : ''}
          ${compEmail ? ' &nbsp;•&nbsp; ✉️ ' + compEmail : ''}
          ${compWeb   ? '<br>🌐 ' + compWeb : ''}
        </div>
      </div>
    </div>
    <div class="header-right">
      <div class="receipt-label">Payment Receipt</div>
      <div class="receipt-num">${p.receiptNo}</div>
      <div class="receipt-date">${printedAt}</div>
    </div>
  </div>

  <!-- GREEN BAND -->
  <div class="green-band">
    <div class="green-band-title">💰 Payment Received</div>
    <div class="green-band-icon">✅</div>
  </div>

  <!-- AMOUNT -->
  <div class="amount-section">
    <div class="amt-label">Total Amount Received</div>
    <div class="amt-value">${fmtMoney(p.amount)}</div>
    <div class="amt-words">${methodIcon} Paid via ${p.method} on ${dateFormatted}</div>
  </div>

  <div class="body">

    <!-- CUSTOMER INFO -->
    <div class="section-title">Customer Information</div>
    <div class="info-grid">
      <div class="info-cell">
        <div class="info-label">Customer Name</div>
        <div class="info-value">${p.customerName}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Phone Number</div>
        <div class="info-value">${p.customerPhone || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Payment Date</div>
        <div class="info-value">${dateFormatted}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Payment Method</div>
        <div class="info-value">${methodIcon} ${p.method}</div>
      </div>
      ${p.note ? `
      <div class="info-cell" style="grid-column:1/-1">
        <div class="info-label">Note / Reference</div>
        <div class="info-value">${p.note}</div>
      </div>` : ''}
    </div>

    <!-- BALANCE SUMMARY -->
    <div class="section-title">Account Balance Summary</div>
    <table class="bal-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Amount (PKR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Outstanding Balance (Before Payment)</td>
          <td style="text-align:right;color:#dc2626;font-weight:700">${fmtMoney(p.balBefore)}</td>
        </tr>
        <tr>
          <td style="color:#16a34a">Amount Received ✅</td>
          <td style="text-align:right;color:#16a34a;font-weight:700">− ${fmtMoney(p.amount)}</td>
        </tr>
        <tr>
          <td style="font-weight:800">Remaining Balance (After Payment)</td>
          <td style="text-align:right;color:${balColor};font-weight:900">${balText}</td>
        </tr>
      </tbody>
    </table>

    <!-- STAMP -->
    <div class="stamp-wrap">
      <div class="stamp">RECEIVED</div>
    </div>

    <!-- SIGNATURE -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;padding-top:16px;border-top:1px dashed #e2e8f0">
      <div style="text-align:center">
        <div style="border-top:1.5px solid #cbd5e1;padding-top:8px;margin-top:40px;font-size:11px;color:#94a3b8">Customer Signature</div>
      </div>
      <div style="text-align:center">
        <div style="border-top:1.5px solid #cbd5e1;padding-top:8px;margin-top:40px;font-size:11px;color:#94a3b8">Authorized By — ${compName}</div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-note">
      <strong style="color:#0f172a">Thank you for your payment! 🙏</strong><br>
      This is a computer-generated receipt and is valid without signature.<br>
      Receipt No: <strong>${p.receiptNo}</strong> &nbsp;|&nbsp; Generated: ${printedAt}
    </div>
    <div class="footer-comp">
      <strong>${compName}</strong>
      ${compPhone ? compPhone : ''}
      ${compEmail ? '<br>' + compEmail : ''}
    </div>
  </div>

  <!-- PRINT BUTTONS -->
  <div class="print-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
    <button class="btn-pdf" onclick="window.print()">📄 Save as PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { try { win.print(); } catch(e) {} }, 800);
}

// PRODUCT FUNCTIONS
function addProduct() {
  const name = document.getElementById('newProdName').value.trim();
  const sku = document.getElementById('newProdSku').value.trim();
  const cost = parseFloat(document.getElementById('newProdCost').value) || 0;
  const price = parseFloat(document.getElementById('newProdPrice').value) || 0;
  const qty = parseInt(document.getElementById('newProdQty').value) || 0;
  const cat = document.getElementById('newProdCat').value;
  const min = parseInt(document.getElementById('newProdMin').value) || 5;
  
  if (!name || !sku) {
    alert('Product Name and SKU are required');
    return;
  }
  
  if (cost <= 0 || price <= 0) {
    alert('Please enter valid cost and selling prices');
    return;
  }
  
  const exist = products.find(p => p.sku === sku);
  if (exist) {
    if(!confirm('SKU exists. Update existing product?')) return;
    exist.name = name;
    exist.cost = cost;
    exist.price = price;
    exist.qty += qty;
    exist.category = cat;
    exist.minStock = min;
  } else {
    products.push({
      id: genId('PROD'),
      name: name,
      sku: sku,
      cost: cost,
      price: price,
      qty: qty,
      category: cat,
      minStock: min,
      created: new Date().toISOString()
    });
  }
  
  saveData();
  document.getElementById('newProdName').value = '';
  document.getElementById('newProdSku').value = '';
  document.getElementById('newProdCost').value = '';
  document.getElementById('newProdPrice').value = '';
  document.getElementById('newProdQty').value = '';
  
  renderProd();
  alert('Product saved successfully!');
}

function renderProd() {
  const search = document.getElementById('searchProd').value.toLowerCase();
  const tb = document.getElementById('prodTable');
  tb.innerHTML = '';
  
  const threshold = parseInt(localStorage.getItem('threshold') || 5);
  
  products.filter(p => 
    p.name.toLowerCase().includes(search) || 
    p.sku.toLowerCase().includes(search) ||
    (p.category && p.category.toLowerCase().includes(search))
  ).forEach(p => {
    const isLow = p.qty <= (p.minStock || threshold);
    const profit = p.price - p.cost;
    const margin = ((profit / p.price) * 100).toFixed(1);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight:700">${p.name}</div>
        <small style="color:#64748b">${p.category || 'General'}</small>
      </td>
      <td><code class="skuCode">${p.sku}</code></td>
      <td>
        <span class="badge ${isLow ? 'badgeDanger' : 'badgeSuccess'}" style="font-size:13px">
          ${p.qty} units
        </span>
      </td>
      <td>
        <div style="font-weight:700">${fmtMoney(p.price)}</div>
        <small style="color:#64748b">Cost: ${fmtMoney(p.cost)} | Margin: ${margin}%</small>
      </td>
      <td class="noPrint" style="white-space:nowrap">
        <button class="iconBtn" onclick="editProd('${p.id}')" title="Edit Product" style="background:#dbeafe;color:#1e40af">✏️</button>
        <button class="iconBtn danger" onclick="delProd('${p.id}')" title="Delete">🗑️</button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

function delProd(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  const inInvoices = invoices.some(i => i.items.some(it => it.productId === id));
  if (inInvoices) {
    alert('Cannot delete: Product exists in sales history');
    return;
  }
  products = products.filter(p => p.id !== id);
  saveData();
  renderProd();
}

function editProd(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editProdId').value = id;
  document.getElementById('editProdName').value = p.name;
  document.getElementById('editProdSku').value = p.sku;
  document.getElementById('editProdCat').value = p.category || 'General';
  document.getElementById('editProdQty').value = p.qty;
  document.getElementById('editProdCost').value = p.cost;
  document.getElementById('editProdPrice').value = p.price;
  updateEditProdMargin();
  document.getElementById('editProdModal').classList.add('show');
}

function updateEditProdMargin() {
  const cost = parseFloat(document.getElementById('editProdCost').value) || 0;
  const price = parseFloat(document.getElementById('editProdPrice').value) || 0;
  const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : '0.0';
  const profit = price - cost;
  document.getElementById('editProdMargin').innerText = `Profit: ${fmtMoney(profit)} | Margin: ${margin}%`;
  document.getElementById('editProdMargin').style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
}

function closeEditProdModal() {
  document.getElementById('editProdModal').classList.remove('show');
}

function saveEditProd() {
  const id = document.getElementById('editProdId').value;
  const p = products.find(x => x.id === id);
  if (!p) return;

  const name = document.getElementById('editProdName').value.trim();
  const sku = document.getElementById('editProdSku').value.trim();
  const cat = document.getElementById('editProdCat').value;
  const qty = parseFloat(document.getElementById('editProdQty').value) || 0;
  const cost = parseFloat(document.getElementById('editProdCost').value) || 0;
  const price = parseFloat(document.getElementById('editProdPrice').value) || 0;

  if (!name) { alert('Product name cannot be empty'); return; }
  if (!sku) { alert('SKU cannot be empty'); return; }
  if (price < cost) {
    if (!confirm('Selling price is less than cost price. Save anyway?')) return;
  }

  // Check SKU uniqueness (excluding current product)
  const skuExists = products.some(x => x.id !== id && x.sku.toLowerCase() === sku.toLowerCase());
  if (skuExists) { alert('SKU already used by another product'); return; }

  p.name = name;
  p.sku = sku;
  p.category = cat;
  p.qty = qty;
  p.cost = cost;
  p.price = price;

  saveData();
  closeEditProdModal();
  renderProd();
  updateDashboard();
}

function adjustStock() {
  const sku = prompt('Enter Product SKU to adjust:');
  if (!sku) return;
  const prod = products.find(p => p.sku === sku);
  if (!prod) {
    alert('Product not found');
    return;
  }
  const newQty = prompt(`Current stock: ${prod.qty}\nEnter new quantity:`, prod.qty);
  if (newQty === null) return;
  const qty = parseInt(newQty);
  if (isNaN(qty) || qty < 0) {
    alert('Invalid quantity');
    return;
  }
  prod.qty = qty;
  saveData();
  renderProd();
  alert('Stock updated successfully');
}

// PART SEARCH FUNCTIONS (NEW)
function initPartSearch() {
  // Populate customer filter
  const custSel = document.getElementById('partSearchCustomer');
  custSel.innerHTML = '<option value="">All Customers</option>';
  customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
    custSel.add(new Option(c.name, c.id));
  });
  
  renderPartSearch();
}

function renderPartSearch() {
  const search = document.getElementById('searchPartInput').value.toLowerCase();
  const filter = document.getElementById('partSearchFilter').value;
  const custFilter = document.getElementById('partSearchCustomer').value;
  
  if (!search) {
    document.getElementById('partSearchResults').style.display = 'none';
    document.getElementById('partSearchEmpty').style.display = 'block';
    return;
  }
  
  // Find matching product
  const prod = products.find(p => 
    p.name.toLowerCase().includes(search) || 
    p.sku.toLowerCase().includes(search)
  );
  
  if (!prod) {
    document.getElementById('partSearchResults').style.display = 'none';
    document.getElementById('partSearchEmpty').style.display = 'block';
    document.getElementById('partSearchEmpty').innerHTML = `
      <div style="font-size:48px;margin-bottom:15px">❌</div>
      <div style="font-size:18px;font-weight:600">Part not found</div>
      <div style="font-size:14px;margin-top:10px">No product matching "${search}"</div>
    `;
    return;
  }
  
  document.getElementById('partSearchResults').style.display = 'block';
  document.getElementById('partSearchEmpty').style.display = 'none';
  
  // Update product details
  document.getElementById('partDetailName').innerText = prod.name;
  document.getElementById('partDetailSku').innerText = prod.sku;
  document.getElementById('partDetailCost').innerText = fmtMoney(prod.cost);
  document.getElementById('partDetailPrice').innerText = fmtMoney(prod.price);
  document.getElementById('partDetailStock').innerText = prod.qty;
  
  // Calculate date range
  const now = new Date();
  let start = new Date('2000-01-01');
  if (filter === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (filter === 'year') start = new Date(now.getFullYear(), 0, 1);
  
  // Get sales history for this product
  let salesHistory = [];
  let totalSold = 0;
  
  invoices.filter(inv => invDateGte(inv.date, start)).forEach(inv => {
    inv.items.forEach(item => {
      if (item.productId === prod.id || item.sku === prod.sku) {
        if (!custFilter || inv.customerId === custFilter) {
          salesHistory.push({
            date: inv.date,
            time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString() : '',
            invoice: inv.number,
            customer: inv.customerName,
            customerId: inv.customerId,
            qty: item.qty,
            price: item.price,
            total: item.total,
            profit: (item.price - (item.cost || prod.cost)) * item.qty
          });
          totalSold += item.qty;
        }
      }
    });
  });
  
  document.getElementById('partDetailTotalSold').innerText = totalSold;
  
  // Render sales history table
  const tb = document.getElementById('partSalesHistoryTable');
  if (salesHistory.length === 0) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">No sales found for this period</td></tr>';
  } else {
    // Sort by date descending
    salesHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tb.innerHTML = salesHistory.map(sale => `
      <tr>
        <td>
          <div style="font-weight:600">${new Date(sale.date).toLocaleDateString()}</div>
          <small style="color:#64748b">${sale.time}</small>
        </td>
        <td><strong style="color:var(--primary)">${sale.invoice}</strong></td>
        <td>${sale.customer}</td>
        <td style="text-align:center;font-weight:700">${sale.qty}</td>
        <td style="text-align:right">${fmtMoney(sale.price)}</td>
        <td style="text-align:right;font-weight:700">${fmtMoney(sale.total)}</td>
        <td style="text-align:right;color:var(--success);font-weight:700">${fmtMoney(sale.profit)}</td>
      </tr>
    `).join('');
  }
}

function exportPartSearch() {
  const search = document.getElementById('searchPartInput').value;
  const prod = products.find(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );
  
  if (!prod) {
    alert('Please search for a part first');
    return;
  }
  
  let csv = 'Date,Time,Invoice,Customer,Quantity,Unit Price,Total,Profit\n';
  
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      if (item.productId === prod.id || item.sku === prod.sku) {
        const profit = (item.price - (item.cost || prod.cost)) * item.qty;
        const time = inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString() : '';
        csv += `${inv.date},${time},${inv.number},"${inv.customerName}",${item.qty},${item.price},${item.total},${profit}\n`;
      }
    });
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Part_History_${prod.sku}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// STOCK LIST FUNCTIONS (NEW)
function initStockList() {
  // Populate product selector for movements
  const sel = document.getElementById('stockMovementProduct');
  sel.innerHTML = '<option value="">-- Select Product --</option>';
  products.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
    sel.add(new Option(`${p.name} (${p.sku})`, p.id));
  });
  
  renderStockList();
  renderStockMovements();
}

function renderStockList() {
  const search = document.getElementById('searchStockInput').value.toLowerCase();
  const catFilter = document.getElementById('stockCategoryFilter').value;
  const statusFilter = document.getElementById('stockStatusFilter').value;
  const threshold = parseInt(localStorage.getItem('threshold') || 5);
  
  const tb = document.getElementById('stockListTable');
  tb.innerHTML = '';
  
  let filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || 
                       p.sku.toLowerCase().includes(search);
    const matchCat = !catFilter || p.category === catFilter;
    let matchStatus = true;
    if (statusFilter === 'in') matchStatus = p.qty > threshold;
    if (statusFilter === 'low') matchStatus = p.qty > 0 && p.qty <= threshold;
    if (statusFilter === 'out') matchStatus = p.qty === 0;
    return matchSearch && matchCat && matchStatus;
  });
  
  // Sort by name
  filtered.sort((a, b) => a.name.localeCompare(b.name));
  
  let totalValue = 0;
  let lowCount = 0;
  let outCount = 0;
  
  filtered.forEach(p => {
    const stockValue = p.qty * p.cost;
    totalValue += stockValue;
    if (p.qty === 0) outCount++;
    else if (p.qty <= threshold) lowCount++;
    
    const isLow = p.qty <= threshold && p.qty > 0;
    const isOut = p.qty === 0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight:700">${p.name}</div>
        <small style="color:#64748b">${p.category || 'General'}</small>
      </td>
      <td><code class="skuCode">${p.sku}</code></td>
      <td>${p.category || 'General'}</td>
      <td style="text-align:center">
        <span class="badge ${isOut ? 'badgeDanger' : isLow ? 'badgeWarning' : 'badgeSuccess'}" style="font-size:14px;padding:8px 16px">
          ${p.qty}
        </span>
      </td>
      <td style="text-align:right">${fmtMoney(p.cost)}</td>
      <td style="text-align:right">${fmtMoney(p.price)}</td>
      <td style="text-align:right;font-weight:700">${fmtMoney(stockValue)}</td>
      <td class="noPrint">
        <button class="iconBtn" onclick="viewStockDetail('${p.id}')" title="View Details">👁️</button>
        <button class="iconBtn success" onclick="printStockCard('${p.id}')" title="Print Stock Card">🖨️</button>
      </td>
    `;
    tb.appendChild(tr);
  });
  
  // Update summary cards
  document.getElementById('stockTotalProducts').innerText = filtered.length;
  document.getElementById('stockTotalValue').innerText = fmtMoney(totalValue);
  document.getElementById('stockLowCount').innerText = lowCount;
  document.getElementById('stockOutCount').innerText = outCount;
}

function renderStockMovements() {
  const prodId = document.getElementById('stockMovementProduct').value;
  const from = document.getElementById('stockMoveFrom').value;
  const to = document.getElementById('stockMoveTo').value;
  
  const tb = document.getElementById('stockMovementTable');
  tb.innerHTML = '';
  
  if (!prodId) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#64748b">Select a product to view movements</td></tr>';
    return;
  }
  
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  
  // Collect all movements
  let movements = [];
  
  // Add purchases
  purchases.filter(p => p.productId === prodId && p.date >= from && p.date <= to).forEach(p => {
    movements.push({
      date: p.date,
      type: 'Purchase',
      reference: p.reference || p.id.substr(-6),
      qty: p.qty,
      price: p.cost,
      details: `From: ${p.supplier || 'Unknown'}`
    });
  });
  
  // Add sales
  invoices.filter(inv => inv.date >= from && inv.date <= to).forEach(inv => {
    inv.items.forEach(item => {
      if (item.productId === prodId) {
        movements.push({
          date: inv.date,
          type: 'Sale',
          reference: inv.number,
          qty: -item.qty,
          price: item.price,
          details: `To: ${inv.customerName}`
        });
      }
    });
  });
  
  // Add returns (positive - stock back)
  returns.filter(r => {
    const retProd = products.find(p => p.sku === r.sku);
    return retProd && retProd.id === prodId && r.date >= from && r.date <= to;
  }).forEach(r => {
    movements.push({
      date: r.date,
      type: 'Return',
      reference: r.invoiceNo,
      qty: r.qty,
      price: r.amount / r.qty,
      details: `Reason: ${r.reason}`
    });
  });
  
  // Sort by date descending
  movements.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (movements.length === 0) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#64748b">No movements found for selected period</td></tr>';
    return;
  }
  
  let runningStock = prod.qty;
  
  movements.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(m.date).toLocaleDateString()}</td>
      <td>
        <span class="badge ${m.type === 'Purchase' ? 'badgeSuccess' : m.type === 'Sale' ? 'badgeInfo' : 'badgeWarning'}">
          ${m.type}
        </span>
      </td>
      <td><strong>${m.reference}</strong></td>
      <td style="text-align:center;font-weight:700;color:${m.qty > 0 ? 'var(--success)' : 'var(--danger)'}">
        ${m.qty > 0 ? '+' : ''}${m.qty}
      </td>
      <td style="text-align:right">${fmtMoney(m.price)}</td>
      <td>${m.details}</td>
    `;
    tb.appendChild(tr);
  });
}

function openPurchaseModal() {
  const sel = document.getElementById('purchaseProduct');
  sel.innerHTML = '<option value="">-- Select Product --</option>';
  products.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
    sel.add(new Option(`${p.name} (${p.sku})`, p.id));
  });
  document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('purchaseModal').classList.add('show');
}

function closePurchaseModal() {
  document.getElementById('purchaseModal').classList.remove('show');
}

function savePurchase() {
  const prodId = document.getElementById('purchaseProduct').value;
  const qty = parseInt(document.getElementById('purchaseQty').value) || 0;
  const cost = parseFloat(document.getElementById('purchaseCost').value) || 0;
  const date = document.getElementById('purchaseDate').value;
  const supplier = document.getElementById('purchaseSupplier').value.trim();
  const ref = document.getElementById('purchaseRef').value.trim();
  const notes = document.getElementById('purchaseNotes').value.trim();
  
  if (!prodId || qty <= 0 || cost <= 0) {
    alert('Please fill all required fields');
    return;
  }
  
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  
  // Add purchase record
  purchases.push({
    id: genId('PUR'),
    productId: prodId,
    productName: prod.name,
    sku: prod.sku,
    qty: qty,
    cost: cost,
    total: qty * cost,
    date: date,
    supplier: supplier,
    reference: ref,
    notes: notes,
    createdAt: new Date().toISOString()
  });
  
  // Update stock
  prod.qty += qty;
  // Optionally update cost price (average)
  const totalCost = (prod.qty * prod.cost) + (qty * cost);
  prod.cost = totalCost / (prod.qty + qty);
  
  saveData();
  closePurchaseModal();
  renderStockList();
  
  // Clear form
  document.getElementById('purchaseProduct').value = '';
  document.getElementById('purchaseQty').value = '';
  document.getElementById('purchaseCost').value = '';
  document.getElementById('purchaseSupplier').value = '';
  document.getElementById('purchaseRef').value = '';
  document.getElementById('purchaseNotes').value = '';
  
  alert(`Purchase recorded: ${qty} units of ${prod.name} added to stock`);
}

function viewStockDetail(prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  
  // Calculate totals
  const totalPurchased = purchases
    .filter(p => p.productId === prodId)
    .reduce((sum, p) => sum + p.qty, 0);
  
  const totalSold = invoices
    .reduce((sum, inv) => {
      const items = inv.items.filter(i => i.productId === prodId);
      return sum + items.reduce((s, i) => s + i.qty, 0);
    }, 0);
  
  const totalReturned = returns
    .filter(r => {
      const p = products.find(x => x.sku === r.sku);
      return p && p.id === prodId;
    })
    .reduce((sum, r) => sum + r.qty, 0);
  
  const modalHtml = `
    <div class="modal show" id="stockDetailModal">
      <div class="modalContent" style="max-width:800px">
        <div class="modalHeader">
          <h3>📦 Stock Detail: ${prod.name}</h3>
          <button class="closeBtn" onclick="closeStockDetail()">×</button>
        </div>
        <div class="modalBody">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:25px">
            <div style="background:#f0f9ff;padding:20px;border-radius:10px;text-align:center">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Current Stock</div>
              <div style="font-size:32px;font-weight:800;color:var(--primary)">${prod.qty}</div>
            </div>
            <div style="background:#f0fdf4;padding:20px;border-radius:10px;text-align:center">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Cost Price</div>
              <div style="font-size:24px;font-weight:800;color:var(--success)">${fmtMoney(prod.cost)}</div>
            </div>
            <div style="background:#fef3c7;padding:20px;border-radius:10px;text-align:center">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Selling Price</div>
              <div style="font-size:24px;font-weight:800;color:var(--warning)">${fmtMoney(prod.price)}</div>
            </div>
          </div>
          
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:25px">
            <div style="text-align:center;padding:15px;background:#f8fafc;border-radius:8px">
              <div style="font-size:12px;color:#64748b">Total Purchased</div>
              <div style="font-size:20px;font-weight:700;color:var(--success)">${totalPurchased}</div>
            </div>
            <div style="text-align:center;padding:15px;background:#f8fafc;border-radius:8px">
              <div style="font-size:12px;color:#64748b">Total Sold</div>
              <div style="font-size:20px;font-weight:700;color:var(--info)">${totalSold}</div>
            </div>
            <div style="text-align:center;padding:15px;background:#f8fafc;border-radius:8px">
              <div style="font-size:12px;color:#64748b">Total Returned</div>
              <div style="font-size:20px;font-weight:700;color:var(--purple)">${totalReturned}</div>
            </div>
          </div>
          
          <h4 style="margin-bottom:15px">Recent Purchases</h4>
          <div style="overflow-x:auto;max-height:200px;margin-bottom:20px">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${purchases.filter(p => p.productId === prodId).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(p => `
                  <tr>
                    <td>${new Date(p.date).toLocaleDateString()}</td>
                    <td>${p.supplier || '-'}</td>
                    <td>${p.qty}</td>
                    <td>${fmtMoney(p.cost)}</td>
                    <td>${p.reference || '-'}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5" style="text-align:center;color:#64748b">No purchases</td></tr>'}
              </tbody>
            </table>
          </div>
          
          <h4 style="margin-bottom:15px">Recent Sales</h4>
          <div style="overflow-x:auto;max-height:200px">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.filter(inv => inv.items.some(i => i.productId === prodId)).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(inv => {
                  const item = inv.items.find(i => i.productId === prodId);
                  return `
                    <tr>
                      <td>${new Date(inv.date).toLocaleDateString()}</td>
                      <td>${inv.number}</td>
                      <td>${inv.customerName}</td>
                      <td>${item.qty}</td>
                      <td>${fmtMoney(item.price)}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="5" style="text-align:center;color:#64748b">No sales</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existing = document.getElementById('stockDetailModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeStockDetail() {
  const modal = document.getElementById('stockDetailModal');
  if (modal) modal.remove();
}

// ──────────────────────────────────────────────────────────
// SHARE STOCK WITH CUSTOMER FUNCTIONS
// ──────────────────────────────────────────────────────────

// Working copy of rows that can be edited/deleted in the modal
let shareStockRows = [];

function openShareStockModal() {
  // Clone all products into shareStockRows
  const threshold = parseInt(localStorage.getItem('threshold') || 5);
  shareStockRows = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category || 'General',
    qty: p.qty,
    cost: p.cost,
    price: p.price,
    value: p.qty * p.cost
  }));
  shareStockRows.sort((a, b) => a.name.localeCompare(b.name));

  // Set default title
  const compName = localStorage.getItem('compName') || 'JN AUTOS';
  document.getElementById('shareListTitle').value = `${compName} — Stock List (${new Date().toLocaleDateString()})`;
  document.getElementById('shareListNote').value = 'Prices are subject to change. Contact us for bulk rates.';

  buildShareEditTable();
  document.getElementById('shareStockModal').classList.add('show');
}

function closeShareStockModal() {
  document.getElementById('shareStockModal').classList.remove('show');
}

function getShareCols() {
  return {
    sku:      document.getElementById('shareColSku').checked,
    category: document.getElementById('shareColCategory').checked,
    qty:      document.getElementById('shareColQty').checked,
    cost:     document.getElementById('shareColCost').checked,
    price:    document.getElementById('shareColPrice').checked,
    value:    document.getElementById('shareColValue').checked
  };
}

function buildShareEditTable() {
  const cols = getShareCols();

  // Build header
  const hRow = document.getElementById('shareEditHeaderRow');
  hRow.innerHTML = '';
  const headers = ['#', 'Product Name'];
  if (cols.sku)      headers.push('SKU');
  if (cols.category) headers.push('Category');
  if (cols.qty)      headers.push('Qty');
  if (cols.cost)     headers.push('Cost Price');
  if (cols.price)    headers.push('Selling Price');
  if (cols.value)    headers.push('Stock Value');
  headers.push(''); // delete column
  headers.forEach(h => {
    const th = document.createElement('th');
    th.innerText = h;
    th.style.cssText = 'background:#fef9c3;color:#78350f;font-size:11px;padding:8px 10px;white-space:nowrap';
    hRow.appendChild(th);
  });

  // Build body
  const tbody = document.getElementById('shareEditBody');
  tbody.innerHTML = '';

  shareStockRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.id = `shareRow_${idx}`;

    // Row number
    const tdNum = document.createElement('td');
    tdNum.innerText = idx + 1;
    tdNum.style.cssText = 'color:#94a3b8;padding:7px 10px;min-width:30px';
    tr.appendChild(tdNum);

    // Editable cells helper
    function editCell(value, key, type = 'text', align = 'left') {
      const td = document.createElement('td');
      td.style.cssText = `padding:5px 8px;min-width:90px;text-align:${align}`;
      const inp = document.createElement('input');
      inp.type = type;
      inp.value = value;
      inp.style.cssText = 'width:100%;border:1px solid #e2e8f0;border-radius:5px;padding:5px 7px;font-size:12px;background:#fff';
      inp.addEventListener('change', () => {
        if (type === 'number') {
          shareStockRows[idx][key] = parseFloat(inp.value) || 0;
          // recalc value
          shareStockRows[idx].value = shareStockRows[idx].qty * shareStockRows[idx].cost;
        } else {
          shareStockRows[idx][key] = inp.value;
        }
      });
      inp.addEventListener('focus', () => inp.style.borderColor = 'var(--primary)');
      inp.addEventListener('blur',  () => inp.style.borderColor = '#e2e8f0');
      td.appendChild(inp);
      return td;
    }

    tr.appendChild(editCell(row.name, 'name', 'text'));
    if (cols.sku)      tr.appendChild(editCell(row.sku, 'sku', 'text'));
    if (cols.category) tr.appendChild(editCell(row.category, 'category', 'text'));
    if (cols.qty)      tr.appendChild(editCell(row.qty, 'qty', 'number', 'right'));
    if (cols.cost)     tr.appendChild(editCell(row.cost, 'cost', 'number', 'right'));
    if (cols.price)    tr.appendChild(editCell(row.price, 'price', 'number', 'right'));
    if (cols.value)    {
      // Value is computed; show as read-only
      const tdV = document.createElement('td');
      tdV.style.cssText = 'padding:5px 8px;text-align:right;font-weight:700;color:var(--primary);white-space:nowrap;font-size:12px';
      tdV.id = `shareVal_${idx}`;
      tdV.innerText = fmtMoney(row.value);
      tr.appendChild(tdV);
    }

    // Delete button
    const tdDel = document.createElement('td');
    tdDel.style.cssText = 'padding:4px 8px;text-align:center';
    const btn = document.createElement('button');
    btn.innerHTML = '🗑️';
    btn.title = 'Remove from shared list';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:15px;opacity:.7';
    btn.addEventListener('click', () => {
      shareStockRows.splice(idx, 1);
      buildShareEditTable();
    });
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });

  if (shareStockRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:30px;color:#64748b">No items in list. Close and reopen to reset.</td></tr>';
  }
}

// Rebuild table whenever checkboxes change
function onShareColChange() { buildShareEditTable(); }

function previewShareStock() {
  const cols = getShareCols();
  const title = document.getElementById('shareListTitle').value || 'Stock List';
  const note  = document.getElementById('shareListNote').value || '';
  const compName  = localStorage.getItem('compName')  || 'JN AUTOS';
  const compPhone = localStorage.getItem('compPhone') || '';
  const compAddr  = localStorage.getItem('compAddr')  || '';
  const logo      = companyLogo || null;

  // Build header columns
  const thCols = ['#','Product Name'];
  if (cols.sku)      thCols.push('SKU');
  if (cols.category) thCols.push('Category');
  if (cols.qty)      thCols.push('Qty');
  if (cols.cost)     thCols.push('Cost Price (PKR)');
  if (cols.price)    thCols.push('Selling Price (PKR)');
  if (cols.value)    thCols.push('Stock Value (PKR)');

  const rows = shareStockRows.map((r, i) => {
    let cells = `<td style="padding:9px 10px;font-weight:600">${i+1}</td>
                 <td style="padding:9px 10px;font-weight:700">${r.name}</td>`;
    if (cols.sku)      cells += `<td style="padding:9px 10px"><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px">${r.sku}</code></td>`;
    if (cols.category) cells += `<td style="padding:9px 10px">${r.category}</td>`;
    if (cols.qty)      cells += `<td style="padding:9px 10px;text-align:right;font-weight:700;color:${r.qty===0?'#dc2626':r.qty<=5?'#f59e0b':'#16a34a'}">${r.qty}</td>`;
    if (cols.cost)     cells += `<td style="padding:9px 10px;text-align:right">${fmtMoney(r.cost)}</td>`;
    if (cols.price)    cells += `<td style="padding:9px 10px;text-align:right;font-weight:700;color:#0b5fa5">${fmtMoney(r.price)}</td>`;
    if (cols.value)    cells += `<td style="padding:9px 10px;text-align:right;font-weight:700">${fmtMoney(r.value)}</td>`;
    return `<tr style="border-bottom:1px solid #f1f5f9">${cells}</tr>`;
  }).join('');

  const logoHtml = logo
    ? `<img src="${logo}" style="width:60px;height:60px;object-fit:contain;border-radius:8px;border:2px solid rgba(255,255,255,.3);padding:3px;background:#fff">`
    : `<div style="width:60px;height:60px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;flex-shrink:0">JN</div>`;

  const totalItems = shareStockRows.length;
  const totalQty   = shareStockRows.reduce((s,r)=>s+r.qty,0);
  const totalVal   = shareStockRows.reduce((s,r)=>s+r.value,0);
  const totalPrice = shareStockRows.reduce((s,r)=>s+r.price,0);

  const win = window.open('', '_blank', 'width=860,height:1050');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
body{background:#fff;color:#0f172a;font-size:13px;line-height:1.5}
.header{background:linear-gradient(135deg,#0b5fa5,#074a85);color:#fff;padding:22px 30px;display:flex;justify-content:space-between;align-items:center}
.header-left{display:flex;align-items:center;gap:14px}
.comp-name{font-size:20px;font-weight:800}
.comp-sub{font-size:11px;opacity:.85;margin-top:2px}
.header-right{text-align:right}
.header-right h2{font-size:20px;font-weight:900;letter-spacing:1px}
.header-right p{font-size:11px;opacity:.8;margin-top:3px}
.title-bar{background:#1e293b;color:#fff;padding:12px 30px;display:flex;justify-content:space-between;align-items:center}
.title-bar h3{font-size:16px;font-weight:700;letter-spacing:.5px}
.title-bar span{font-size:12px;opacity:.7}
.summary{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:2px solid #e2e8f0}
.sum-box{padding:14px 20px;border-right:1px solid #e2e8f0;text-align:center}
.sum-box:last-child{border-right:none}
.sum-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;color:#64748b}
.sum-val{font-size:18px;font-weight:900;margin-top:3px;color:#0b5fa5}
.wrap{padding:0 30px 30px}
table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12.5px}
thead tr{background:#1e293b;color:#fff}
th{padding:10px 10px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;text-align:left}
td{padding:9px 10px;border-bottom:1px solid #f1f5f9}
tbody tr:nth-child(even) td{background:#f8fafc}
.footer{margin-top:20px;padding:15px 30px;border-top:2px solid #0b5fa5;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b}
.note-box{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 18px;margin:20px 30px 0;border-radius:0 6px 6px 0;font-size:12px;color:#78350f;font-weight:600}
@media print{
  .no-print{display:none}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    ${logoHtml}
    <div>
      <div class="comp-name">${compName}</div>
      <div class="comp-sub">${compAddr}</div>
      ${compPhone ? `<div class="comp-sub">📞 ${compPhone}</div>` : ''}
    </div>
  </div>
  <div class="header-right">
    <h2>STOCK LIST</h2>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
</div>

<div class="title-bar">
  <h3>📦 ${title}</h3>
  <span>${totalItems} Products</span>
</div>

<div class="summary">
  <div class="sum-box">
    <div class="sum-label">Total Products</div>
    <div class="sum-val">${totalItems}</div>
  </div>
  <div class="sum-box">
    <div class="sum-label">Total Qty Available</div>
    <div class="sum-val">${totalQty}</div>
  </div>
  <div class="sum-box">
    <div class="sum-label">Total Stock Value</div>
    <div class="sum-val">${fmtMoney(cols.value ? totalVal : totalPrice * totalItems / Math.max(totalItems,1))}</div>
  </div>
</div>

${note ? `<div class="note-box">📝 ${note}</div>` : ''}

<div class="wrap">
<table>
<thead>
<tr>${thCols.map(h=>`<th>${h}</th>`).join('')}</tr>
</thead>
<tbody>${rows}</tbody>
</table>
</div>

<div class="footer">
  <span>${compName} | ${compPhone}</span>
  <span style="font-size:12px;color:#64748b">${note}</span>
  <span>Page 1</span>
</div>

<div class="no-print" style="text-align:center;padding:20px">
  <button onclick="window.print()" style="background:#0b5fa5;color:#fff;border:none;padding:12px 30px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">🖨️ Print / Save as PDF</button>
</div>
</body></html>`);
  win.document.close();
}

function exportShareStockCSV() {
  const cols = getShareCols();
  const title = document.getElementById('shareListTitle').value || 'Stock List';

  let headers = ['#','Product Name'];
  if (cols.sku)      headers.push('SKU');
  if (cols.category) headers.push('Category');
  if (cols.qty)      headers.push('Qty');
  if (cols.cost)     headers.push('Cost Price');
  if (cols.price)    headers.push('Selling Price');
  if (cols.value)    headers.push('Stock Value');

  let csv = headers.join(',') + '\n';
  shareStockRows.forEach((r, i) => {
    let row = [i+1, `"${r.name}"`];
    if (cols.sku)      row.push(`"${r.sku}"`);
    if (cols.category) row.push(`"${r.category}"`);
    if (cols.qty)      row.push(r.qty);
    if (cols.cost)     row.push(r.cost.toFixed(2));
    if (cols.price)    row.push(r.price.toFixed(2));
    if (cols.value)    row.push(r.value.toFixed(2));
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Stock_List_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printStockList() {
  const compName = localStorage.getItem('compName') || 'JN AUTOS';
  const compPhone = localStorage.getItem('compPhone') || '';
  const compAddr = localStorage.getItem('compAddr') || '';
  const _logo = companyLogo || null;
  const threshold = parseInt(localStorage.getItem('threshold') || 5);

  const stockData = products.map(p => {
    const value = p.qty * p.cost;
    const isOut = p.qty === 0;
    const isLow = p.qty > 0 && p.qty <= threshold;
    const qtyColor = isOut ? '#dc2626' : isLow ? '#f59e0b' : '#16a34a';
    return `<tr>
      <td style="font-weight:600">${p.name}</td>
      <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px">${p.sku}</code></td>
      <td>${p.category || 'General'}</td>
      <td style="text-align:center;font-weight:700;color:${qtyColor}">${p.qty}</td>
      <td style="text-align:right">${fmtMoney(p.cost)}</td>
      <td style="text-align:right">${fmtMoney(p.price)}</td>
      <td style="text-align:right;font-weight:700">${fmtMoney(value)}</td>
    </tr>`;
  }).join('');

  const totalValue = products.reduce((s,p) => s + p.qty * p.cost, 0);
  const totalItems = products.length;
  const outOfStock = products.filter(p => p.qty === 0).length;
  const lowStock = products.filter(p => p.qty > 0 && p.qty <= threshold).length;

  const printWindow = window.open('', '_blank', 'width=820,height=1000');
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stock List - ${compName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
    body{background:#fff;color:#0f172a;font-size:13px;line-height:1.5}
    .header{background:linear-gradient(135deg,#0b5fa5,#074a85);color:#fff;padding:22px 30px;display:flex;justify-content:space-between;align-items:center}
    .header-left{display:flex;align-items:center;gap:14px}
    .logo-img{width:56px;height:56px;object-fit:contain;border-radius:8px;border:2px solid rgba(255,255,255,0.3);padding:3px;background:#fff}
    .logo-box{width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0}
    .comp-name{font-size:20px;font-weight:800}
    .comp-sub{font-size:11px;opacity:.85;margin-top:2px}
    .header-right{text-align:right}
    .header-right h2{font-size:20px;font-weight:900;letter-spacing:2px}
    .header-right p{font-size:11px;opacity:.8;margin-top:3px}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:2px solid #e2e8f0}
    .sum-box{padding:14px 20px;border-right:1px solid #e2e8f0;text-align:center}
    .sum-box:last-child{border-right:none}
    .sum-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;color:#64748b}
    .sum-val{font-size:18px;font-weight:900;margin-top:3px}
    .wrap{padding:0 30px 30px}
    table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12.5px}
    thead tr{background:#1e293b;color:#fff}
    th{padding:10px 10px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;text-align:left}
    td{padding:9px 10px;border-bottom:1px solid #f1f5f9}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .total-row{display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:2px solid #0b5fa5}
    .total-label{font-size:15px;font-weight:700;color:#0f172a;margin-right:20px}
    .total-val{font-size:18px;font-weight:900;color:#0b5fa5}
    .footer{margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#64748b}
    @page{size:A4 portrait;margin:8mm}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0}
      .header{background:linear-gradient(135deg,#0b5fa5,#074a85)!important;color:#fff!important}
      thead tr{background:#1e293b!important;color:#fff!important}
      tbody tr:nth-child(even) td{background:#f8fafc!important}
      table{page-break-inside:auto}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${_logo ? `<img src="${_logo}" class="logo-img" alt="Logo">` : `<div class="logo-box">${compName.substring(0,2).toUpperCase()}</div>`}
      <div>
        <div class="comp-name">${compName}</div>
        <div class="comp-sub">${compAddr ? compAddr+' &nbsp;|&nbsp; ' : ''}${compPhone ? '📞 '+compPhone : ''}</div>
      </div>
    </div>
    <div class="header-right">
      <h2>STOCK LIST</h2>
      <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    </div>
  </div>
  <div class="summary">
    <div class="sum-box"><div class="sum-label">Total Products</div><div class="sum-val" style="color:#0b5fa5">${totalItems}</div></div>
    <div class="sum-box"><div class="sum-label">Total Stock Value</div><div class="sum-val" style="color:#16a34a">${fmtMoney(totalValue)}</div></div>
    <div class="sum-box"><div class="sum-label">Low Stock</div><div class="sum-val" style="color:#f59e0b">${lowStock}</div></div>
    <div class="sum-box"><div class="sum-label">Out of Stock</div><div class="sum-val" style="color:#dc2626">${outOfStock}</div></div>
  </div>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>Product</th><th>SKU</th><th>Category</th>
          <th style="text-align:center">Stock</th>
          <th style="text-align:right">Cost Price</th>
          <th style="text-align:right">Sell Price</th>
          <th style="text-align:right">Stock Value</th>
        </tr>
      </thead>
      <tbody>${stockData}</tbody>
    </table>
    <div class="total-row">
      <span class="total-label">Total Stock Value:</span>
      <span class="total-val">${fmtMoney(totalValue)}</span>
    </div>
    <div class="footer">
      <span>${compName} &nbsp;|&nbsp; Stock Inventory Report</span>
      <span>This is a computer-generated report. No signature required.</span>
    </div>
  </div>
  <script>window.onload=function(){window.print();window.close();}<\/script>
</body>
</html>`);
  printWindow.document.close();
}

function printStockCard(prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  const compName = localStorage.getItem('compName') || 'JN AUTOS';
  const compPhone = localStorage.getItem('compPhone') || '';
  const compAddr = localStorage.getItem('compAddr') || '';
  const _logo = companyLogo || null;
  const threshold = parseInt(localStorage.getItem('threshold') || 5);
  const isOut = prod.qty === 0;
  const isLow = prod.qty > 0 && prod.qty <= threshold;
  const stockColor = isOut ? '#dc2626' : isLow ? '#f59e0b' : '#16a34a';
  const stockLabel = isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

  // Get movement history for this product
  const soldHistory = invoices.flatMap(inv =>
    inv.items.filter(it => it.productId === prod.id || it.sku === prod.sku)
      .map(it => ({date: inv.date, type:'Sale', ref: inv.number, qty: -it.qty, cust: inv.customerName}))
  ).sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,15);

  const histRows = soldHistory.length ? soldHistory.map(h => `
    <tr>
      <td>${new Date(h.date).toLocaleDateString()}</td>
      <td>${h.ref}</td>
      <td>${h.cust || '-'}</td>
      <td style="text-align:center;color:#dc2626;font-weight:700">${h.qty}</td>
    </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:20px">No sales history found</td></tr>`;

  const printWindow = window.open('', '_blank', 'width=820,height=1000');
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stock Card - ${prod.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
    body{background:#fff;color:#0f172a;font-size:13px;line-height:1.5}
    .header{background:linear-gradient(135deg,#0b5fa5,#074a85);color:#fff;padding:22px 30px;display:flex;justify-content:space-between;align-items:center}
    .header-left{display:flex;align-items:center;gap:14px}
    .logo-img{width:56px;height:56px;object-fit:contain;border-radius:8px;border:2px solid rgba(255,255,255,0.3);padding:3px;background:#fff}
    .logo-box{width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0}
    .comp-name{font-size:20px;font-weight:800}
    .comp-sub{font-size:11px;opacity:.85;margin-top:2px}
    .header-right{text-align:right}
    .header-right h2{font-size:20px;font-weight:900;letter-spacing:2px}
    .header-right p{font-size:11px;opacity:.8;margin-top:3px}
    .wrap{padding:25px 30px}
    .prod-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #0b5fa5}
    .prod-name{font-size:22px;font-weight:900;color:#0b5fa5}
    .prod-sku{font-size:13px;color:#64748b;margin-top:3px}
    .stock-badge{padding:6px 16px;border-radius:8px;font-weight:900;font-size:14px;background:${isOut?'#fee2e2':isLow?'#fef3c7':'#dcfce7'};color:${stockColor}}
    .info{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:25px}
    .info-box{background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0}
    .info-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#64748b;font-weight:700}
    .info-val{font-size:18px;font-weight:900;margin-top:4px;color:#0f172a}
    .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#0b5fa5;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
    table{width:100%;border-collapse:collapse;font-size:12.5px}
    thead tr{background:#1e293b;color:#fff}
    th{padding:9px 10px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;text-align:left}
    td{padding:9px 10px;border-bottom:1px solid #f1f5f9}
    tbody tr:nth-child(even) td{background:#f8fafc}
    .footer{margin-top:25px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#64748b}
    @page{size:A4 portrait;margin:8mm}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0}
      .header{background:linear-gradient(135deg,#0b5fa5,#074a85)!important;color:#fff!important}
      .info-box{background:#f8fafc!important}
      thead tr{background:#1e293b!important;color:#fff!important}
      tbody tr:nth-child(even) td{background:#f8fafc!important}
      table{page-break-inside:auto}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${_logo ? `<img src="${_logo}" class="logo-img" alt="Logo">` : `<div class="logo-box">${compName.substring(0,2).toUpperCase()}</div>`}
      <div>
        <div class="comp-name">${compName}</div>
        <div class="comp-sub">${compAddr ? compAddr+' &nbsp;|&nbsp; ' : ''}${compPhone ? '📞 '+compPhone : ''}</div>
      </div>
    </div>
    <div class="header-right">
      <h2>STOCK CARD</h2>
      <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    </div>
  </div>
  <div class="wrap">
    <div class="prod-title">
      <div>
        <div class="prod-name">${prod.name}</div>
        <div class="prod-sku">SKU: ${prod.sku} &nbsp;|&nbsp; Category: ${prod.category || 'General'}</div>
      </div>
      <div class="stock-badge">${stockLabel}</div>
    </div>
    <div class="info">
      <div class="info-box"><div class="info-label">Current Stock</div><div class="info-val" style="color:${stockColor}">${prod.qty} units</div></div>
      <div class="info-box"><div class="info-label">Cost Price</div><div class="info-val">${fmtMoney(prod.cost)}</div></div>
      <div class="info-box"><div class="info-label">Selling Price</div><div class="info-val">${fmtMoney(prod.price)}</div></div>
      <div class="info-box"><div class="info-label">Stock Value</div><div class="info-val" style="color:#0b5fa5">${fmtMoney(prod.qty * prod.cost)}</div></div>
      <div class="info-box"><div class="info-label">Profit Margin</div><div class="info-val" style="color:#16a34a">${prod.price > 0 ? (((prod.price-prod.cost)/prod.price)*100).toFixed(1)+'%' : 'N/A'}</div></div>
      <div class="info-box"><div class="info-label">Min. Stock Level</div><div class="info-val">${prod.minStock || threshold} units</div></div>
    </div>
    <div class="section-title">Recent Sales History (Last 15)</div>
    <table>
      <thead><tr><th>Date</th><th>Invoice #</th><th>Customer</th><th style="text-align:center">Qty Sold</th></tr></thead>
      <tbody>${histRows}</tbody>
    </table>
    <div class="footer">
      <span>${compName} &nbsp;|&nbsp; Stock Card: ${prod.name}</span>
      <span>Computer-generated report. No signature required.</span>
    </div>
  </div>
  <script>window.onload=function(){window.print();window.close();}<\/script>
</body>
</html>`);
  printWindow.document.close();
}

function exportStockList() {
  let csv = 'Product,SKU,Category,Stock,Cost Price,Selling Price,Stock Value\n';
  
  products.forEach(p => {
    const value = p.qty * p.cost;
    csv += `"${p.name}","${p.sku}","${p.category || 'General'}",${p.qty},${p.cost},${p.price},${value}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Stock_List_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ITEM SALES HISTORY FUNCTIONS
function renderItemSales() {
  const filter = document.getElementById('itemSalesFilter').value;
  const search = document.getElementById('searchItemSales').value.toLowerCase();
  const now = new Date();
  let start = new Date('2000-01-01');
  
  if (filter === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (filter === 'year') start = new Date(now.getFullYear(), 0, 1);
  
  // Get all items sold in date range
  const itemSales = {};
  let totalQty = 0;
  let totalRevenue = 0;
  
  invoices.filter(inv => invDateGte(inv.date, start)).forEach(inv => {
    inv.items.forEach(item => {
      if (!itemSales[item.productId]) {
        itemSales[item.productId] = {
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          totalQty: 0,
          totalRevenue: 0,
          lastPrice: 0,
          lastDate: null,
          sales: []
        };
      }
      
      itemSales[item.productId].totalQty += item.qty;
      itemSales[item.productId].totalRevenue += item.total;
      itemSales[item.productId].lastPrice = item.price;
      itemSales[item.productId].sales.push({
        date: inv.date,
        invoice: inv.number,
        customer: inv.customerName,
        qty: item.qty,
        price: item.price,
        total: item.total
      });
      
      if (!itemSales[item.productId].lastDate || inv.date > itemSales[item.productId].lastDate) {
        itemSales[item.productId].lastDate = inv.date;
      }
      
      totalQty += item.qty;
      totalRevenue += item.total;
    });
  });
  
  // Update summary cards
  document.getElementById('totalItemsSold').innerText = totalQty.toLocaleString();
  document.getElementById('totalItemRevenue').innerText = fmtMoney(totalRevenue);
  document.getElementById('uniqueProductsSold').innerText = Object.keys(itemSales).length.toLocaleString();
  document.getElementById('avgSalePrice').innerText = totalQty > 0 ? fmtMoney(totalRevenue / totalQty) : 'PKR 0.00';
  
  // Render table
  const tb = document.getElementById('itemSalesTable');
  tb.innerHTML = '';
  
  const sortedItems = Object.values(itemSales)
    .filter(item => 
      item.name.toLowerCase().includes(search) || 
      item.sku.toLowerCase().includes(search)
    )
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  if (sortedItems.length === 0) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">No sales data found for selected period</td></tr>';
    return;
  }
  
  sortedItems.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight:700">${item.name}</div>
        <small style="color:#64748b">${item.sku}</small>
      </td>
      <td><code class="skuCode">${item.sku}</code></td>
      <td style="text-align:center">
        <span style="font-size:20px;font-weight:800;color:var(--info)">${item.totalQty}</span>
        <small style="display:block;color:#64748b">units</small>
      </td>
      <td style="text-align:right">
        <div style="font-weight:700;color:var(--success)">${fmtMoney(item.lastPrice)}</div>
      </td>
      <td style="text-align:right">
        <div style="font-weight:800;color:var(--primary);font-size:18px">${fmtMoney(item.totalRevenue)}</div>
      </td>
      <td>
        <div style="font-weight:600">${item.lastDate ? new Date(item.lastDate).toLocaleDateString() : 'N/A'}</div>
        <small style="color:#64748b">${item.lastDate ? new Date(item.lastDate).toLocaleTimeString() : ''}</small>
      </td>
      <td class="noPrint">
        <button class="iconBtn purple" onclick="viewItemDetail('${item.productId}')" title="View Details">📊</button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

function viewItemDetail(productId) {
  // Reconstruct item data from invoices
  const itemData = {
    productId: productId,
    name: '',
    sku: '',
    sales: []
  };
  
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      if (item.productId === productId) {
        if (!itemData.name) {
          itemData.name = item.name;
          itemData.sku = item.sku;
        }
        itemData.sales.push({
          date: inv.date,
          invoice: inv.number,
          customer: inv.customerName,
          qty: item.qty,
          price: item.price,
          total: item.total
        });
      }
    });
  });
  
  itemData.sales.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const totalQty = itemData.sales.reduce((sum, s) => sum + s.qty, 0);
  const totalRevenue = itemData.sales.reduce((sum, s) => sum + s.total, 0);
  const avgPrice = totalQty > 0 ? totalRevenue / totalQty : 0;
  
  document.getElementById('itemSalesDetailTitle').innerText = `📈 ${itemData.name} - Sales History`;
  
  const html = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px">
      <div style="background:#f0f9ff;padding:20px;border-radius:12px;text-align:center;border:2px solid #bae6fd">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Total Sales</div>
        <div style="font-size:24px;font-weight:800;color:var(--primary)">${totalQty} units</div>
      </div>
      <div style="background:#f0fdf4;padding:20px;border-radius:12px;text-align:center;border:2px solid #bbf7d0">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Revenue</div>
        <div style="font-size:24px;font-weight:800;color:var(--success)">${fmtMoney(totalRevenue)}</div>
      </div>
      <div style="background:#fef3c7;padding:20px;border-radius:12px;text-align:center;border:2px solid #fde68a">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Avg Price</div>
        <div style="font-size:24px;font-weight:800;color:var(--warning)">${fmtMoney(avgPrice)}</div>
      </div>
      <div style="background:#f3e8ff;padding:20px;border-radius:12px;text-align:center;border:2px solid #e9d5ff">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Transactions</div>
        <div style="font-size:24px;font-weight:800;color:var(--purple)">${itemData.sales.length}</div>
      </div>
    </div>
    
    <h4 style="margin-bottom:15px">📋 Transaction History</h4>
    <div style="max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
      <table>
        <thead style="position:sticky;top:0;z-index:10;background:#f8fafc">
          <tr>
            <th>Date</th>
            <th>Invoice #</th>
            <th>Customer</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemData.sales.map(sale => `
            <tr>
              <td>${new Date(sale.date).toLocaleDateString()}<br><small style="color:#64748b">${new Date(sale.date).toLocaleTimeString()}</small></td>
              <td><strong style="color:var(--primary)">${sale.invoice}</strong></td>
              <td>${sale.customer}</td>
              <td style="text-align:center;font-weight:700">${sale.qty}</td>
              <td style="text-align:right">${fmtMoney(sale.price)}</td>
              <td style="text-align:right;font-weight:700;color:var(--success)">${fmtMoney(sale.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  document.getElementById('itemSalesDetailBody').innerHTML = html;
  document.getElementById('itemSalesDetailModal').classList.add('show');
}

function closeItemSalesDetail() {
  document.getElementById('itemSalesDetailModal').classList.remove('show');
}

function exportItemSales() {
  const filter = document.getElementById('itemSalesFilter').value;
  const now = new Date();
  let start = new Date('2000-01-01');
  
  if (filter === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (filter === 'year') start = new Date(now.getFullYear(), 0, 1);
  
  let csv = 'Product,SKU,Total Qty Sold,Last Sale Price,Total Revenue,Last Sale Date\n';
  
  const itemSales = {};
  invoices.filter(inv => invDateGte(inv.date, start)).forEach(inv => {
    inv.items.forEach(item => {
      if (!itemSales[item.productId]) {
        itemSales[item.productId] = {
          name: item.name,
          sku: item.sku,
          totalQty: 0,
          totalRevenue: 0,
          lastPrice: 0,
          lastDate: null
        };
      }
      itemSales[item.productId].totalQty += item.qty;
      itemSales[item.productId].totalRevenue += item.total;
      itemSales[item.productId].lastPrice = item.price;
      if (!itemSales[item.productId].lastDate || inv.date > itemSales[item.productId].lastDate) {
        itemSales[item.productId].lastDate = inv.date;
      }
    });
  });
  
  Object.values(itemSales).forEach(item => {
    csv += `"${item.name}","${item.sku}",${item.totalQty},${item.lastPrice},${item.totalRevenue},${item.lastDate}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Item_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// SALES
function renderSales() {
  const filter = document.getElementById('filterSales').value;
  const now = new Date();
  let start = new Date('2000-01-01');
  
  if (filter === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (filter === 'year') start = new Date(now.getFullYear(), 0, 1);
  
  const filtered = invoices.filter(i => invDateGte(i.date, start));
  
  document.getElementById('repTotal').innerText = fmtMoney(filtered.reduce((a, i) => a + i.total, 0));
  document.getElementById('repCash').innerText = fmtMoney(filtered.filter(i => i.paymentType === 'cash').reduce((a, i) => a + i.total, 0));
  document.getElementById('repCredit').innerText = fmtMoney(filtered.filter(i => i.paymentType === 'credit').reduce((a, i) => a + i.total, 0));
  document.getElementById('repProfit').innerText = fmtMoney(filtered.reduce((a, i) => a + (i.profit || 0), 0));
  
  document.getElementById('salesTable').innerHTML = filtered.map(inv => `
    <tr>
      <td>${new Date(inv.date).toLocaleDateString()}</td>
      <td><strong>${inv.number}</strong></td>
      <td>${inv.customerName}</td>
      <td>${inv.items.length} items</td>
      <td><span class="${inv.paymentType === 'credit' ? 'creditBadge' : 'paidBadge'}">${inv.paymentType.toUpperCase()}</span></td>
      <td style="font-weight:700">${fmtMoney(inv.total)}</td>
      <td style="color:var(--success);font-weight:700">${fmtMoney(inv.profit || 0)}</td>
      <td class="noPrint">
        <button class="iconBtn" onclick="viewInvoice('${inv.id}')" title="View">👁️</button>
      </td>
    </tr>
  `).join('');
}

function viewInvoice(invId) {
  const inv = invoices.find(i => i.id === invId);
  if (!inv) return;
  
  const html = `
    <div style="background:#f8fafc;padding:20px;border-radius:10px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;margin-bottom:15px">
        <div>
          <div style="font-size:12px;color:#64748b">Invoice Number</div>
          <div style="font-size:20px;font-weight:800">${inv.number}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:#64748b">Total Amount</div>
          <div style="font-size:24px;font-weight:800;color:var(--primary)">${fmtMoney(inv.total)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:14px">
        <div><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString()}</div>
        <div><strong>Customer:</strong> ${inv.customerName}</div>
        <div><strong>Type:</strong> <span class="${inv.paymentType === 'credit' ? 'creditBadge' : 'paidBadge'}">${inv.paymentType.toUpperCase()}</span></div>
        <div><strong>Profit:</strong> <span style="color:var(--success);font-weight:700">${fmtMoney(inv.profit || 0)}</span></div>
      </div>
    </div>
    <h4>Items Sold</h4>
    <table style="margin-bottom:20px">
      <thead>
        <tr>
          <th>Product</th>
          <th>SKU</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${inv.items.map(i => `
          <tr>
            <td>${i.name}</td>
            <td>${i.sku}</td>
            <td>${i.qty}</td>
            <td>${fmtMoney(i.price)}</td>
            <td>${fmtMoney(i.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${inv.notes ? `<div style="background:#fef3c7;padding:15px;border-radius:8px;margin-top:15px"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
    <div class="btnGroup" style="margin-top:20px">
      <button class="btn btnSecondary" onclick="printInvoiceFromModal('${inv.id}')">🖨️ Print</button>
      <button class="btn btnDanger" onclick="deleteInvoice('${inv.id}')">🗑️ Delete</button>
    </div>
  `;
  
  document.getElementById('viewInvBody').innerHTML = html;
  document.getElementById('viewInvModal').classList.add('show');
}

function closeInvModal() {
  document.getElementById('viewInvModal').classList.remove('show');
}

function printInvoiceFromModal(invId) {
  const inv = invoices.find(i => i.id === invId);
  if (!inv) return;
  
  // Set up print data without saving
  currentInv.items = inv.items;
  currentInv.subtotal = inv.subtotal;
  currentInv.tax = inv.tax;
  currentInv.discount = inv.discount || 0;
  currentInv.prevBalance = inv.prevBalance || 0;
  currentInv.total = inv.total;
  
  document.getElementById('invNo').value = inv.number;
  document.getElementById('invDate').value = inv.date;
  document.getElementById('invCustomer').value = inv.customerId || '';
  document.getElementById('invType').value = inv.paymentType;
  document.getElementById('invNotes').value = inv.notes || '';
  
  preparePrintInvoice();
  // Override time with the saved invoice time if available
  if (inv.invoiceTime) {
    document.getElementById('printTime').innerText = inv.invoiceTime;
  }
  document.getElementById('invoicePrintArea').classList.remove('hidden');
  
  // Pass logo explicitly so it appears in print
  const html = document.getElementById('printableInvoice').innerHTML;
  printInvoiceFromHTML(html, companyLogo);
}

function deleteInvoice(invId) {
  if (!confirm('WARNING: This will restore stock and reverse payments. Continue?')) return;
  
  const idx = invoices.findIndex(i => i.id === invId);
  if (idx === -1) return;
  const inv = invoices[idx];
  
  // Restore stock
  inv.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) prod.qty += item.qty;
  });
  
  // Remove related payments
  payments = payments.filter(p => !(p.note && p.note.includes(inv.number)));
  
  invoices.splice(idx, 1);
  saveData();
  closeInvModal();
  renderSales();
  updateDashboard();
  alert('Invoice deleted and stock restored');
}

function exportSales() {
  let csv = 'Date,Invoice,Customer,Type,Total,Profit\n';
  invoices.forEach(i => {
    csv += `${i.date},${i.number},"${i.customerName}",${i.paymentType},${i.total},${i.profit || 0}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// RETURNS
function initReturns() {
  const sel = document.getElementById('retInvoiceSel');
  sel.innerHTML = '<option value="">-- Select Invoice --</option>';
  invoices.forEach(i => {
    sel.add(new Option(`${i.number} - ${i.customerName} (${new Date(i.date).toLocaleDateString()})`, i.id));
  });
}

function showRetItems() {
  const id = document.getElementById('retInvoiceSel').value;
  const inv = invoices.find(i => i.id === id);
  const div = document.getElementById('retItemsList');
  div.innerHTML = '';
  
  if (!inv) {
    document.getElementById('retBtn').style.display = 'none';
    document.getElementById('retReasonBox').style.display = 'none';
    return;
  }
  
  div.innerHTML = `<div style="margin-bottom:15px;padding:15px;background:var(--bg);border-radius:8px;color:var(--text)">
    <strong>Invoice:</strong> ${inv.number}<br>
    <strong>Date:</strong> ${new Date(inv.date).toLocaleDateString()}<br>
    <strong>Customer:</strong> ${inv.customerName}
  </div>`;
  
  inv.items.forEach((item, idx) => {
    const d = document.createElement('div');
    d.className = 'formRow';
    d.style.cssText = 'padding:15px;background:var(--card);border:2px solid var(--border);border-radius:10px;margin-bottom:10px;align-items:center';
    d.innerHTML = `
      <div style="flex:2">
        <div style="font-weight:700;color:var(--text)">${item.name}</div>
        <small style="color:#94a3b8">SKU: ${item.sku}</small>
      </div>
      <div style="font-weight:600;color:var(--text)">Sold: ${item.qty}</div>
      <div style="width:120px">
        <input type="number" class="formControl ret-qty" data-idx="${idx}" data-max="${item.qty}" min="0" max="${item.qty}" placeholder="Qty" style="width:100%">
      </div>
    `;
    div.appendChild(d);
  });
  
  document.getElementById('retBtn').style.display = 'block';
  document.getElementById('retPrintBtn').style.display = 'none';
  document.getElementById('retActionBtns').style.display = 'flex';
  document.getElementById('retReasonBox').style.display = 'block';
}

function processRet() {
  const invId = document.getElementById('retInvoiceSel').value;
  const inv = invoices.find(i => i.id === invId);
  if (!inv) return;
  
  const reason = document.getElementById('retReason').value;
  let hasRet = false;
  let totalRet = 0;
  
  document.querySelectorAll('.ret-qty').forEach(inp => {
    const qty = parseInt(inp.value) || 0;
    if (qty > 0) {
      hasRet = true;
      const idx = parseInt(inp.dataset.idx);
      const item = inv.items[idx];
      const amount = item.price * qty;
      totalRet += amount;
      
      const prod = products.find(p => p.id === item.productId || p.sku === item.sku);
      if (prod) prod.qty += qty;
      
      returns.push({
        id: genId('RET'),
        invoiceId: invId,
        invoiceNo: inv.number,
        date: new Date().toISOString(),
        item: item.name,
        sku: item.sku,
        qty: qty,
        amount: amount,
        reason: reason
      });
    }
  });
  
  if (!hasRet) {
    alert('Please enter quantity to return');
    return;
  }
  
  // If credit sale, add payment record for the return
  if (inv.paymentType === 'credit' && inv.customerId && totalRet > 0) {
    payments.push({
      id: genId('PAY'),
      customerId: inv.customerId,
      amount: totalRet,
      date: new Date().toISOString().split('T')[0],
      method: 'Return',
      note: `Return against ${inv.number} - ${reason}`
    });
  }
  
  saveData();

  // Store last return data for printing
  lastReturnData = {
    inv: inv,
    returnedItems: [],
    totalRet: totalRet,
    reason: reason,
    date: new Date()
  };
  document.querySelectorAll('.ret-qty').forEach(inp => {
    const qty = parseInt(inp.value) || 0;
    if (qty > 0) {
      const item = inv.items[parseInt(inp.dataset.idx)];
      lastReturnData.returnedItems.push({ name: item.name, sku: item.sku, qty: qty, price: item.price, amount: item.price * qty });
    }
  });

  // Show print button
  document.getElementById('retPrintBtn').style.display = 'block';

  alert(`Return processed successfully! Refund amount: ${fmtMoney(totalRet)}`);
  updateDashboard();
}

function printReturnSlip() {
  if (!lastReturnData) { alert('No return data to print'); return; }
  const { inv, returnedItems, totalRet, reason, date } = lastReturnData;
  const compName = localStorage.getItem('compName') || 'JN AUTOS';
  const compPhone = localStorage.getItem('compPhone') || '';
  const compAddr = localStorage.getItem('compAddr') || '';
  const retNo = 'RET-' + Date.now().toString(36).toUpperCase();
  const _retLogo = companyLogo || null;

  const itemRows = returnedItems.map((item, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${item.name}</strong><br><small style="color:#64748b">${item.sku}</small></td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">PKR ${item.price.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
      <td style="text-align:right"><strong>PKR ${item.amount.toLocaleString('en-US',{minimumFractionDigits:2})}</strong></td>
    </tr>`).join('');

  const win = window.open('', '_blank', 'width=820,height=1000');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Return Slip - ${retNo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',system-ui,sans-serif}
    body{background:#fff;color:#0f172a;font-size:14px;line-height:1.5}
    .wrap{max-width:210mm;width:100%;margin:10px auto;padding:30px 40px;border:1px solid #e2e8f0;border-radius:12px}
    @page{size:A4 portrait;margin:10mm}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0}
      .wrap{border:none;margin:0;padding:15px 20px;border-radius:0;max-width:100%;width:100%}
      .header{border-bottom:3px solid #dc2626!important}
      .alert-banner{background:#fef2f2!important;border:2px solid #fecaca!important}
      th{background:#fef2f2!important}
      .info-box{background:#f8fafc!important}
      .reason-box{background:#fef3c7!important}
    }
    .comp-name{font-size:22px;font-weight:800;color:#0b5fa5}
    .comp-sub{font-size:12px;color:#64748b;margin-top:2px}
    .slip-title{text-align:right}
    .slip-title h2{font-size:28px;font-weight:900;color:#dc2626;letter-spacing:2px}
    .slip-title p{color:#64748b;font-size:13px;margin-top:4px}
    .alert-banner{background:#fef2f2;border:2px solid #fecaca;border-radius:10px;padding:15px 20px;margin-bottom:25px;display:flex;align-items:center;gap:12px}
    .alert-icon{font-size:28px}
    .alert-text{font-size:15px;font-weight:700;color:#991b1b}
    .alert-sub{font-size:13px;color:#b91c1c;margin-top:2px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px}
    .info-box{background:#f8fafc;padding:18px;border-radius:10px;border:1px solid #e2e8f0}
    .info-box h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin-bottom:10px}
    .info-box p{font-size:14px;margin:4px 0}
    .info-box .big{font-size:17px;font-weight:800;color:#0f172a}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#fef2f2;padding:11px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#991b1b;font-weight:700;text-align:left;border-bottom:2px solid #fecaca}
    td{padding:11px 12px;border-bottom:1px solid #f1f5f9}
    .totals{margin-left:auto;width:300px;margin-top:10px}
    .totals-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
    .totals-row.grand{border-top:3px solid #dc2626;border-bottom:none;padding-top:14px;margin-top:8px;font-size:20px;font-weight:800;color:#dc2626}
    .reason-box{background:#fef3c7;border:2px solid #fde68a;border-radius:10px;padding:15px 20px;margin:20px 0}
    .reason-box strong{color:#92400e}
    .footer{margin-top:40px;padding-top:25px;border-top:2px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px}
    .footer .main{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px}
    .stamp{display:inline-block;border:3px solid #dc2626;border-radius:8px;padding:8px 24px;color:#dc2626;font-weight:900;font-size:18px;letter-spacing:3px;margin:15px 0;transform:rotate(-3deg)}
    @page{size:A4 portrait;margin:10mm}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0}
      .wrap{border:none;margin:0;padding:15px 20px;border-radius:0;max-width:100%;width:100%}
      .header{border-bottom:3px solid #dc2626!important}
      .alert-banner{background:#fef2f2!important;border:2px solid #fecaca!important}
      th{background:#fef2f2!important}
      .info-box{background:#f8fafc!important}
      .reason-box{background:#fef3c7!important}
    }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo-section">
      ${_retLogo ? `<img src="${_retLogo}" class="logo-img" alt="Logo">` : `<div class="logo-box">JN</div>`}
      <div>
        <div class="comp-name">${compName}</div>
        <div class="comp-sub">${compAddr}</div>
        <div class="comp-sub">${compPhone ? '📞 '+compPhone : ''}</div>
      </div>
    </div>
    <div class="slip-title">
      <h2>RETURN SLIP</h2>
      <p>Return #: <strong>${retNo}</strong></p>
      <p>Date: <strong>${date.toLocaleDateString()}</strong></p>
      <p>Time: <strong>${date.toLocaleTimeString()}</strong></p>
    </div>
  </div>

  <div class="alert-banner">
    <div class="alert-icon">🔄</div>
    <div>
      <div class="alert-text">Sales Return Processed</div>
      <div class="alert-sub">Items returned and stock updated successfully</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>Original Invoice</h4>
      <p class="big">${inv.number}</p>
      <p>Date: ${new Date(inv.date).toLocaleDateString()}</p>
      <p>Type: ${inv.paymentType.toUpperCase()}</p>
      <p>Original Total: <strong>PKR ${inv.total.toLocaleString('en-US',{minimumFractionDigits:2})}</strong></p>
    </div>
    <div class="info-box">
      <h4>Customer</h4>
      <p class="big">${inv.customerName}</p>
      ${inv.customerPhone ? '<p>📞 '+inv.customerPhone+'</p>' : ''}
      ${inv.customerAddress ? '<p>📍 '+inv.customerAddress+'</p>' : ''}
    </div>
  </div>

  <h3 style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:5px">Returned Items</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Product</th><th style="text-align:center">Qty Returned</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Refund Amount</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row grand">
      <span>Total Refund:</span>
      <span>PKR ${totalRet.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
    </div>
  </div>

  <div class="reason-box">
    <strong>Return Reason:</strong> ${reason}
  </div>

  <div class="footer">
    <div class="stamp">RETURNED</div>
    <div class="main">Thank you for your understanding</div>
    <p>This is a computer-generated return slip and serves as your official refund document.</p>
    <p style="margin-top:6px">${compName} &nbsp;|&nbsp; ${compPhone} &nbsp;|&nbsp; ${compAddr}</p>
  </div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
  win.document.close();
}

// LEDGER - FIXED VERSION
function initLedger() {
  const sel = document.getElementById('ledCustomer');
  sel.innerHTML = '<option value="">-- Choose Customer --</option>';
  customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
    sel.add(new Option(`${c.name} - ${c.phone}`, c.id));
  });
}

function genLedger() {
  const custId = document.getElementById('ledCustomer').value;
  const from = document.getElementById('ledFrom').value;
  const to = document.getElementById('ledTo').value;
  
  if (!custId) return;
  
  document.getElementById('ledgerCard').classList.remove('hidden');
  const c = customers.find(x => x.id === custId);
  
  // Header info
  document.getElementById('ledgerSubTitle').innerText = `Ledger Period: ${new Date(from).toLocaleDateString()} to ${new Date(to).toLocaleDateString()}`;
  document.getElementById('ledgerInfo').innerHTML = `
    <div>
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Account Holder</div>
      <div style="font-size:18px;font-weight:800">${c.name}</div>
      <div style="font-size:13px;color:#64748b">${c.phone}</div>
    </div>
    <div>
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Address</div>
      <div style="font-size:14px">${c.address || 'N/A'}</div>
    </div>
    <div>
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Opening Balance</div>
      <div style="font-size:18px;font-weight:800">${fmtMoney(c.opening || 0)}</div>
    </div>
  `;
  
  // FIXED: Proper chronological transaction processing
  let balance = c.opening || 0;
  let totalDebit = 0;
  let totalCredit = 0;
  
  // Opening balance row
  let html = `<tr class="ledger-ob-row">
    <td>${from}</td>
    <td>OB</td>
    <td>Opening Balance (as of ${from})</td>
    <td class="debit" style="text-align:right">${balance > 0 ? fmtMoney(balance) : '-'}</td>
    <td class="credit" style="text-align:right">${balance < 0 ? fmtMoney(Math.abs(balance)) : '-'}</td>
    <td class="balance" style="text-align:right;font-size:15px">${fmtMoney(balance)}</td>
  </tr>`;
  
  // Get ALL transactions in date range
  const invs = invoices.filter(i => i.customerId === custId && i.date >= from && i.date <= to);
  const pays = payments.filter(p => p.customerId === custId && p.date >= from && p.date <= to);
  
  // Combine and sort by date (oldest first for running balance)
  let trans = [];
  invs.forEach(i => trans.push({
    date: i.date,
    time: i.createdAt || i.date,
    type: 'sale',
    amt: i.total,
    ref: i.number,
    desc: `Invoice #${i.number} - ${i.items.length} items`
  }));
  pays.forEach(p => trans.push({
    date: p.date,
    time: p.created || p.date,
    type: 'pay',
    amt: p.amount,
    ref: p.id.substr(-6).toUpperCase(),
    desc: `Payment via ${p.method || 'Cash'}${p.note ? ' - ' + p.note : ''}`
  }));
  
  // Sort by date, then by time (oldest first)
  trans.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return new Date(a.time) - new Date(b.time);
  });
  
  // Process transactions chronologically
  trans.forEach(t => {
    if (t.type === 'sale') {
      // Sale increases balance (debit)
      balance += t.amt;
      totalDebit += t.amt;
      html += `<tr>
        <td>${new Date(t.date).toLocaleDateString()}</td>
        <td><span style="color:var(--danger);font-weight:700">${t.ref}</span></td>
        <td>${t.desc}</td>
        <td class="debit" style="text-align:right;font-weight:700">${fmtMoney(t.amt)}</td>
        <td style="text-align:right">-</td>
        <td class="balance" style="text-align:right;font-size:15px">${fmtMoney(balance)}</td>
      </tr>`;
    } else {
      // Payment decreases balance (credit)
      balance -= t.amt;
      totalCredit += t.amt;
      html += `<tr>
        <td>${new Date(t.date).toLocaleDateString()}</td>
        <td><span style="color:var(--success);font-weight:700">${t.ref}</span></td>
        <td>${t.desc}</td>
        <td style="text-align:right">-</td>
        <td class="credit" style="text-align:right;font-weight:700">${fmtMoney(t.amt)}</td>
        <td class="balance" style="text-align:right;font-size:15px">${fmtMoney(balance)}</td>
      </tr>`;
    }
  });
  
  document.getElementById('ledgerTable').innerHTML = html;
  document.getElementById('sumDebit').innerText = fmtMoney(totalDebit);
  document.getElementById('sumCredit').innerText = fmtMoney(totalCredit);
  document.getElementById('sumBalance').innerText = fmtMoney(balance);
}

function printLedger() {
  const custId = document.getElementById('ledCustomer').value;
  if (!custId) { alert('Please select a customer first'); return; }
  if (document.getElementById('ledgerCard').classList.contains('hidden')) { alert('Please generate the ledger report first'); return; }

  const c = customers.find(x => x.id === custId);
  const from = document.getElementById('ledFrom').value;
  const to = document.getElementById('ledTo').value;
  const compName = localStorage.getItem('compName') || 'JN AUTOS';
  const compPhone = localStorage.getItem('compPhone') || '';
  const compAddr = localStorage.getItem('compAddr') || '';
  const _ledgerLogo = companyLogo || null;

  // Capture live ledger table rows
  const tableBody = document.getElementById('ledgerTable').innerHTML;
  const sumDebit = document.getElementById('sumDebit').innerText;
  const sumCredit = document.getElementById('sumCredit').innerText;
  const sumBalance = document.getElementById('sumBalance').innerText;
  const subTitle = document.getElementById('ledgerSubTitle').innerText;

  const win = window.open('', '_blank', 'width=1050,height=800');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ledger - ${c.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',system-ui,sans-serif}
    body{background:#fff;color:#0f172a;font-size:13px;line-height:1.5}
    .wrap{max-width:960px;margin:20px auto;padding:0}
    /* Header bar */
    .top-header{background:linear-gradient(135deg,#0b5fa5,#074a85);color:#fff;padding:28px 35px;display:flex;justify-content:space-between;align-items:center}
    .top-header .left{display:flex;align-items:center;gap:16px}
    .top-header .left .logo-img{width:64px;height:64px;object-fit:contain;border-radius:10px;border:2px solid rgba(255,255,255,0.3);padding:4px;background:#fff}
    .top-header .left .logo-box{width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;flex-shrink:0}
    .top-header .left .info .company{font-size:26px;font-weight:900;letter-spacing:1px}
    .top-header .left .info .sub{font-size:13px;opacity:.85;margin-top:3px}
    .top-header .right{text-align:right}
    .top-header .right h2{font-size:22px;font-weight:800;letter-spacing:2px;margin-bottom:4px}
    .top-header .right p{font-size:12px;opacity:.85}
    /* Customer info strip */
    .cust-strip{background:#f0f9ff;border-bottom:2px solid #bae6fd;padding:18px 35px;display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
    .cust-field label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#64748b;font-weight:700;display:block;margin-bottom:3px}
    .cust-field span{font-size:14px;font-weight:700;color:#0f172a}
    /* Table */
    .table-wrap{padding:0 35px}
    table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:20px}
    thead tr{background:#1e293b;color:#fff}
    th{padding:11px 12px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
    td{padding:10px 12px;border-bottom:1px solid #f1f5f9}
    tbody tr:nth-child(even) td{background:#f8fafc}
    tbody tr:hover td{background:#eff6ff}
    .debit{color:#dc2626;font-weight:700}
    .credit{color:#16a34a;font-weight:700}
    .balance{font-weight:800;color:#0b5fa5}
    .ob-row td{background:#fef3c7!important;font-weight:700}
    /* Summary cards */
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:25px 35px 0;border-radius:12px;overflow:hidden;border:2px solid #e2e8f0}
    .sum-card{padding:22px;text-align:center}
    .sum-card:nth-child(1){background:#fee2e2}
    .sum-card:nth-child(2){background:#dcfce7}
    .sum-card:nth-child(3){background:#dbeafe}
    .sum-card .label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:8px}
    .sum-card:nth-child(1) .label{color:#991b1b}
    .sum-card:nth-child(2) .label{color:#166534}
    .sum-card:nth-child(3) .label{color:#1e40af}
    .sum-card .value{font-size:22px;font-weight:900}
    .sum-card:nth-child(1) .value{color:#dc2626}
    .sum-card:nth-child(2) .value{color:#16a34a}
    .sum-card:nth-child(3) .value{color:#1e40af}
    /* Footer */
    .footer{margin:25px 35px 30px;padding-top:20px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b}
    .footer .note{font-size:11px}
    @page{size:A4 landscape;margin:8mm}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0}
      .wrap{max-width:100%}
      .top-header{background:linear-gradient(135deg,#0b5fa5,#074a85)!important;color:#fff!important}
      .cust-strip{background:#f0f9ff!important}
      thead tr{background:#1e293b!important;color:#fff!important}
      .ob-row td{background:#fef3c7!important}
      .sum-card:nth-child(1){background:#fee2e2!important}
      .sum-card:nth-child(2){background:#dcfce7!important}
      .sum-card:nth-child(3){background:#dbeafe!important}
      tbody tr:nth-child(even) td{background:#f8fafc!important}
      table{page-break-inside:auto}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
    }
  </style>
</head>
<body>
<div class="wrap">
  <div class="top-header">
    <div class="left">
      ${_ledgerLogo ? `<img src="${_ledgerLogo}" class="logo-img" alt="Logo">` : `<div class="logo-box">JN</div>`}
      <div class="info">
        <div class="company">${compName}</div>
        <div class="sub">${compAddr ? compAddr+' &nbsp;|&nbsp; ' : ''}${compPhone ? '📞 '+compPhone : ''}</div>
        <div class="sub" style="margin-top:6px;opacity:.7">${subTitle}</div>
      </div>
    </div>
    <div class="right">
      <h2>LEDGER REPORT</h2>
      <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    </div>
  </div>

  <div class="cust-strip">
    <div class="cust-field"><label>Account Holder</label><span>${c.name}</span></div>
    <div class="cust-field"><label>Phone</label><span>${c.phone || 'N/A'}</span></div>
    <div class="cust-field"><label>From Date</label><span>${from ? new Date(from).toLocaleDateString() : 'All'}</span></div>
    <div class="cust-field"><label>To Date</label><span>${to ? new Date(to).toLocaleDateString() : 'All'}</span></div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:95px">Date</th>
          <th style="width:110px">Reference</th>
          <th>Description</th>
          <th style="width:120px;text-align:right">Debit (Dr)</th>
          <th style="width:120px;text-align:right">Credit (Cr)</th>
          <th style="width:120px;text-align:right">Balance</th>
        </tr>
      </thead>
      <tbody>${tableBody}</tbody>
    </table>
  </div>

  <div class="summary">
    <div class="sum-card"><div class="label">Total Purchases</div><div class="value">${sumDebit}</div></div>
    <div class="sum-card"><div class="label">Total Paid</div><div class="value">${sumCredit}</div></div>
    <div class="sum-card"><div class="label">Current Balance</div><div class="value">${sumBalance}</div></div>
  </div>

  <div class="footer">
    <div>
      <strong>${compName}</strong> &nbsp;|&nbsp; Customer Ledger Account &nbsp;|&nbsp; ${c.name}
    </div>
    <div class="note">This is a computer-generated report. No signature required.</div>
  </div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
  win.document.close();
}

function exportLedger() {
  const custId = document.getElementById('ledCustomer').value;
  if (!custId) {
    alert('Please select a customer first');
    return;
  }
  
  const c = customers.find(x => x.id === custId);
  const from = document.getElementById('ledFrom').value;
  const to = document.getElementById('ledTo').value;
  
  let csv = 'Date,Reference,Description,Debit,Credit,Balance\n';
  
  // Get transactions
  const invs = invoices.filter(i => i.customerId === custId && i.date >= from && i.date <= to);
  const pays = payments.filter(p => p.customerId === custId && p.date >= from && p.date <= to);
  
  let balance = c.opening || 0;
  csv += `${from},OB,Opening Balance,${balance > 0 ? balance : ''},${balance < 0 ? Math.abs(balance) : ''},${balance}\n`;
  
  let trans = [];
  invs.forEach(i => trans.push({date: i.date, type: 'sale', amt: i.total, ref: i.number, desc: `Invoice - ${i.items.length} items`}));
  pays.forEach(p => trans.push({date: p.date, type: 'pay', amt: p.amount, ref: p.id.substr(-6), desc: `Payment - ${p.method || 'Cash'}`}));
  trans.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  trans.forEach(t => {
    if (t.type === 'sale') {
      balance += t.amt;
      csv += `${t.date},${t.ref},"${t.desc}",${t.amt},,${balance}\n`;
    } else {
      balance -= t.amt;
      csv += `${t.date},${t.ref},"${t.desc}",,${t.amt},${balance}\n`;
    }
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ledger_${c.name}_${from}_to_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// EXPENSES
function addExpense() {
  const date = document.getElementById('expDate').value;
  const cat = document.getElementById('expCategory').value;
  const desc = document.getElementById('expDesc').value.trim();
  const amt = parseFloat(document.getElementById('expAmount').value) || 0;
  const method = document.getElementById('expPaidBy').value;
  
  if (!desc || amt <= 0) {
    alert('Please enter description and valid amount');
    return;
  }
  
  expenses.push({
    id: genId('EXP'),
    date: date,
    category: cat,
    description: desc,
    amount: amt,
    method: method,
    created: new Date().toISOString()
  });
  
  saveData();
  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
  renderExpenses();
  alert('Expense recorded successfully');
}

function renderExpenses() {
  const tb = document.getElementById('expTable');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthExp = expenses.filter(e => invDateGte(e.date, monthStart));
  
  tb.innerHTML = expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 50).map(e => `
    <tr>
      <td>${new Date(e.date).toLocaleDateString()}</td>
      <td><span class="badge badgeInfo">${e.category}</span></td>
      <td>${e.description}</td>
      <td style="font-weight:700;color:var(--danger)">${fmtMoney(e.amount)}</td>
      <td class="noPrint">
        <button class="iconBtn danger" onclick="delExp('${e.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
  
  document.getElementById('expTotal').innerText = fmtMoney(monthExp.reduce((a, e) => a + e.amount, 0));
}

function delExp(id) {
  if (!confirm('Delete this expense record?')) return;
  expenses = expenses.filter(e => e.id !== id);
  saveData();
  renderExpenses();
}

// SETTINGS
function loadSettings() {
  document.getElementById('compName').value = localStorage.getItem('compName') || 'JN AUTOS';
  document.getElementById('compPhone').value = localStorage.getItem('compPhone') || '';
  document.getElementById('compEmail').value = localStorage.getItem('compEmail') || '';
  document.getElementById('compAddr').value = localStorage.getItem('compAddr') || '';
  document.getElementById('compWeb').value = localStorage.getItem('compWeb') || '';
  document.getElementById('threshAlert').value = localStorage.getItem('threshold') || 5;
}

function saveSettings() {
  localStorage.setItem('compName', document.getElementById('compName').value);
  localStorage.setItem('compPhone', document.getElementById('compPhone').value);
  localStorage.setItem('compEmail', document.getElementById('compEmail').value);
  localStorage.setItem('compAddr', document.getElementById('compAddr').value);
  localStorage.setItem('compWeb', document.getElementById('compWeb').value);
  localStorage.setItem('threshold', document.getElementById('threshAlert').value);
  updateDashboard();
}

function changeCredentials() {
  const currentPass = localStorage.getItem(DB.PASS);
  const oldPass = document.getElementById('oldPass').value;
  const newUser = document.getElementById('newUser').value.trim();
  const newPass = document.getElementById('newPass').value;
  const confPass = document.getElementById('confPass').value;
  
  if (oldPass !== currentPass) {
    alert('Current password is incorrect!');
    return;
  }
  
  if (newPass && newPass !== confPass) {
    alert('New passwords do not match!');
    return;
  }
  
  if (newUser) localStorage.setItem(DB.USER, newUser);
  if (newPass) localStorage.setItem(DB.PASS, newPass);
  
  alert('Credentials updated! Please login again.');
  logout();
}

function backupData() {
  const data = {
    products, customers, invoices, payments, returns, expenses, suppliers, purchases,
    logo: companyLogo,
    settings: {
      user: localStorage.getItem(DB.USER),
      threshold: localStorage.getItem('threshold'),
      compName: localStorage.getItem('compName'),
      compPhone: localStorage.getItem('compPhone'),
      compEmail: localStorage.getItem('compEmail'),
      compAddr: localStorage.getItem('compAddr'),
      compWeb: localStorage.getItem('compWeb')
    },
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `JN_AUTOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  alert('Backup downloaded successfully!');
}

function restoreData(input) {
  const file = input.files[0];
  if (!file) return;
  if (!confirm('⚠️ WARNING: This will overwrite ALL current data. Are you sure?')) {
    input.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      products = data.products || [];
      customers = data.customers || [];
      invoices = data.invoices || [];
      payments = data.payments || [];
      returns = data.returns || [];
      expenses = data.expenses || [];
      suppliers = data.suppliers || [];
      purchases = data.purchases || [];  // NEW
      
      if (data.logo) {
        companyLogo = data.logo;
        localStorage.setItem(DB.LOGO, companyLogo);
      }
      if (data.settings) {
        if (data.settings.user) localStorage.setItem(DB.USER, data.settings.user);
        if (data.settings.threshold) localStorage.setItem('threshold', data.settings.threshold);
        if (data.settings.compName) localStorage.setItem('compName', data.settings.compName);
        if (data.settings.compPhone) localStorage.setItem('compPhone', data.settings.compPhone);
        if (data.settings.compEmail) localStorage.setItem('compEmail', data.settings.compEmail);
        if (data.settings.compAddr) localStorage.setItem('compAddr', data.settings.compAddr);
        if (data.settings.compWeb) localStorage.setItem('compWeb', data.settings.compWeb);
      }
      
      saveData();
      loadData();
      loadLogo();
      updateDashboard();
      alert('Data restored successfully! System will reload.');
      location.reload();
    } catch (err) {
      alert('Error restoring file: ' + err.message);
      input.value = '';
    }
  };
  reader.readAsText(file);
}

function deleteEverything() {
  const confirmText = document.getElementById('confirmDelete').value;
  if (confirmText !== 'DELETE ALL') {
    alert('Please type "DELETE ALL" exactly to confirm');
    return;
  }
  
  if (!confirm('FINAL WARNING: This action cannot be undone. Delete everything?')) return;
  if (!confirm('Are you absolutely sure? All data will be lost forever!')) return;
  
  Object.values(DB).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('threshold');
  localStorage.removeItem('compName');
  localStorage.removeItem('compPhone');
  localStorage.removeItem('compEmail');
  localStorage.removeItem('compAddr');
  localStorage.removeItem('compWeb');
  localStorage.removeItem('theme');
  
  alert('All data deleted. System restarting...');
  location.reload();
}

// ═══════════════════════════════════════════════
// GOOGLE DRIVE SYNC
// ═══════════════════════════════════════════════
const GDRIVE_CLIENT_ID = '648691519520-placeholder.apps.googleusercontent.com';
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GDRIVE_FILE_NAME = 'jnautos_data.json';

let gdriveTokenClient = null;
let gdriveAccessToken = null;
let gdriveFileId = null;

function gdriveSaveClientId() {
  const id = document.getElementById('gdriveClientId').value.trim();
  if (id) localStorage.setItem('gdrive_client_id', id);
}

function gdriveGetClientId() {
  return localStorage.getItem('gdrive_client_id') || document.getElementById('gdriveClientId')?.value.trim() || '';
}

function gdriveInit() {
  // Restore saved client id into input
  const savedId = localStorage.getItem('gdrive_client_id');
  if (savedId) {
    const inp = document.getElementById('gdriveClientId');
    if (inp) inp.value = savedId;
  }
  if (typeof google === 'undefined') return;
  const clientId = gdriveGetClientId();
  if (!clientId) return;
  gdriveInitClient(clientId);
  // Restore saved token
  const saved = localStorage.getItem('gdrive_token');
  if (saved) {
    gdriveAccessToken = saved;
    gdriveOnSignedIn();
  }
}

function gdriveInitClient(clientId) {
  gdriveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GDRIVE_SCOPE,
    callback: (resp) => {
      if (resp.error) { gdriveShowError('Sign in failed: ' + resp.error); return; }
      gdriveAccessToken = resp.access_token;
      localStorage.setItem('gdrive_token', gdriveAccessToken);
      gdriveOnSignedIn();
    }
  });
}

function gdriveSignIn() {
  const clientId = gdriveGetClientId();
  if (!clientId) {
    alert('⚠️ Please paste your Google Client ID first.\n\nGet it free from: console.cloud.google.com');
    return;
  }
  localStorage.setItem('gdrive_client_id', clientId);
  if (typeof google === 'undefined') {
    alert('Google API is loading. Please wait a moment and try again.');
    return;
  }
  gdriveInitClient(clientId);
  gdriveTokenClient.requestAccessToken();
}

function gdriveSignOut() {
  if (gdriveAccessToken) {
    google.accounts.oauth2.revoke(gdriveAccessToken);
  }
  gdriveAccessToken = null;
  gdriveFileId = null;
  localStorage.removeItem('gdrive_token');
  localStorage.removeItem('gdrive_file_id');
  document.getElementById('gdrive-connected').style.display = 'none';
  document.getElementById('gdrive-not-connected').style.display = 'block';
  document.getElementById('gdrive-status-dot').style.background = '#cbd5e1';
}

function gdriveOnSignedIn() {
  localStorage.setItem('gdrive_token', gdriveAccessToken);
  // Get user info
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + gdriveAccessToken }
  }).then(r => r.json()).then(info => {
    document.getElementById('gdrive-user-name').innerText = info.name || 'Connected';
    document.getElementById('gdrive-user-email').innerText = info.email || '';
  }).catch(() => {
    document.getElementById('gdrive-user-name').innerText = 'Google Account';
    document.getElementById('gdrive-user-email').innerText = 'Connected';
  });
  document.getElementById('gdrive-connected').style.display = 'block';
  document.getElementById('gdrive-not-connected').style.display = 'none';
  document.getElementById('gdrive-status-dot').style.background = '#22c55e';
  // Restore saved file id
  const fid = localStorage.getItem('gdrive_file_id');
  if (fid) gdriveFileId = fid;
  // Show last sync time
  const ls = localStorage.getItem('gdrive_last_sync');
  if (ls) document.getElementById('gdrive-last-sync').innerText = 'Last synced: ' + ls;
}

function gdriveSetLoading(show, text) {
  document.getElementById('gdrive-loading').style.display = show ? 'block' : 'none';
  document.getElementById('gdrive-connected').style.display = show ? 'none' : 'block';
  if (text) document.getElementById('gdrive-loading-text').innerText = text;
}

function gdriveShowError(msg) {
  gdriveSetLoading(false);
  alert('Google Drive Error: ' + msg);
}

async function gdriveSave() {
  if (!gdriveAccessToken) { alert('Please sign in to Google Drive first'); return; }
  gdriveSetLoading(true, 'Saving to Google Drive...');

  const data = {
    products, customers, invoices, payments, returns, expenses, suppliers, purchases,
    logo: companyLogo,
    settings: {
      user: localStorage.getItem(DB.USER),
      threshold: localStorage.getItem('threshold'),
      compName: localStorage.getItem('compName'),
      compPhone: localStorage.getItem('compPhone'),
      compEmail: localStorage.getItem('compEmail'),
      compAddr: localStorage.getItem('compAddr'),
      compWeb: localStorage.getItem('compWeb')
    },
    savedAt: new Date().toISOString(),
    version: '1.0'
  };

  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

  try {
    if (gdriveFileId) {
      // Update existing file
      await fetch('https://www.googleapis.com/upload/drive/v3/files/' + gdriveFileId + '?uploadType=media', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + gdriveAccessToken, 'Content-Type': 'application/json' },
        body: blob
      });
    } else {
      // Create new file in appDataFolder
      const meta = { name: GDRIVE_FILE_NAME, parents: ['appDataFolder'] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      form.append('file', blob);
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + gdriveAccessToken },
        body: form
      });
      const json = await res.json();
      gdriveFileId = json.id;
      localStorage.setItem('gdrive_file_id', gdriveFileId);
    }

    const now = new Date().toLocaleString();
    localStorage.setItem('gdrive_last_sync', now);
    document.getElementById('gdrive-last-sync').innerText = 'Last saved: ' + now;
    gdriveSetLoading(false);
    alert('✅ Data saved to Google Drive successfully!\nYou can now load it on any other device.');
  } catch(e) {
    gdriveShowError(e.message);
  }
}

async function gdriveLoad() {
  if (!gdriveAccessToken) { alert('Please sign in to Google Drive first'); return; }
  if (!confirm('⚠️ This will REPLACE all current data with data from Google Drive. Continue?')) return;
  gdriveSetLoading(true, 'Loading from Google Drive...');

  try {
    // Search for the file
    const search = await fetch(
      "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='" + GDRIVE_FILE_NAME + "'&fields=files(id,name,modifiedTime)",
      { headers: { Authorization: 'Bearer ' + gdriveAccessToken } }
    );
    const searchJson = await search.json();

    if (!searchJson.files || searchJson.files.length === 0) {
      gdriveSetLoading(false);
      alert('No saved data found in Google Drive.\nPlease save your data first from the main device.');
      return;
    }

    // Get the most recent file
    const file = searchJson.files[0];
    gdriveFileId = file.id;
    localStorage.setItem('gdrive_file_id', gdriveFileId);

    const dlRes = await fetch('https://www.googleapis.com/drive/v3/files/' + gdriveFileId + '?alt=media', {
      headers: { Authorization: 'Bearer ' + gdriveAccessToken }
    });
    const data = await dlRes.json();

    // Restore data (same as restoreData function)
    products = data.products || [];
    customers = data.customers || [];
    invoices = data.invoices || [];
    payments = data.payments || [];
    returns = data.returns || [];
    expenses = data.expenses || [];
    suppliers = data.suppliers || [];
    purchases = data.purchases || [];

    if (data.logo) {
      companyLogo = data.logo;
      localStorage.setItem(DB.LOGO, companyLogo);
    }
    if (data.settings) {
      if (data.settings.user) localStorage.setItem(DB.USER, data.settings.user);
      if (data.settings.threshold) localStorage.setItem('threshold', data.settings.threshold);
      if (data.settings.compName) localStorage.setItem('compName', data.settings.compName);
      if (data.settings.compPhone) localStorage.setItem('compPhone', data.settings.compPhone);
      if (data.settings.compEmail) localStorage.setItem('compEmail', data.settings.compEmail);
      if (data.settings.compAddr) localStorage.setItem('compAddr', data.settings.compAddr);
      if (data.settings.compWeb) localStorage.setItem('compWeb', data.settings.compWeb);
    }

    saveData();
    loadData();
    loadLogo();
    updateDashboard();

    const savedAt = data.savedAt ? new Date(data.savedAt).toLocaleString() : 'Unknown';
    const now = new Date().toLocaleString();
    localStorage.setItem('gdrive_last_sync', now);
    document.getElementById('gdrive-last-sync').innerText = 'Last loaded: ' + now;

    gdriveSetLoading(false);
    alert('✅ Data loaded from Google Drive successfully!\nData was last saved on: ' + savedAt);
  } catch(e) {
    gdriveShowError(e.message);
  }
}

function gdriveShowSetupGuide() {
  alert(
    '⚙️ GOOGLE DRIVE SETUP REQUIRED\n\n' +
    'To use Google Drive sync, you need a free Google API key.\n\n' +
    'QUICK STEPS:\n' +
    '1. Go to: console.cloud.google.com\n' +
    '2. Create a new project (e.g. "JN Autos")\n' +
    '3. Enable "Google Drive API"\n' +
    '4. Create OAuth 2.0 Client ID (Web Application)\n' +
    '5. Add your file URL to Authorized Origins\n' +
    '6. Copy Client ID and paste it in Settings → Google Drive → Setup\n\n' +
    'Or contact your developer to set this up in 5 minutes!'
  );
}

// ═══════════════════════════════════════════════════════════════════
//  FIREBASE REAL-TIME AUTO-SYNC ENGINE
//  Works across Mobile + PC instantly with no manual save/load
// ═══════════════════════════════════════════════════════════════════

const FB = {
  DB_URL_KEY:   'fb_db_url',
  API_KEY:      'fb_api_key',
  PASS_KEY:     'fb_sync_pass',
  CONNECTED:    'fb_connected',
  LAST_PUSH:    'fb_last_push',
  LAST_PULL:    'fb_last_pull',
  POLL_MS:      6000,   // poll every 6 seconds for changes
};

let fbConnected = false;
let fbDbUrl     = '';
let fbApiKey    = '';
let fbPassHash  = '';
let fbPollTimer = null;
let fbLastRemoteTimestamp = 0;
let fbIsPushing = false;

// ── Helpers ─────────────────────────────────────────────────────────

async function fbSimpleHash(str) {
  // Simple deterministic hash for the sync key namespace
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0,16);
}

function fbCleanUrl(url) {
  return url.replace(/\/+$/, ''); // remove trailing slash
}

function fbDataPath(hash) {
  // Each password gets its own isolated namespace in Firebase
  return `${fbDbUrl}/jnautos_${hash}.json?auth=`;
}

function fbTimeStr(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

function fbLog(msg) {
  const log = document.getElementById('fbSyncLog');
  if (!log) return;
  log.style.display = 'block';
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  log.innerHTML = `<div>[${time}] ${msg}</div>` + log.innerHTML;
  // keep only last 20 entries
  const lines = log.children;
  while (lines.length > 20) log.removeChild(lines[lines.length - 1]);
}

function fbSetStatus(state) {
  // state: 'off' | 'syncing' | 'ok' | 'error'
  const dot  = document.getElementById('fbDot');
  const sbar = document.getElementById('fbStatusBar');
  const stxt = document.getElementById('fbStatusText');
  const sico = document.getElementById('fbStatusIcon');
  const sdot = document.getElementById('sidebarSyncDot');
  const slbl = document.getElementById('sidebarSyncLabel');
  const pill = document.getElementById('sidebarSyncPill');

  const cfg = {
    off:     {dot:'#cbd5e1', bg:'#f1f5f9', ico:'⚪', txt:'Not connected',              sdot:'#cbd5e1', slbl:'Sync: Off'},
    syncing: {dot:'#f97316', bg:'#fff7ed', ico:'🔄', txt:'Syncing...',                  sdot:'#f97316', slbl:'Syncing…'},
    ok:      {dot:'#22c55e', bg:'#f0fdf4', ico:'✅', txt:'Auto-Sync active — all good', sdot:'#22c55e', slbl:'Sync: Live'},
    error:   {dot:'#ef4444', bg:'#fef2f2', ico:'❌', txt:'Sync error — check settings', sdot:'#ef4444', slbl:'Sync: Error'},
  };
  const c = cfg[state] || cfg.off;
  if (dot)  dot.style.background  = c.dot;
  if (sbar) sbar.style.background = c.bg;
  if (stxt) stxt.innerText        = c.txt;
  if (sico) sico.innerText        = c.ico;
  if (sdot) sdot.style.background = c.sdot;
  if (slbl) slbl.innerText        = c.slbl;
  if (pill) pill.style.display    = 'flex';
}

// ── Connect / Disconnect ─────────────────────────────────────────────

// ── Wizard step navigation ────────────────────────────────────────────

function wzGoStep(n) {
  // Validate before moving forward
  if (n === 3) {
    const url = document.getElementById('fbDbUrl').value.trim();
    if (!url || !url.startsWith('https://')) {
      alert('⚠️ Please paste your Database URL first.\nIt should start with https://');
      return;
    }
  }
  if (n === 4) {
    const key = document.getElementById('fbApiKey').value.trim();
    if (!key || key.length < 10) {
      alert('⚠️ Please paste your Web API Key first.\nIt should start with AIzaSy...');
      return;
    }
  }

  [1,2,3,4].forEach(i => {
    const s = document.getElementById('wzStep' + i);
    if (s) s.style.display = i === n ? 'block' : 'none';
  });

  // Update dot styles
  [1,2,3,4].forEach(i => {
    const dot = document.getElementById('wz' + i + 'dot');
    if (!dot) return;
    if (i < n) {
      dot.style.background = '#16a34a'; dot.style.color = '#fff'; dot.innerText = '✓';
    } else if (i === n) {
      dot.style.background = 'var(--primary)'; dot.style.color = '#fff'; dot.innerText = i;
    } else {
      dot.style.background = '#e2e8f0'; dot.style.color = '#94a3b8'; dot.innerText = i;
    }
  });
}

async function fbConnect() {
  const url  = document.getElementById('fbDbUrl').value.trim();
  const key  = document.getElementById('fbApiKey').value.trim();
  const pass = document.getElementById('fbSyncPass').value.trim();

  if (!url || !key || !pass) {
    alert('⚠️ Please fill in Database URL, API Key, and Sync Password.');
    return;
  }

  fbDbUrl    = fbCleanUrl(url);
  fbApiKey   = key;
  fbPassHash = await fbSimpleHash(pass);

  // Test connection
  fbSetStatus('syncing');
  try {
    const testUrl = `${fbDbUrl}/jnautos_ping.json?auth=`;
    const r = await fetch(`${testUrl}${fbApiKey}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ping: true, at: new Date().toISOString()})
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch(e) {
    fbSetStatus('error');
    alert('❌ Could not connect to Firebase.\n\nCheck:\n• Your Database URL is correct\n• Database rules allow read/write (test mode)\n• Your internet connection\n\nError: ' + e.message);
    return;
  }

  // Save credentials
  localStorage.setItem(FB.DB_URL_KEY, fbDbUrl);
  localStorage.setItem(FB.API_KEY,    fbApiKey);
  localStorage.setItem(FB.PASS_KEY,   fbPassHash);
  localStorage.setItem(FB.CONNECTED,  '1');

  fbConnected = true;
  fbShowConnectedPanel();
  fbSetStatus('ok');

  // Push current data immediately, then start polling
  await fbPush(true);
  fbStartPolling();

  fbLog('✅ Connected and initial sync complete');
  alert('✅ Auto-Sync connected!\n\nFrom now on, every bill, stock change, and payment will automatically sync to all your devices within seconds.');
}

function fbDisconnect() {
  if (!confirm('Disconnect Auto-Sync? Your local data will stay safe.')) return;
  fbStopPolling();
  fbConnected = false;
  localStorage.removeItem(FB.CONNECTED);
  document.getElementById('fbSetupPanel').style.display = 'block';
  document.getElementById('fbConnectedPanel').style.display = 'none';
  fbSetStatus('off');
  fbLog('🔌 Disconnected');
}

function fbShowConnectedPanel() {
  document.getElementById('fbSetupPanel').style.display = 'none';
  document.getElementById('fbConnectedPanel').style.display = 'block';
  const urlEl = document.getElementById('fbConnectedUrl');
  if (urlEl) urlEl.innerText = fbDbUrl.replace('https://','').split('.')[0] + ' (Firebase)';
}

// ── Push (local → cloud) ─────────────────────────────────────────────

async function fbPush(silent = false) {
  if (!fbConnected || fbIsPushing) return;
  fbIsPushing = true;
  if (!silent) fbSetStatus('syncing');

  try {
    const payload = {
      products, customers, invoices, payments, returns,
      expenses, suppliers, purchases,
      settings: {
        compName:  localStorage.getItem('compName'),
        compPhone: localStorage.getItem('compPhone'),
        compEmail: localStorage.getItem('compEmail'),
        compAddr:  localStorage.getItem('compAddr'),
        compWeb:   localStorage.getItem('compWeb'),
        threshold: localStorage.getItem('threshold'),
      },
      logo: companyLogo,
      pushedAt: new Date().toISOString(),
      pushedBy: localStorage.getItem(DB.USER) || 'unknown',
      deviceId: fbDeviceId(),
    };

    const path = `${fbDbUrl}/jnautos_${fbPassHash}.json?auth=${fbApiKey}`;
    const r = await fetch(path, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);

    const now = new Date().toISOString();
    localStorage.setItem(FB.LAST_PUSH, now);
    const el = document.getElementById('fbLastPush');
    if (el) el.innerText = fbTimeStr(now);
    fbLastRemoteTimestamp = Date.parse(now);

    if (!silent) {
      fbSetStatus('ok');
      fbLog('☁️ Pushed to cloud');
    }
  } catch(e) {
    fbSetStatus('error');
    fbLog('❌ Push failed: ' + e.message);
  }
  fbIsPushing = false;
}

// ── Pull (cloud → local) ─────────────────────────────────────────────

async function fbPull(silent = false) {
  if (!fbConnected) return;

  // CRITICAL: Never pull if we saved locally in the last 15 seconds
  // This prevents new customers/payments from being overwritten by old cloud data
  if (Date.now() - fbLocalSaveTime < 15000) {
    if (!silent) fbSetStatus('ok');
    return;
  }

  if (!silent) fbSetStatus('syncing');

  try {
    const path = `${fbDbUrl}/jnautos_${fbPassHash}.json?auth=${fbApiKey}`;
    const r = await fetch(path);
    if (!r.ok) throw new Error('HTTP ' + r.status);

    const data = await r.json();
    if (!data || !data.pushedAt) {
      if (!silent) { fbSetStatus('ok'); fbLog('ℹ️ No remote data found'); }
      return;
    }

    const remoteTs = Date.parse(data.pushedAt);

    // Skip if we already processed this version
    if (remoteTs <= fbLastRemoteTimestamp) {
      if (!silent) fbSetStatus('ok');
      return;
    }

    // Skip if it's our own push (same device)
    if (data.deviceId === fbDeviceId()) {
      fbLastRemoteTimestamp = remoteTs;
      if (!silent) fbSetStatus('ok');
      return;
    }

    // Apply remote data from OTHER device
    if (data.products)   { products  = data.products;  localStorage.setItem(DB.PROD, JSON.stringify(products)); }
    if (data.customers)  { customers = data.customers; localStorage.setItem(DB.CUST, JSON.stringify(customers)); customers = JSON.parse(localStorage.getItem(DB.CUST) || '[]'); }
    if (data.invoices)   { invoices  = data.invoices;  localStorage.setItem(DB.INV,  JSON.stringify(invoices)); }
    if (data.payments)   { payments  = data.payments;  localStorage.setItem(DB.PAY,  JSON.stringify(payments)); }
    if (data.returns)    { returns   = data.returns;   localStorage.setItem(DB.RET,  JSON.stringify(returns)); }
    if (data.expenses)   { expenses  = data.expenses;  localStorage.setItem(DB.EXP,  JSON.stringify(expenses)); }
    if (data.suppliers)  { suppliers = data.suppliers; localStorage.setItem(DB.SUPP, JSON.stringify(suppliers)); }
    if (data.purchases)  { purchases = data.purchases; localStorage.setItem(DB.PURCHASES, JSON.stringify(purchases)); }
    if (data.logo)       { companyLogo = data.logo;    localStorage.setItem(DB.LOGO, companyLogo); loadLogo(); }

    if (data.settings) {
      if (data.settings.compName)  localStorage.setItem('compName',  data.settings.compName);
      if (data.settings.compPhone) localStorage.setItem('compPhone', data.settings.compPhone);
      if (data.settings.compEmail) localStorage.setItem('compEmail', data.settings.compEmail);
      if (data.settings.compAddr)  localStorage.setItem('compAddr',  data.settings.compAddr);
      if (data.settings.compWeb)   localStorage.setItem('compWeb',   data.settings.compWeb);
      if (data.settings.threshold) localStorage.setItem('threshold', data.settings.threshold);
    }

    fbLastRemoteTimestamp = remoteTs;

    // Refresh current view
    const activePage = document.querySelector('.page.active');
    if (activePage) {
      const pageId = activePage.id.replace('page-', '');
      switch(pageId) {
        case 'dashboard':   updateDashboard();   break;
        case 'invoice':     initInvoice();        break;
        case 'customers':   renderCust();         break;
        case 'products':    renderProd();         break;
        case 'part-search': initPartSearch();     break;
        case 'stock-list':  initStockList();      break;
        case 'item-sales':  renderItemSales();    break;
        case 'sales':       renderSales();        break;
        case 'ledger':      initLedger();         break;
        case 'expenses':    renderExpenses();     break;
      }
    }

    const now = new Date().toISOString();
    localStorage.setItem(FB.LAST_PULL, now);
    const el = document.getElementById('fbLastPull');
    if (el) el.innerText = fbTimeStr(now);

    fbSetStatus('ok');
    const who = data.pushedBy && data.pushedBy !== (localStorage.getItem(DB.USER)||'') ? ` from ${data.pushedBy}` : '';
    fbLog(`📥 Pulled update${who} (${new Date(data.pushedAt).toLocaleTimeString()})`);

    // Show a subtle toast notification
    fbToast(`🔄 Synced${who}`);

  } catch(e) {
    if (!silent) {
      fbSetStatus('error');
      fbLog('❌ Pull failed: ' + e.message);
    }
  }
}

// ── Polling ──────────────────────────────────────────────────────────

function fbStartPolling() {
  fbStopPolling();
  fbPollTimer = setInterval(() => fbPull(true), FB.POLL_MS);
  fbLog('🔁 Auto-poll started (every ' + (FB.POLL_MS/1000) + 's)');
}

function fbStopPolling() {
  if (fbPollTimer) { clearInterval(fbPollTimer); fbPollTimer = null; }
}

// ── Manual buttons ────────────────────────────────────────────────────

async function fbManualPush() {
  await fbPush(false);
  fbLog('☁️ Manual push done');
}

async function fbManualPull() {
  fbLastRemoteTimestamp = 0; // force apply
  await fbPull(false);
  fbLog('📥 Manual pull done');
}

// ── Auto-push hook: merged into saveData() above ─────────────────────

// ── Toast notification ────────────────────────────────────────────────

function fbToast(msg) {
  let toast = document.getElementById('fbToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fbToast';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e293b;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;max-width:250px;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.style.opacity = '1';
  clearTimeout(fbToast._t);
  fbToast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ── Device ID ─────────────────────────────────────────────────────────

function fbDeviceId() {
  let id = localStorage.getItem('fb_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2,10);
    localStorage.setItem('fb_device_id', id);
  }
  return id;
}

// ── Init on page load ─────────────────────────────────────────────────

function fbInit() {
  fbDbUrl    = localStorage.getItem(FB.DB_URL_KEY) || '';
  fbApiKey   = localStorage.getItem(FB.API_KEY)    || '';
  fbPassHash = localStorage.getItem(FB.PASS_KEY)   || '';

  // Pre-fill form if values exist
  if (fbDbUrl)   { const el = document.getElementById('fbDbUrl');    if(el) el.value = fbDbUrl; }
  if (fbApiKey)  { const el = document.getElementById('fbApiKey');   if(el) el.value = fbApiKey; }

  if (localStorage.getItem(FB.CONNECTED) === '1' && fbDbUrl && fbApiKey && fbPassHash) {
    fbConnected = true;
    fbShowConnectedPanel();
    fbSetStatus('ok');

    // Restore last timestamps
    fbLastRemoteTimestamp = Date.parse(localStorage.getItem(FB.LAST_PUSH) || '0');
    const pushEl = document.getElementById('fbLastPush');
    const pullEl = document.getElementById('fbLastPull');
    if (pushEl) pushEl.innerText = fbTimeStr(localStorage.getItem(FB.LAST_PUSH));
    if (pullEl) pullEl.innerText = fbTimeStr(localStorage.getItem(FB.LAST_PULL));

    // Pull latest from cloud immediately
    setTimeout(() => fbPull(true), 2000);
    fbStartPolling();
    fbLog('🚀 Auto-Sync resumed');
  } else {
    fbSetStatus('off');
  }
}

window.addEventListener('load', () => setTimeout(fbInit, 800));

// Sync when app comes back to foreground (mobile browser)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && fbConnected) {
    fbLastRemoteTimestamp = 0; // force check
    fbPull(true);
  }
});


// Initialize theme
if (localStorage.getItem('theme') === 'dark') {
  document.body.setAttribute('data-theme', 'dark');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'p') {
    e.preventDefault();
    if (document.getElementById('page-invoice').classList.contains('active')) {
      previewInvoice();
    }
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (document.getElementById('page-invoice').classList.contains('active')) {
      saveInvoice(false);
    }
  }
});

// Drag and drop for logo
const logoUploadArea = document.getElementById('logoUploadArea');
if (logoUploadArea) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    logoUploadArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    logoUploadArea.addEventListener(eventName, () => {
      logoUploadArea.style.borderColor = 'var(--primary)';
      logoUploadArea.style.background = '#f0f9ff';
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    logoUploadArea.addEventListener(eventName, () => {
      logoUploadArea.style.borderColor = '#cbd5e1';
      logoUploadArea.style.background = '#f8fafc';
    }, false);
  });
  
  logoUploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      document.getElementById('logoInput').files = files;
      uploadLogo(document.getElementById('logoInput'));
    }
  }, false);
}
