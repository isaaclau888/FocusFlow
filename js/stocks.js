// Stock Market Simulator

// App state for the stock simulator.
let stockGame = { coins: 1500, prices: {}, holdings: {}, trades: [], history: {} };
let stockMarketInterval = null;
let selectedStockSymbol = "TECHX";

const stockCatalog = [
  { symbol: "TECHX", name: "TechX Labs", base: 120, vol: 0.035 },
  { symbol: "GREEN", name: "GreenGrid Energy", base: 85, vol: 0.028 },
  { symbol: "MEDI", name: "MediCore Health", base: 64, vol: 0.024 },
  { symbol: "FINA", name: "FinAxis Holdings", base: 98, vol: 0.03 },
  { symbol: "ROBO", name: "RoboWorks", base: 142, vol: 0.04 }
];

/**
 * Ensure stock game state has all required properties
 */
function ensureStockState() {
  if (!stockGame || typeof stockGame !== "object") {
    stockGame = { coins: 1500, prices: {}, holdings: {}, trades: [], history: {} };
  }
  if (!Number.isFinite(stockGame.coins)) stockGame.coins = 1500;
  if (!stockGame.prices || typeof stockGame.prices !== "object") stockGame.prices = {};
  if (!stockGame.holdings || typeof stockGame.holdings !== "object") stockGame.holdings = {};
  if (!Array.isArray(stockGame.trades)) stockGame.trades = [];
  if (!stockGame.history || typeof stockGame.history !== "object") stockGame.history = {};

  stockCatalog.forEach((s) => {
    if (!Number.isFinite(stockGame.prices[s.symbol])) {
      stockGame.prices[s.symbol] = s.base;
    }
    if (!Number.isFinite(stockGame.holdings[s.symbol])) {
      stockGame.holdings[s.symbol] = 0;
    }
    if (!Array.isArray(stockGame.history[s.symbol])) {
      stockGame.history[s.symbol] = Array.from({ length: 20 }, () => s.base);
    }
    if (!stockGame.history[s.symbol].length) {
      stockGame.history[s.symbol] = [stockGame.prices[s.symbol]];
    }
    stockGame.history[s.symbol] = stockGame.history[s.symbol].slice(-80);
  });

  if (!stockCatalog.some((s) => s.symbol === selectedStockSymbol)) {
    selectedStockSymbol = stockCatalog[0]?.symbol || "TECHX";
  }
}

/**
 * Load stock portfolio from Firestore
 */
async function loadStockGame() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  if (data.stockGame && typeof data.stockGame === "object") {
    stockGame = data.stockGame;
  }
  ensureStockState();
  renderStockApp();
}

async function saveStockGame() {
  if (!auth.currentUser) return;
  ensureStockState();
  await db.collection("user_data").doc(auth.currentUser.uid).set({ stockGame }, { merge: true });
}

function startStockMarket() {
  ensureStockState();
  renderStockApp();
  if (stockMarketInterval) clearInterval(stockMarketInterval);
  stockMarketInterval = setInterval(() => {
    simulateStockTick();
    renderStockApp();
  }, 2500);
}

function simulateStockTick() {
  stockCatalog.forEach((s) => {
    const current = stockGame.prices[s.symbol] || s.base;
    const drift = (Math.random() - 0.5) * 2 * s.vol;
    const next = Math.max(1, current * (1 + drift));
    const nextPrice = parseFloat(next.toFixed(2));
    stockGame.prices[s.symbol] = nextPrice;
    stockGame.history[s.symbol].push(nextPrice);
    stockGame.history[s.symbol] = stockGame.history[s.symbol].slice(-80);
  });
}

function stockPortfolioValue() {
  return stockCatalog.reduce((sum, s) => {
    const qty = stockGame.holdings[s.symbol] || 0;
    const price = stockGame.prices[s.symbol] || 0;
    return sum + qty * price;
  }, 0);
}

