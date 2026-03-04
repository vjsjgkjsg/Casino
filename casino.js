/* ============================================================
   NOVA CASINO — Full Game Logic
   ============================================================ */

// ──────────────────────────────────────────────────────────
// GLOBAL STATE
// ──────────────────────────────────────────────────────────
let balance = 10000;
let currentSection = 'home';

// ──────────────────────────────────────────────────────────
// UTILITY
// ──────────────────────────────────────────────────────────
function fmt(n) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function updateAllBalances() {
  const v = fmt(balance) + ' ₽';
  const vNum = fmt(balance);
  document.getElementById('header-balance').textContent = v;
  const hb = document.getElementById('hero-balance');
  if (hb) hb.textContent = v;
  const cb = document.getElementById('crash-balance');
  if (cb) cb.textContent = vNum;
  const sb = document.getElementById('slots-balance');
  if (sb) sb.textContent = vNum;
}
function showNotification(msg, type = 'info') {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.className = 'notification show notif-' + type;
  clearTimeout(window._notifTimer);
  window._notifTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ──────────────────────────────────────────────────────────
// SECTION NAVIGATION
// ──────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  const links = document.querySelectorAll('.nav-link');
  const idx = { home: 0, crash: 1, slots: 2 };
  if (links[idx[name]]) links[idx[name]].classList.add('active');
  currentSection = name;
  window.scrollTo(0, 0);
}