function renderStockApp() {
  ensureStockState();
  const coins = stockGame.coins;
  const portfolio = stockPortfolioValue();
  const net = coins + portfolio;
  if (safeEl("stock-coins")) safeEl("stock-coins").innerText = `${coins.toFixed(2)} coins`;
  if (safeEl("stock-portfolio-value")) safeEl("stock-portfolio-value").innerText = `${portfolio.toFixed(2)} coins`;
  if (safeEl("stock-net-worth")) safeEl("stock-net-worth").innerText = `${net.toFixed(2)} coins`;

  const body = safeEl("stocks-body");
  if (body) {
    body.innerHTML = "";
    stockCatalog.forEach((s) => {
      const tr = document.createElement("tr");
      const price = stockGame.prices[s.symbol] || s.base;
      const owned = stockGame.holdings[s.symbol] || 0;
      if (s.symbol === selectedStockSymbol) tr.style.background = "#f2f8ff";
      tr.innerHTML = `
        <td><button class='btn-save' style='padding:3px 7px;' onclick="selectStockSymbol('${s.symbol}')">${s.symbol}</button><div style='font-size:11px;color:#667085;margin-top:3px;'>${s.name}</div></td>
        <td>${price.toFixed(2)}</td>
        <td>${owned}</td>
        <td><input id='stock-qty-${s.symbol}' type='number' min='1' value='1' style='width:58px;'></td>
        <td>
          <button class='btn-save' onclick="buyStock('${s.symbol}')">Buy</button>
          <button class='kill-btn' onclick="sellStock('${s.symbol}')">Sell</button>
        </td>
      `;
      body.appendChild(tr);
    });
  }

  renderStockChart();

  const port = safeEl("stocks-portfolio");
  if (port) {
    const rows = stockCatalog
      .map((s) => ({ symbol: s.symbol, qty: stockGame.holdings[s.symbol] || 0, price: stockGame.prices[s.symbol] || s.base }))
      .filter((r) => r.qty > 0);
    if (!rows.length) {
      port.innerHTML = "<div style='color:#888;'>No holdings yet</div>";
    } else {
      port.innerHTML = rows.map((r) => `<div class='stock-holding-row'><span>${r.symbol} x${r.qty}</span><strong>${(r.qty * r.price).toFixed(2)}</strong></div>`).join("");
    }
  }

  const hist = safeEl("stocks-history");
  if (hist) {
    if (!stockGame.trades.length) {
      hist.innerHTML = "<div style='color:#888;'>No trades yet</div>";
    } else {
      hist.innerHTML = stockGame.trades.slice(0, 15).map((t) => `<div class='stock-trade-row'><span>${t.side} ${t.qty} ${t.symbol}</span><strong>${t.total.toFixed(2)}</strong></div>`).join("");
    }
  }
}

function selectStockSymbol(symbol) {
  if (!stockCatalog.some((s) => s.symbol === symbol)) return;
  selectedStockSymbol = symbol;
  renderStockApp();
}

function renderStockChart() {
  const title = safeEl("stock-chart-title");
  const svg = safeEl("stock-chart-svg");
  const stats = safeEl("stock-chart-stats");
  if (!title || !svg || !stats) return;

  const points = (stockGame.history[selectedStockSymbol] || []).slice(-60);
  if (!points.length) {
    title.innerText = `${selectedStockSymbol} chart`;
    svg.innerHTML = "";
    stats.innerHTML = "";
    return;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.01, max - min);
  const w = 320;
  const h = 140;
  const pad = 8;

  const xy = points.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const up = last >= first;
  const stroke = up ? "#16a34a" : "#dc2626";

  svg.innerHTML = `
    <rect x="0" y="0" width="320" height="140" fill="#ffffff"></rect>
    <polyline points="${xy}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>
  `;

  title.innerText = `${selectedStockSymbol} • ${last.toFixed(2)} coins`;
  stats.innerHTML = `
    <span>Min ${min.toFixed(2)}</span>
    <span>Max ${max.toFixed(2)}</span>
    <span style="color:${stroke};">${up ? "Rising" : "Dropping"}</span>
  `;
}

function readStockQty(symbol) {
  const qty = parseInt(safeEl(`stock-qty-${symbol}`)?.value || "1", 10);
  return Math.max(1, qty || 1);
}

async function buyStock(symbol) {
  ensureStockState();
  const qty = readStockQty(symbol);
  const price = stockGame.prices[symbol] || 0;
  const total = qty * price;
  if (total > stockGame.coins) return alert("Not enough coins.");

  stockGame.coins = parseFloat((stockGame.coins - total).toFixed(2));
  stockGame.holdings[symbol] = (stockGame.holdings[symbol] || 0) + qty;
  stockGame.trades.unshift({ side: "BUY", symbol, qty, total: parseFloat(total.toFixed(2)), ts: Date.now() });
  stockGame.trades = stockGame.trades.slice(0, 100);

  await saveStockGame();
  renderStockApp();
}

async function sellStock(symbol) {
  ensureStockState();
  const qty = readStockQty(symbol);
  const owned = stockGame.holdings[symbol] || 0;
  if (qty > owned) return alert("You do not own that many shares.");

  const price = stockGame.prices[symbol] || 0;
  const total = qty * price;
  stockGame.holdings[symbol] = owned - qty;
  stockGame.coins = parseFloat((stockGame.coins + total).toFixed(2));
  stockGame.trades.unshift({ side: "SELL", symbol, qty, total: parseFloat(total.toFixed(2)), ts: Date.now() });
  stockGame.trades = stockGame.trades.slice(0, 100);

  await saveStockGame();
  renderStockApp();
}