// ──────────────────────────────────────────────────────────
// PARTICLES
// ──────────────────────────────────────────────────────────
function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${Math.random() * 12 + 8}s;
      animation-delay:${Math.random() * 12}s;
    `;
    container.appendChild(p);
  }
}

// ──────────────────────────────────────────────────────────
// LIVE FEED
// ──────────────────────────────────────────────────────────
const FEED_NAMES = ['Alex','Maria','Dmitri','Nikita','Anna','Sasha','Igor','Elena','Pavel','Olga'];
const FEED_GAMES = ['Краш','Слоты'];
function addFeedItem() {
  const feed = document.getElementById('live-feed');
  if (!feed) return;
  const user = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)];
  const game = FEED_GAMES[Math.floor(Math.random() * FEED_GAMES.length)];
  const win = (Math.random() * 9000 + 100).toFixed(2);
  const mult = (Math.random() * 20 + 1.5).toFixed(2);
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `<span class="feed-user">👤 ${user}</span><span class="feed-game">${game}</span><span class="feed-win">+${fmt(parseFloat(win))} ₽</span><span style="color:var(--gold);font-size:11px;font-family:'Orbitron',monospace">x${mult}</span>`;
  feed.insertBefore(item, feed.firstChild);
  if (feed.children.length > 12) feed.removeChild(feed.lastChild);
}
function updateStats() {
  const p = document.getElementById('stat-players');
  const w = document.getElementById('stat-wins');
  if (p) p.textContent = (1200 + Math.floor(Math.random() * 200)).toLocaleString('ru-RU');
  if (w) {
    const wins = parseFloat(w.textContent.replace(/[₽\s,]/g, '').replace(/\./g, '').replace(',', '.')) || 892450;
    const newWins = wins + Math.random() * 2000;
    w.textContent = '₽ ' + fmtShort(newWins);
  }
}

// ──────────────────────────────────────────────────────────
// BET HELPERS
// ──────────────────────────────────────────────────────────
function adjustBet(game, delta) {
  const id = game === 'crash' ? 'crash-bet' : 'slots-bet';
  const input = document.getElementById(id);
  let val = Math.max(10, Math.min(50000, parseInt(input.value) + delta));
  input.value = val;
  if (game === 'crash') updateCrashPotential();
  if (game === 'slots') updateTotalBet();
}
function setBet(game, val) {
  const id = game === 'crash' ? 'crash-bet' : 'slots-bet';
  document.getElementById(id).value = val;
  if (game === 'crash') updateCrashPotential();
  if (game === 'slots') updateTotalBet();
}

// ──────────────────────────────────────────────────────────
//  ██████╗██████╗  █████╗ ███████╗██╗  ██╗
// ██╔════╝██╔══██╗██╔══██╗██╔════╝██║  ██║
// ██║     ██████╔╝███████║███████╗███████║
// ██║     ██╔══██╗██╔══██║╚════██║██╔══██║
// ╚██████╗██║  ██║██║  ██║███████║██║  ██║
//  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
// ──────────────────────────────────────────────────────────
const CRASH = {
  state: 'waiting',  // waiting | countdown | flying | crashed
  multiplier: 1.00,
  targetCrash: 1.00,
  betPlaced: false,
  betAmount: 0,
  cashedOut: false,
  cashoutMultiplier: 1.00,
  intervalId: null,
  countdownId: null,
  waitTime: 5000,
  history: [],
  rounds: [],
  canvas: null,
  ctx: null,
  points: [],
  startTime: null,
  animFrame: null,
};

function initCrash() {
  CRASH.canvas = document.getElementById('crash-canvas');
  CRASH.ctx = CRASH.canvas.getContext('2d');
  resizeCrashCanvas();
  window.addEventListener('resize', resizeCrashCanvas);
  renderCrashHistory();
  updateCrashPotential();
  document.getElementById('crash-bet').addEventListener('input', updateCrashPotential);
  startCrashWait();
}

function resizeCrashCanvas() {
  const c = CRASH.canvas;
  const rect = c.parentElement.getBoundingClientRect();
  c.width = rect.width;
  c.height = rect.height || 480;
}

function generateCrashPoint() {
  // House edge ~3%, provably fair style generation
  const r = Math.random();
  if (r < 0.33) return 1.0 + Math.random() * 0.8;          // 33% — early crash 1.0x–1.8x
  if (r < 0.60) return 1.5 + Math.random() * 2.0;          // 27% — 1.5x–3.5x
  if (r < 0.78) return 3.0 + Math.random() * 7.0;          // 18% — 3x–10x
  if (r < 0.90) return 10  + Math.random() * 40;           // 12% — 10x–50x
  if (r < 0.97) return 50  + Math.random() * 200;          //  7% — 50x–250x
  return 250 + Math.random() * 750;                         //  3% — 250x–1000x
}

function startCrashWait() {
  CRASH.state = 'waiting';
  CRASH.multiplier = 1.00;
  CRASH.betPlaced = false;
  CRASH.cashedOut = false;
  CRASH.points = [];
  CRASH.targetCrash = generateCrashPoint();
  CRASH.targetCrash = Math.round(CRASH.targetCrash * 100) / 100;

  setMult('1.00x', 'waiting');
  setStatus('Ставки принимаются... ' + (CRASH.waitTime / 1000) + 'с');
  setCrashBtn('bet');
  showPlane(false);
  hideCrashExplosion();
  drawCrashEmpty();

  let countdown = CRASH.waitTime / 1000;
  clearInterval(CRASH.countdownId);
  CRASH.countdownId = setInterval(() => {
    countdown--;
    setStatus('Ставки принимаются... ' + Math.max(0, countdown) + 'с');
    if (countdown <= 0) {
      clearInterval(CRASH.countdownId);
      startCrashFlight();
    }
  }, 1000);
}

function startCrashFlight() {
  CRASH.state = 'flying';
  CRASH.startTime = performance.now();
  CRASH.multiplier = 1.00;
  CRASH.points = [];
  showPlane(true);
  setStatus('Летим! Успей вывести!');
  setCrashBtn(CRASH.betPlaced ? 'cashout' : 'disabled');
  flyLoop();
}

function flyLoop() {
  CRASH.animFrame = requestAnimationFrame(tick);
}

function tick(now) {
  if (CRASH.state !== 'flying') return;
  const elapsed = (now - CRASH.startTime) / 1000;
  // Exponential growth: mult = e^(0.06 * t) — starts slow, grows fast
  const mult = Math.exp(0.06 * elapsed);
  CRASH.multiplier = Math.round(mult * 100) / 100;

  setMult(CRASH.multiplier.toFixed(2) + 'x', 'flying');

  // Update potential win if bet placed
  if (CRASH.betPlaced && !CRASH.cashedOut) {
    const potential = CRASH.betAmount * CRASH.multiplier;
    document.getElementById('crash-potential-amt').textContent = fmt(potential) + ' ₽';
  }

  // Auto cashout
  const autoCB = document.getElementById('auto-cashout-enabled');
  const autoVal = parseFloat(document.getElementById('auto-cashout').value) || 2.0;
  if (CRASH.betPlaced && !CRASH.cashedOut && autoCB && autoCB.checked && CRASH.multiplier >= autoVal) {
    doCashout();
    return;
  }

  // Draw chart
  CRASH.points.push({ t: elapsed, m: CRASH.multiplier });
  drawCrashChart();
  movePlane();

  if (CRASH.multiplier >= CRASH.targetCrash) {
    doCrash();
    return;
  }
  CRASH.animFrame = requestAnimationFrame(tick);
}

function doCrash() {
  CRASH.state = 'crashed';
  cancelAnimationFrame(CRASH.animFrame);
  const finalMult = CRASH.targetCrash;
  CRASH.multiplier = finalMult;
  setMult(finalMult.toFixed(2) + 'x', 'crashed');
  setStatus('💥 КРАШ на ' + finalMult.toFixed(2) + 'x!');
  setCrashBtn('disabled');
  showPlane(false);
  showCrashExplosion();

  // Save to history
  CRASH.history.unshift(finalMult);
  if (CRASH.history.length > 20) CRASH.history.pop();
  renderCrashHistory();

  if (CRASH.betPlaced && !CRASH.cashedOut) {
    const loss = CRASH.betAmount;
    showNotification(`✈️ Краш x${finalMult.toFixed(2)} — Потеряно ${fmt(loss)} ₽`, 'loss');
    addCrashRound(finalMult, 'loss', 0 - loss);
  } else if (!CRASH.betPlaced) {
    addCrashRound(finalMult, 'none', 0);
  }

  CRASH.waitTime = Math.random() > 0.5 ? 5000 : 7000;
  setTimeout(startCrashWait, 3000);
}

function doCashout() {
  if (!CRASH.betPlaced || CRASH.cashedOut || CRASH.state !== 'flying') return;
  CRASH.cashedOut = true;
  CRASH.cashoutMultiplier = CRASH.multiplier;
  const win = CRASH.betAmount * CRASH.multiplier;
  balance += win;
  updateAllBalances();
  showNotification(`✅ Выведено x${CRASH.multiplier.toFixed(2)} = +${fmt(win)} ₽`, 'win');
  setCrashBtn('waiting');
  addCrashRound(CRASH.multiplier, 'win', win - CRASH.betAmount);
  if (win - CRASH.betAmount > 200) showWinPopup('✈️', 'ВЫВОД В КРАШЕ!', '+' + fmt(win) + ' ₽');
  updateAllBalances();
}

function crashAction() {
  if (CRASH.state === 'waiting') {
    // Place bet
    const betVal = parseInt(document.getElementById('crash-bet').value);
    if (isNaN(betVal) || betVal < 10) return showNotification('Минимальная ставка 10 ₽', 'info');
    if (betVal > balance) return showNotification('Недостаточно средств!', 'loss');
    CRASH.betAmount = betVal;
    CRASH.betPlaced = true;
    balance -= betVal;
    updateAllBalances();
    setCrashBtn('placed');
    showNotification(`✈️ Ставка ${fmt(betVal)} ₽ принята!`, 'info');
  } else if (CRASH.state === 'flying') {
    doCashout();
  }
}

function setCrashBtn(mode) {
  const btn = document.getElementById('crash-bet-btn');
  const txt = document.getElementById('crash-btn-text');
  btn.disabled = false;
  btn.className = 'crash-bet-btn';
  switch (mode) {
    case 'bet':
      txt.textContent = '✈️ ПОСТАВИТЬ';
      break;
    case 'placed':
      txt.textContent = '✈️ СТАВКА ПРИНЯТА';
      btn.disabled = true;
      break;
    case 'cashout':
      txt.textContent = '💰 ВЫВЕСТИ СЕЙЧАС!';
      btn.classList.add('cashout-mode');
      break;
    case 'waiting':
      txt.textContent = '⏳ ОЖИДАНИЕ...';
      btn.disabled = true;
      break;
    case 'disabled':
      txt.textContent = '⏳ ОЖИДАНИЕ...';
      btn.disabled = true;
      break;
  }
}

function setMult(text, state) {
  const el = document.getElementById('crash-multiplier');
  el.textContent = text;
  el.className = 'crash-multiplier';
  if (state === 'crashed') el.classList.add('crashed');
  if (state === 'waiting') el.classList.add('waiting');
}
function setStatus(text) {
  document.getElementById('crash-status').textContent = text;
}

function showPlane(visible) {
  document.getElementById('crash-plane').style.display = visible ? 'block' : 'none';
}
function showCrashExplosion() {
  const el = document.getElementById('crash-explosion');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 800);
}
function hideCrashExplosion() {
  document.getElementById('crash-explosion').style.display = 'none';
}

function movePlane() {
  const plane = document.getElementById('crash-plane');
  const canvas = CRASH.canvas;
  if (!plane || !canvas) return;
  const progress = Math.min((CRASH.multiplier - 1) / (CRASH.targetCrash - 1 || 1), 0.9);
  const maxW = canvas.width - 60;
  const maxH = canvas.height - 80;
  const x = 40 + progress * (maxW - 40);
  const y = maxH - progress * (maxH - 80);
  plane.style.left = x + 'px';
  plane.style.bottom = (canvas.height - y) + 'px';
  // Tilt plane based on angle
  const angle = -30 + progress * -10;
  plane.style.transform = `rotate(${angle}deg)`;
}

function updateCrashPotential() {
  const bet = parseInt(document.getElementById('crash-bet').value) || 0;
  const auto = parseFloat(document.getElementById('auto-cashout').value) || 2;
  const potential = bet * auto;
  document.getElementById('crash-potential-amt').textContent = fmt(potential) + ' ₽';
}

// CRASH CHART DRAWING
function drawCrashEmpty() {
  const c = CRASH.canvas;
  if (!c) return;
  const ctx = CRASH.ctx;
  ctx.clearRect(0, 0, c.width, c.height);
  drawCrashGrid(ctx, c.width, c.height);
}

function drawCrashChart() {
  const c = CRASH.canvas;
  if (!c || CRASH.points.length < 2) return;
  const ctx = CRASH.ctx;
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  drawCrashGrid(ctx, W, H);

  const pad = { left: 60, bottom: 40, right: 20, top: 20 };
  const gW = W - pad.left - pad.right;
  const gH = H - pad.top - pad.bottom;

  const maxT = Math.max(CRASH.points[CRASH.points.length - 1].t, 5);
  const maxM = Math.max(CRASH.points[CRASH.points.length - 1].m, 2) * 1.1;

  function toX(t) { return pad.left + (t / maxT) * gW; }
  function toY(m) { return H - pad.bottom - ((m - 1) / (maxM - 1)) * gH; }

  // Draw gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, 'rgba(0,230,118,0.25)');
  gradient.addColorStop(1, 'rgba(0,230,118,0.02)');
  ctx.beginPath();
  ctx.moveTo(toX(CRASH.points[0].t), toY(CRASH.points[0].m));
  for (let i = 1; i < CRASH.points.length; i++) {
    ctx.lineTo(toX(CRASH.points[i].t), toY(CRASH.points[i].m));
  }
  ctx.lineTo(toX(CRASH.points[CRASH.points.length - 1].t), H - pad.bottom);
  ctx.lineTo(toX(CRASH.points[0].t), H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  ctx.moveTo(toX(CRASH.points[0].t), toY(CRASH.points[0].m));
  for (let i = 1; i < CRASH.points.length; i++) {
    ctx.lineTo(toX(CRASH.points[i].t), toY(CRASH.points[i].m));
  }
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw dot at tip
  const last = CRASH.points[CRASH.points.length - 1];
  ctx.beginPath();
  ctx.arc(toX(last.t), toY(last.m), 6, 0, Math.PI * 2);
  ctx.fillStyle = '#00e676';
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Y axis labels
  ctx.fillStyle = 'rgba(144,164,174,0.7)';
  ctx.font = '11px Rajdhani';
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const m = 1 + (maxM - 1) * (i / steps);
    const y = toY(m);
    ctx.fillText(m.toFixed(1) + 'x', 4, y + 4);
    ctx.beginPath();
    ctx.moveTo(pad.left - 6, y);
    ctx.lineTo(pad.left, y);
    ctx.strokeStyle = 'rgba(144,164,174,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCrashGrid(ctx, W, H) {
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  const cols = 8, rows = 6;
  for (let i = 0; i <= cols; i++) {
    const x = (W / cols) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let i = 0; i <= rows; i++) {
    const y = (H / rows) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

function renderCrashHistory() {
  const el = document.getElementById('crash-history');
  if (!el) return;
  el.innerHTML = '';
  CRASH.history.forEach(m => {
    const div = document.createElement('div');
    div.className = 'crash-hist-item';
    if (m < 1.5) div.classList.add('hist-low');
    else if (m < 3) div.classList.add('hist-mid');
    else if (m < 10) div.classList.add('hist-high');
    else div.classList.add('hist-mega');
    div.textContent = m.toFixed(2) + 'x';
    el.appendChild(div);
  });
}

function addCrashRound(mult, outcome, profit) {
  const list = document.getElementById('crash-rounds-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'round-item';
  const profitText = profit !== 0 ? (profit > 0 ? '+' + fmt(profit) : fmt(profit)) + ' ₽' : '';
  const cls = outcome === 'win' ? 'ri-win' : outcome === 'loss' ? 'ri-loss' : '';
  item.innerHTML = `
    <span style="color:var(--text2);font-size:12px">${new Date().toLocaleTimeString('ru-RU')}</span>
    <span class="ri-mult" style="color:${mult < 2 ? 'var(--red)' : mult < 5 ? 'var(--gold)' : 'var(--green)'}">${mult.toFixed(2)}x</span>
    <span class="ri-result ${cls}">${profitText}</span>
  `;
  list.insertBefore(item, list.firstChild);
  if (list.children.length > 10) list.removeChild(list.lastChild);
}

// ──────────────────────────────────────────────────────────
// ███████╗██╗      ██████╗ ████████╗███████╗
// ██╔════╝██║     ██╔═══██╗╚══██╔══╝██╔════╝
// ███████╗██║     ██║   ██║   ██║   ███████╗
// ╚════██║██║     ██║   ██║   ██║   ╚════██║
// ███████║███████╗╚██████╔╝   ██║   ███████║
// ╚══════╝╚══════╝ ╚═════╝    ╚═╝   ╚══════╝
// ──────────────────────────────────────────────────────────
const SYMBOLS = [
  { sym: '💎', name: 'Алмаз',    weight: 1,  mult5: 500, mult4: 100, mult3: 25  },
  { sym: '🔔', name: 'Колокол',  weight: 2,  mult5: 200, mult4:  50, mult3: 15  },
  { sym: '⭐', name: 'Звезда',   weight: 3,  mult5: 100, mult4:  30, mult3: 10  },
  { sym: '🍒', name: 'Вишня',    weight: 5,  mult5:  50, mult4:  15, mult3:  5  },
  { sym: '🍋', name: 'Лимон',    weight: 6,  mult5:  40, mult4:  12, mult3:  4  },
  { sym: '🍊', name: 'Апельсин', weight: 6,  mult5:  35, mult4:  10, mult3:  3  },
  { sym: '🍇', name: 'Виноград', weight: 7,  mult5:  30, mult4:   8, mult3:  3  },
  { sym: '🎯', name: 'Цель',     weight: 4,  mult5:  75, mult4:  20, mult3:  8  },
  { sym: '💰', name: 'Мешок',    weight: 3,  mult5: 125, mult4:  35, mult3: 12  },
  { sym: '🎪', name: 'WILD',     weight: 2,  mult5: 300, mult4:  75, mult3: 20, isWild: true },
];

// Build weighted pool
const SYMBOL_POOL = [];
SYMBOLS.forEach((s, i) => {
  for (let j = 0; j < s.weight; j++) SYMBOL_POOL.push(i);
});

// Slot lines (5 reels × 3 rows = positions [reel][row])
const PAYLINES = [
  [1, 1, 1, 1, 1],   // Line 1: middle row
  [0, 0, 0, 0, 0],   // Line 2: top row
  [2, 2, 2, 2, 2],   // Line 3: bottom row
  [0, 1, 2, 1, 0],   // Line 4: V shape
  [2, 1, 0, 1, 2],   // Line 5: inverted V
];

const SLOTS = {
  spinning: false,
  autoSpin: false,
  autoTimer: null,
  activeLines: 3,
  grid: [],           // grid[reel][row] = symbolIndex
  reelStrips: [],     // Each reel has a long strip of symbols
};

function initSlots() {
  // Build reel strips
  for (let r = 0; r < 5; r++) {
    const strip = [];
    for (let i = 0; i < 40; i++) {
      strip.push(SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]);
    }
    SLOTS.reelStrips.push(strip);
  }
  // Init grid
  for (let r = 0; r < 5; r++) {
    SLOTS.grid.push([0, 1, 2].map(() => Math.floor(Math.random() * SYMBOLS.length)));
  }
  renderReels();
  buildPaytable();
  updateTotalBet();
  document.getElementById('slots-bet').addEventListener('input', updateTotalBet);
  // Init lights
  initSlotLights('slot-lights-top');
  initSlotLights('slot-lights-bot');
}

function initSlotLights(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    el.appendChild(s);
  }
}

function randomSymbol() {
  return SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
}

function renderReels(winCells = []) {
  for (let r = 0; r < 5; r++) {
    const inner = document.getElementById('reel-' + r);
    if (!inner) continue;
    inner.innerHTML = '';
    for (let row = 0; row < 3; row++) {
      const symIdx = SLOTS.grid[r][row];
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.id = `sym-${r}-${row}`;
      div.textContent = SYMBOLS[symIdx].sym;
      if (winCells.some(c => c[0] === r && c[1] === row)) {
        div.classList.add('winning');
      }
      inner.appendChild(div);
    }
  }
}

function updateTotalBet() {
  const bet = parseInt(document.getElementById('slots-bet').value) || 0;
  const total = bet * SLOTS.activeLines;
  document.getElementById('total-bet-display').textContent = total.toLocaleString('ru-RU');
}

function setLines(n) {
  SLOTS.activeLines = n;
  document.querySelectorAll('.lines-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('lines-btn-' + n).classList.add('active');
  // Show/hide win line indicators
  document.querySelectorAll('.wl').forEach(el => {
    const line = parseInt(el.dataset.line);
    el.classList.toggle('active-line', line <= n);
  });
  updateTotalBet();
  // Show active paylines
  updatePaylineDisplay([]);
}

function updatePaylineDisplay(activeLines) {
  ['payline-top', 'payline-mid', 'payline-bot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  activeLines.forEach(lineIdx => {
    if (lineIdx === 0) document.getElementById('payline-mid').classList.add('active');
    if (lineIdx === 1) document.getElementById('payline-top').classList.add('active');
    if (lineIdx === 2) document.getElementById('payline-bot').classList.add('active');
  });
}

function toggleAutoSpin() {
  SLOTS.autoSpin = !SLOTS.autoSpin;
  const btn = document.getElementById('auto-spin-btn');
  btn.classList.toggle('active', SLOTS.autoSpin);
  btn.textContent = SLOTS.autoSpin ? 'STOP' : 'AUTO';
  if (SLOTS.autoSpin && !SLOTS.spinning) doAutoSpin();
}

function doAutoSpin() {
  if (!SLOTS.autoSpin) return;
  spinSlot(() => {
    if (SLOTS.autoSpin) SLOTS.autoTimer = setTimeout(doAutoSpin, 1200);
  });
}

function spinSlot(callback) {
  if (SLOTS.spinning) return;
  const betPerLine = parseInt(document.getElementById('slots-bet').value) || 10;
  const totalBet = betPerLine * SLOTS.activeLines;
  if (totalBet > balance) {
    showNotification('Недостаточно средств!', 'loss');
    if (SLOTS.autoSpin) toggleAutoSpin();
    return;
  }
  balance -= totalBet;
  updateAllBalances();
  SLOTS.spinning = true;
  document.getElementById('spin-btn').disabled = true;
  document.getElementById('slot-win-amount').textContent = '';
  document.getElementById('slot-win-text').textContent = '';
  updatePaylineDisplay([]);

  // Generate result
  const newGrid = [];
  for (let r = 0; r < 5; r++) {
    newGrid.push([randomSymbol(), randomSymbol(), randomSymbol()]);
  }

  // Animate reels sequentially
  const promises = [];
  for (let r = 0; r < 5; r++) {
    promises.push(animateReel(r, newGrid[r], r * 150));
  }
  Promise.all(promises).then(() => {
    SLOTS.grid = newGrid;
    SLOTS.spinning = false;
    document.getElementById('spin-btn').disabled = false;
    evaluateWin(betPerLine);
    if (callback) callback();
  });
}

function animateReel(reelIdx, finalSymbols, delay) {
  return new Promise(resolve => {
    const inner = document.getElementById('reel-' + reelIdx);
    if (!inner) { resolve(); return; }

    setTimeout(() => {
      // Build spinning strip: random symbols + final 3
      const spinSymbols = [];
      const spinCount = 16 + reelIdx * 4; // More spin for later reels = cascade effect
      for (let i = 0; i < spinCount; i++) {
        spinSymbols.push(SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]);
      }
      spinSymbols.push(...finalSymbols);

      let frame = 0;
      const totalFrames = spinSymbols.length - 3;
      const baseInterval = 45;
      const slowdownStart = totalFrames - 6;

      const tick = () => {
        if (frame > totalFrames) { resolve(); return; }
        // Render current 3 visible symbols
        const visible = spinSymbols.slice(frame, frame + 3);
        inner.innerHTML = '';
        visible.forEach(symIdx => {
          const div = document.createElement('div');
          div.className = 'reel-symbol';
          div.textContent = SYMBOLS[symIdx].sym;
          inner.appendChild(div);
        });
        frame++;
        // Slow down near end
        const slowFactor = frame >= slowdownStart ? 1 + (frame - slowdownStart) * 0.4 : 1;
        setTimeout(tick, baseInterval * slowFactor);
      };
      tick();
    }, delay);
  });
}

function evaluateWin(betPerLine) {
  let totalWin = 0;
  const winLines = [];
  const winCells = [];

  for (let lineIdx = 0; lineIdx < SLOTS.activeLines; lineIdx++) {
    const pattern = PAYLINES[lineIdx];
    const lineSymbols = pattern.map((row, reel) => SLOTS.grid[reel][row]);
    const { win, count, symIdx } = evaluateLine(lineSymbols);
    if (win > 0) {
      const lineWin = betPerLine * win;
      totalWin += lineWin;
      winLines.push(lineIdx);
      // Mark winning cells
      for (let r = 0; r < count; r++) {
        winCells.push([r, pattern[r]]);
      }
    }
  }

  renderReels(winCells);

  if (totalWin > 0) {
    balance += totalWin;
    updateAllBalances();
    const winText = getWinText(totalWin, betPerLine * SLOTS.activeLines);
    document.getElementById('slot-win-text').textContent = winText;
    document.getElementById('slot-win-amount').textContent = '+' + fmt(totalWin) + ' ₽';
    updatePaylineDisplay(winLines);
    const mult = totalWin / (betPerLine * SLOTS.activeLines);
    if (mult >= 10) showWinPopup('🎰', winText, '+' + fmt(totalWin) + ' ₽');
    else showNotification(`🎰 ${winText} +${fmt(totalWin)} ₽`, 'win');
    addSlotRecent(winCells, mult, totalWin);
    showNotification(`🎰 +${fmt(totalWin)} ₽`, 'win');
  } else {
    document.getElementById('slot-win-text').textContent = '';
    document.getElementById('slot-win-amount').textContent = '';
  }
}

function evaluateLine(lineSymbols) {
  // Count matching from left (WILD counts as any)
  const first = lineSymbols[0];
  const isWildFirst = SYMBOLS[first].isWild;
  let matchSym = isWildFirst ? -1 : first;
  let count = 1;

  for (let i = 1; i < lineSymbols.length; i++) {
    const cur = lineSymbols[i];
    const isWildCur = SYMBOLS[cur].isWild;
    if (isWildCur || cur === matchSym || matchSym === -1) {
      if (matchSym === -1 && !isWildCur) matchSym = cur;
      count++;
    } else break;
  }

  if (count < 3) return { win: 0, count: 0, symIdx: -1 };
  const sym = matchSym === -1 ? lineSymbols.find(s => !SYMBOLS[s].isWild) ?? 9 : matchSym;
  const s = SYMBOLS[sym];
  let mult = 0;
  if (count === 3) mult = s.mult3;
  else if (count === 4) mult = s.mult4;
  else if (count === 5) mult = s.mult5;
  return { win: mult, count, symIdx: sym };
}

function getWinText(win, bet) {
  const mult = win / bet;
  if (mult >= 100) return '🔥🔥🔥 MEGA WIN!!!';
  if (mult >= 50) return '💎 BIG WIN!!';
  if (mult >= 20) return '⭐ GREAT WIN!';
  if (mult >= 5) return '🎉 WIN!';
  return '✨ Выигрыш';
}

function buildPaytable() {
  const container = document.getElementById('paytable-items');
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...SYMBOLS].sort((a, b) => b.mult5 - a.mult5);
  sorted.forEach(s => {
    const item = document.createElement('div');
    item.className = 'pt-item';
    item.innerHTML = `
      <span class="pt-symbols">${s.sym}${s.sym}${s.sym}</span>
      <div style="font-size:11px;color:var(--text2)">x3: <span style="color:var(--text)">${s.mult3}</span> | x4: <span style="color:var(--text)">${s.mult4}</span></div>
      <span class="pt-mult">x5: ${s.mult5}x</span>
    `;
    container.appendChild(item);
  });
}

function addSlotRecent(winCells, mult, winAmt) {
  const list = document.getElementById('slot-recent-wins');
  if (!list) return;
  // Build symbol display from win cells (first reel)
  const symbols = SLOTS.grid.map((col, r) => SYMBOLS[col[1]].sym).join('');
  const item = document.createElement('div');
  item.className = 'sr-item';
  item.innerHTML = `
    <span class="sr-symbols">${symbols}</span>
    <span class="sr-mult">x${mult.toFixed(1)}</span>
    <span class="sr-win">+${fmt(winAmt)} ₽</span>
  `;
  list.insertBefore(item, list.firstChild);
  if (list.children.length > 10) list.removeChild(list.lastChild);
  addFeedItem();
}

// ──────────────────────────────────────────────────────────
// WIN POPUP & CONFETTI
// ──────────────────────────────────────────────────────────
function showWinPopup(icon, title, amount) {
  document.getElementById('win-popup-icon').textContent = icon;
  document.getElementById('win-popup-title').textContent = title;
  document.getElementById('win-popup-amount').textContent = amount;
  document.getElementById('win-popup').classList.add('show');
  document.getElementById('win-popup-overlay').classList.add('show');
  launchConfetti();
}
function closeWinPopup() {
  document.getElementById('win-popup').classList.remove('show');
  document.getElementById('win-popup-overlay').classList.remove('show');
}
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#f5c842','#ff1744','#00e676','#00e5ff','#7c4dff','#ff9800'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:${Math.random() * 100}%;
      top:${-10 + Math.random() * 10}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      width:${4 + Math.random() * 8}px;
      height:${4 + Math.random() * 8}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay:${Math.random() * 0.5}s;
      animation-duration:${1 + Math.random() * 1}s;
    `;
    container.appendChild(piece);
  }
}

// ──────────────────────────────────────────────────────────
// POPULATE CRASH HISTORY (fake initial data)
// ──────────────────────────────────────────────────────────
function populateInitialHistory() {
  const initHist = [];
  for (let i = 0; i < 15; i++) {
    initHist.push(generateCrashPoint());
  }
  CRASH.history = initHist.map(v => Math.round(v * 100) / 100);
  renderCrashHistory();
}

// ──────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateAllBalances();
  initParticles();
  initCrash();
  populateInitialHistory();
  initSlots();
  setLines(3);

  // Live feed
  for (let i = 0; i < 6; i++) addFeedItem();
  setInterval(addFeedItem, 4000);
  setInterval(updateStats, 8000);

  // Keyboard shortcut: Space to cashout in crash
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && currentSection === 'crash') {
      e.preventDefault();
      if (CRASH.state === 'flying' && CRASH.betPlaced && !CRASH.cashedOut) doCashout();
    }
    if (e.code === 'Space' && currentSection === 'slots') {
      e.preventDefault();
      spinSlot();
    }
  });
});
