// --- ИГРОВЫЕ ДАННЫЕ (СОХРАНЕНИЯ) ---
const SAVE_KEY = 'phoneGetSave';
const SAVE_VERSION = 4;

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function defaultGameData() {
    return {
        v: SAVE_VERSION,
        balance: 0,
        clickPower: 1, // base tap value (upgrades add on top)
        // inventory: [{ id: number, qty: number }]
        inventory: [],
        upgrades: {
            clickPowerLevel: 0,
            critLevel: 0,
            autoTapLevel: 0
        },
        lastDailyClaimTs: 0,
        marketEvent: null,
        stats: {
            casesOpened: 0
        }
    };
}

function migrateSave(save) {
    if (!save || typeof save !== 'object') return defaultGameData();

    // v1 -> v2: inventory раньше был массивом объектов телефонов, income хранился отдельно
    const v = Number(save.v || 1);
    if (v === 1) {
        const inv = Array.isArray(save.inventory) ? save.inventory : [];
        const inventory = [];
        for (const item of inv) {
            const id = Number(item?.id);
            if (!Number.isFinite(id)) continue;
            const existing = inventory.find(x => x.id === id);
            if (existing) existing.qty += 1;
            else inventory.push({ id, qty: 1 });
        }

        return {
            v: SAVE_VERSION,
            balance: Number(save.balance) || 0,
            clickPower: Number(save.clickPower) || 1,
            inventory
        };
    }

    // v2+ (нормализация + новые поля по умолчанию)
    const inventory = Array.isArray(save.inventory) ? save.inventory : [];
    const normalizedInv = [];
    for (const it of inventory) {
        const id = Number(it?.id);
        const qty = Math.max(1, Math.floor(Number(it?.qty) || 1));
        if (!Number.isFinite(id)) continue;
        const existing = normalizedInv.find(x => x.id === id);
        if (existing) existing.qty += qty;
        else normalizedInv.push({ id, qty });
    }

    const upgrades = (save.upgrades && typeof save.upgrades === 'object') ? save.upgrades : {};
    const normalizedUpgrades = {
        clickPowerLevel: Math.max(0, Math.floor(Number(upgrades.clickPowerLevel) || 0)),
        critLevel: Math.max(0, Math.floor(Number(upgrades.critLevel) || 0)),
        autoTapLevel: Math.max(0, Math.floor(Number(upgrades.autoTapLevel) || 0))
    };

    const lastDailyClaimTs = Number(save.lastDailyClaimTs) || 0;
    const marketEvent = save.marketEvent && typeof save.marketEvent === 'object' ? save.marketEvent : null;
    const stats = (save.stats && typeof save.stats === 'object') ? save.stats : {};
    const normalizedStats = {
        casesOpened: Math.max(0, Math.floor(Number(stats.casesOpened) || 0))
    };

    return {
        v: SAVE_VERSION,
        balance: Number(save.balance) || 0,
        clickPower: Number(save.clickPower) || 1,
        inventory: normalizedInv,
        upgrades: normalizedUpgrades,
        lastDailyClaimTs,
        marketEvent,
        stats: normalizedStats
    };
}

let gameData = migrateSave(loadGame()) || defaultGameData();

// База данных всех телефонов (можно расширять до бесконечности)
const phonesDB = [
    {
        id: 1,
        name: "Nokia 3310",
        price: 60,
        income: 1,
        rarity: "common",
        icon: "🧱",
        img: "https://upload.wikimedia.org/wikipedia/commons/1/15/Nokia_3310_mobile_phone.jpg"
    },
    {
        id: 2,
        name: "iPhone 4S",
        price: 350,
        income: 6,
        rarity: "common",
        icon: "📱",
        img: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Black_iPhone_4s.jpg"
    },
    {
        id: 3,
        name: "Samsung S10",
        price: 1800,
        income: 28,
        rarity: "rare",
        icon: "🌌",
        img: "https://upload.wikimedia.org/wikipedia/commons/7/71/Samsung_Galaxy_S10.png"
    },
    {
        id: 4,
        name: "iPhone 15 Pro",
        price: 6500,
        income: 110,
        rarity: "rare",
        icon: "🍎",
        img: "https://upload.wikimedia.org/wikipedia/commons/c/ca/IPhone_15_Pro_%26_iPhone_15_Pro_Max.jpg"
    },
    {
        id: 5,
        name: "Золотой Vertu",
        price: 30000,
        income: 650,
        rarity: "legendary",
        icon: "💎",
        img: "https://upload.wikimedia.org/wikipedia/commons/8/88/Vertu_mobile.jpg"
    }
];

// --- ИНТЕРФЕЙС И ТАБЫ ---
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const dailyBtn = document.getElementById('daily-btn');
const dailyHintEl = document.getElementById('daily-hint');
const upgradesListEl = document.getElementById('upgrades-list');
const openCaseBtn = document.getElementById('open-case-btn');
const caseCostHintEl = document.getElementById('case-cost-hint');
const caseResultEl = document.getElementById('case-result');
const rouletteEl = document.getElementById('roulette');
const rouletteTrackEl = document.getElementById('roulette-track');

const moneyFmt = new Intl.NumberFormat('ru-RU');
function formatMoney(n) {
    return moneyFmt.format(Math.floor(Number(n) || 0));
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function createPhoneMedia(phone) {
    if (phone?.img) {
        const img = document.createElement('img');
        img.className = 'phone-img';
        img.src = phone.img;
        img.alt = phone?.name ? `${phone.name}` : 'Телефон';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => {
            const fallback = document.createElement('span');
            fallback.className = 'phone-emoji';
            fallback.textContent = phone?.icon || '📱';
            img.replaceWith(fallback);
        }, { once: true });
        return img;
    }

    const fallback = document.createElement('span');
    fallback.className = 'phone-emoji';
    fallback.textContent = phone?.icon || '📱';
    return fallback;
}

function getUpgradeLevel(key) {
    const u = gameData.upgrades || {};
    return Math.max(0, Math.floor(Number(u[key]) || 0));
}

function setUpgradeLevel(key, value) {
    if (!gameData.upgrades || typeof gameData.upgrades !== 'object') gameData.upgrades = {};
    gameData.upgrades[key] = Math.max(0, Math.floor(Number(value) || 0));
}

function getClickPower() {
    const base = Math.max(1, Math.floor(Number(gameData.clickPower) || 1));
    const lvl = getUpgradeLevel('clickPowerLevel');
    return base + lvl;
}

function getCritChance() {
    const lvl = getUpgradeLevel('critLevel');
    // 2% base at level 0? keep it simple: 0% -> up to 20%
    return clamp(lvl * 0.02, 0, 0.2);
}

function getCritMultiplier() {
    return 5;
}

function getAutoTapPerSecond() {
    const lvl = getUpgradeLevel('autoTapLevel');
    return clamp(lvl, 0, 20);
}

function getIncomePerSecond() {
    let income = 0;
    for (const it of gameData.inventory) {
        const phone = phonesDB.find(p => p.id === it.id);
        if (!phone) continue;
        income += phone.income * it.qty;
    }
    return income;
}

const upgradesDB = [
    {
        id: 'clickPower',
        title: 'Усилитель тапа',
        desc: 'Увеличивает доход за тап на +1 за уровень.',
        key: 'clickPowerLevel',
        baseCost: 200,
        costMult: 1.6,
        maxLevel: 200
    },
    {
        id: 'crit',
        title: 'Крит-тап',
        desc: 'Шанс крит-тапа (x5) +2% за уровень (до 20%).',
        key: 'critLevel',
        baseCost: 500,
        costMult: 1.7,
        maxLevel: 10
    },
    {
        id: 'autoTap',
        title: 'Авто-тап',
        desc: 'Авто-тапов в секунду +1 за уровень.',
        key: 'autoTapLevel',
        baseCost: 800,
        costMult: 1.8,
        maxLevel: 20
    }
];

function getUpgradeCost(u) {
    const lvl = getUpgradeLevel(u.key);
    return Math.floor(u.baseCost * Math.pow(u.costMult, lvl));
}

function buyUpgrade(upgradeId) {
    const u = upgradesDB.find(x => x.id === upgradeId);
    if (!u) return;

    const lvl = getUpgradeLevel(u.key);
    if (lvl >= u.maxLevel) return;

    const cost = getUpgradeCost(u);
    if (gameData.balance < cost) return;

    gameData.balance -= cost;
    setUpgradeLevel(u.key, lvl + 1);
    updateUI();
    renderUpgrades();
    renderMarket();
}

function renderUpgrades() {
    if (!upgradesListEl) return;
    upgradesListEl.innerHTML = '';

    for (const u of upgradesDB) {
        const lvl = getUpgradeLevel(u.key);
        const cost = getUpgradeCost(u);
        const isMax = lvl >= u.maxLevel;

        const row = document.createElement('div');
        row.className = 'upgrade-card';

        const info = document.createElement('div');
        info.className = 'upgrade-info';

        const h = document.createElement('h3');
        h.textContent = `${u.title} `;
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = `ур. ${lvl}${isMax ? ' (MAX)' : ''}`;
        h.appendChild(pill);

        const p = document.createElement('p');
        p.textContent = u.desc;

        info.appendChild(h);
        info.appendChild(p);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'buy-btn';
        btn.dataset.upgradeId = u.id;
        btn.disabled = isMax || gameData.balance < cost;
        btn.textContent = isMax ? 'Куплено' : `${formatMoney(cost)} ₽`;

        row.appendChild(info);
        row.appendChild(btn);
        upgradesListEl.appendChild(row);
    }
}

if (upgradesListEl) {
    upgradesListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button.buy-btn');
        if (!btn) return;
        const id = btn.dataset.upgradeId;
        if (!id) return;
        buyUpgrade(id);
    });
}

function updateUI() {
    balanceEl.innerText = formatMoney(gameData.balance);
    incomeEl.innerText = formatMoney(getIncomePerSecond());
    scheduleSave();
    updateDailyUI();
    updateCasesUI();
}

function saveGameNow() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
    } catch {
        // no-op
    }
}

let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveGameNow();
    }, 800);
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGameNow();
});

// --- ЕЖЕДНЕВНЫЙ БОНУС ---
const DAY_MS = 24 * 60 * 60 * 1000;

function getDailyBonusAmount() {
    // бонус масштабируется от дохода, но не слишком резко
    const income = getIncomePerSecond();
    const scaled = income * 120; // 2 минуты дохода
    return Math.max(200, Math.floor(scaled));
}

function getDailyRemainingMs() {
    const last = Number(gameData.lastDailyClaimTs) || 0;
    const next = last + DAY_MS;
    const now = Date.now();
    return Math.max(0, next - now);
}

function canClaimDaily() {
    return getDailyRemainingMs() === 0;
}

function claimDaily() {
    if (!canClaimDaily()) return;
    const amt = getDailyBonusAmount();
    gameData.balance += amt;
    gameData.lastDailyClaimTs = Date.now();
    updateUI();
    renderMarket();
}

function formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
}

function updateDailyUI() {
    if (!dailyBtn || !dailyHintEl) return;
    const rem = getDailyRemainingMs();
    if (rem === 0) {
        dailyBtn.disabled = false;
        dailyHintEl.textContent = `Доступно: +${formatMoney(getDailyBonusAmount())} ₽`;
    } else {
        dailyBtn.disabled = true;
        dailyHintEl.textContent = `Можно через ${formatTime(rem)}`;
    }
}

if (dailyBtn) {
    dailyBtn.addEventListener('click', () => {
        if (!canClaimDaily()) return;
        claimDaily();
    });
}

// Переключение вкладок
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Убираем активный класс у всех
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        
        // Включаем нужный
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.tab).classList.remove('hidden');
        
        if(e.target.dataset.tab === 'inventory') renderInventory();
        if(e.target.dataset.tab === 'avito') renderMarket();
    });
});

// --- МЕХАНИКА КЛИКЕРА ---
const clicker = document.getElementById('clicker');
clicker.addEventListener('click', (e) => {
    const base = getClickPower();
    const isCrit = Math.random() < getCritChance();
    const gain = isCrit ? base * getCritMultiplier() : base;

    gameData.balance += gain;
    updateUI();

    // Анимация вылетающих цифр
    const floatTxt = document.createElement('div');
    floatTxt.classList.add('floating-text');
    floatTxt.innerText = `+${gain}${isCrit ? '!' : ''}`;
    
    // Позиция клика
    const rect = clicker.getBoundingClientRect();
    floatTxt.style.left = `${e.clientX - rect.left}px`;
    floatTxt.style.top = `${e.clientY - rect.top}px`;
    
    clicker.appendChild(floatTxt);
    
    // Удаляем элемент после анимации
    setTimeout(() => floatTxt.remove(), 1000);
});

// --- МЕХАНИКА АВИТО (Генератор рынка) ---
const rarityWeights = {
    common: 70,
    rare: 25,
    legendary: 5
};

// --- GACHA / КЕЙСЫ ---
function getCaseCost() {
    // базовая цена + лёгкое масштабирование от прогресса (кол-ва кейсов)
    const opened = Math.max(0, Math.floor(Number(gameData?.stats?.casesOpened) || 0));
    return Math.floor(500 * Math.pow(1.08, Math.min(opened, 60)));
}

function pickRarityByChance() {
    const r = Math.random() * 100;
    if (r < rarityWeights.common) return 'common';
    if (r < rarityWeights.common + rarityWeights.rare) return 'rare';
    return 'legendary';
}

function pickPhoneByRarity(rarity) {
    const pool = phonesDB.filter(p => p.rarity === rarity);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function addToInventory(phoneId, qty = 1) {
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    const existing = gameData.inventory.find(x => x.id === phoneId);
    if (existing) existing.qty += q;
    else gameData.inventory.push({ id: phoneId, qty: q });
}

function renderCaseResult(phone, rarity) {
    if (!caseResultEl) return;
    caseResultEl.innerHTML = '';

    if (!phone) {
        const empty = document.createElement('div');
        empty.className = 'case-empty';
        empty.textContent = 'Не удалось открыть кейс. Попробуй ещё раз.';
        caseResultEl.appendChild(empty);
        return;
    }

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = `case-win-title rarity-${rarity}`;
    title.textContent = `Выпало: ${phone.name}`;

    const sub = document.createElement('div');
    sub.className = 'hint';
    sub.textContent = `Редкость: ${rarity === 'common' ? 'обычный' : rarity === 'rare' ? 'редкий' : 'легендарный'} • +${formatMoney(phone.income)} ₽/сек`;

    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);

    caseResultEl.appendChild(createPhoneMedia(phone));
    caseResultEl.appendChild(titleWrap);
}

function updateCasesUI() {
    if (!openCaseBtn || !caseCostHintEl || !caseResultEl) return;
    const cost = getCaseCost();
    caseCostHintEl.textContent = `Цена: ${formatMoney(cost)} ₽`;
    openCaseBtn.disabled = gameData.balance < cost || isRouletteSpinning;

    if (caseResultEl.childNodes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'case-empty';
        empty.textContent = 'Нажми «Открыть кейс», чтобы получить телефон.';
        caseResultEl.appendChild(empty);
    }
}

let isRouletteSpinning = false;

function buildRouletteItem(phone) {
    const el = document.createElement('div');
    el.className = `roulette-item ${phone.rarity}`;
    el.appendChild(createPhoneMedia(phone));
    return el;
}

function getRoulettePoolsByRarity() {
    const pools = {
        common: phonesDB.filter(p => p.rarity === 'common'),
        rare: phonesDB.filter(p => p.rarity === 'rare'),
        legendary: phonesDB.filter(p => p.rarity === 'legendary')
    };
    return pools;
}

function pickAnyFrom(pool) {
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function spinRouletteAndGrant(winPhone, winRarity) {
    if (!rouletteEl || !rouletteTrackEl) {
        // fallback: если UI не найден — просто выдать приз
        addToInventory(winPhone.id, 1);
        updateUI();
        renderInventory();
        renderMarket();
        renderCaseResult(winPhone, winRarity);
        return;
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        addToInventory(winPhone.id, 1);
        updateUI();
        renderInventory();
        renderMarket();
        renderCaseResult(winPhone, winRarity);
        return;
    }

    isRouletteSpinning = true;
    updateCasesUI();

    rouletteEl.classList.remove('roulette-spinning');
    rouletteTrackEl.style.transition = 'none';
    rouletteTrackEl.style.transform = 'translate3d(0,0,0)';
    rouletteTrackEl.innerHTML = '';

    const pools = getRoulettePoolsByRarity();
    const length = 42;
    const winIndex = 34; // ближе к концу, чтобы было ощущение "докрутки"

    const sequence = [];
    for (let i = 0; i < length; i++) {
        if (i === winIndex) {
            sequence.push(winPhone);
            continue;
        }
        const rarity = pickRarityByChance();
        const phone = pickAnyFrom(pools[rarity]) || pickAnyFrom(phonesDB);
        if (phone) sequence.push(phone);
    }

    // Рендер элементов
    for (const p of sequence) rouletteTrackEl.appendChild(buildRouletteItem(p));

    // Даем браузеру применить layout
    const firstItem = rouletteTrackEl.querySelector('.roulette-item');
    const itemW = firstItem ? firstItem.getBoundingClientRect().width : 86;
    const gap = 10;
    const containerW = rouletteEl.getBoundingClientRect().width;
    const windowCenter = containerW / 2;

    const targetCenterX = (winIndex * (itemW + gap)) + (itemW / 2) + 10; // +padding-left
    const jitter = (Math.random() * 18) - 9; // небольшая "человечность"
    const translateX = -(targetCenterX - windowCenter) + jitter;

    requestAnimationFrame(() => {
        rouletteEl.classList.add('roulette-spinning');
        rouletteTrackEl.style.transition = '';
        rouletteTrackEl.style.transform = `translate3d(${translateX}px, 0, 0)`;
    });

    const spinMs = 3200;
    setTimeout(() => {
        // Выдача приза по окончании анимации
        addToInventory(winPhone.id, 1);
        updateUI();
        renderInventory();
        renderMarket();
        renderCaseResult(winPhone, winRarity);

        isRouletteSpinning = false;
        updateCasesUI();
    }, spinMs + 60);
}

function openCase() {
    const cost = getCaseCost();
    if (isRouletteSpinning) return;
    if (gameData.balance < cost) return;

    const rarity = pickRarityByChance();
    const phone = pickPhoneByRarity(rarity);
    if (!phone) return;

    gameData.balance -= cost;
    if (!gameData.stats || typeof gameData.stats !== 'object') gameData.stats = { casesOpened: 0 };
    gameData.stats.casesOpened = Math.max(0, Math.floor(Number(gameData.stats.casesOpened) || 0)) + 1;

    // Рулетка выдаст приз по окончании спина
    spinRouletteAndGrant(phone, rarity);
}

if (openCaseBtn) {
    openCaseBtn.addEventListener('click', () => {
        openCase();
    });
}

function pickWeightedPhone() {
    const weighted = [];
    for (const p of phonesDB) {
        const w = rarityWeights[p.rarity] ?? 1;
        weighted.push({ p, w: Math.max(0, w) });
    }
    const total = weighted.reduce((s, x) => s + x.w, 0);
    if (total <= 0) return phonesDB[Math.floor(Math.random() * phonesDB.length)];
    let r = Math.random() * total;
    for (const x of weighted) {
        r -= x.w;
        if (r <= 0) return x.p;
    }
    return weighted[weighted.length - 1].p;
}

let currentMarket = [];

function buildMarketLots(count = 3) {
    const lots = [];
    const used = new Set();
    while (lots.length < count && used.size < phonesDB.length) {
        const p = pickWeightedPhone();
        if (used.has(p.id)) continue;
        used.add(p.id);
        lots.push(p);
    }
    return lots;
}

function renderMarket() {
    const marketList = document.getElementById('market-list');
    marketList.innerHTML = '';

    for (const phone of currentMarket) {
        const card = document.createElement('div');
        card.className = `card ${phone.rarity}`;

        const info = document.createElement('div');
        info.className = 'card-info';
        const title = document.createElement('h3');
        title.appendChild(createPhoneMedia(phone));
        title.appendChild(document.createTextNode(` ${phone.name}`));

        const p1 = document.createElement('p');
        p1.textContent = `Доход: +${formatMoney(phone.income)} ₽/сек`;

        const p2 = document.createElement('p');
        p2.textContent = 'Состояние: Б/У';

        info.appendChild(title);
        info.appendChild(p1);
        info.appendChild(p2);

        const price = getMarketPrice(phone);

        const btn = document.createElement('button');
        btn.className = 'buy-btn';
        btn.dataset.buyId = String(phone.id);
        btn.innerText = `${formatMoney(price)} ₽`;
        btn.disabled = gameData.balance < price;

        card.appendChild(info);
        card.appendChild(btn);
        marketList.appendChild(card);
    }
}

function generateMarket() {
    currentMarket = buildMarketLots(3);
    maybeStartMarketEvent();
    renderMarket();
}

document.getElementById('market-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button.buy-btn');
    if (!btn) return;
    const id = Number(btn.dataset.buyId);
    if (!Number.isFinite(id)) return;
    buyPhone(id);
});

// Функция покупки
function buyPhone(id) {
    const phone = phonesDB.find(p => p.id === id);
    if (!phone) return;
    const price = getMarketPrice(phone);
    if (gameData.balance >= price) {
        gameData.balance -= price;
        const existing = gameData.inventory.find(x => x.id === phone.id);
        if (existing) existing.qty += 1;
        else gameData.inventory.push({ id: phone.id, qty: 1 });
        updateUI();
        
        // Обновляем рынок сразу после покупки, чтобы лот пропал
        generateMarket(); 
        renderInventory();
    } else {
        alert("Не хватает рублей!");
    }
}

// --- ИНВЕНТАРЬ ---
function renderInventory() {
    const invList = document.getElementById('inventory-list');
    invList.innerHTML = '';
    
    if (gameData.inventory.length === 0) {
        invList.innerHTML = '<p style="text-align:center; color:gray;">У вас пока нет ферм.</p>';
        return;
    }

    gameData.inventory
        .slice()
        .sort((a, b) => (b.qty - a.qty) || (a.id - b.id))
        .forEach(entry => {
        const phone = phonesDB.find(p => p.id === entry.id);
        if (!phone) return;
        const card = document.createElement('div');
        card.className = `card ${phone.rarity}`;
        const info = document.createElement('div');
        info.className = 'card-info';

        const title = document.createElement('h3');
        title.appendChild(createPhoneMedia(phone));
        title.appendChild(document.createTextNode(` ${phone.name} `));

        const qty = document.createElement('span');
        qty.className = 'pill';
        qty.textContent = `x${entry.qty}`;
        title.appendChild(qty);

        const p = document.createElement('p');
        p.textContent = `Приносит: +${formatMoney(phone.income * entry.qty)} ₽/сек`;

        info.appendChild(title);
        info.appendChild(p);

        const badge = document.createElement('div');
        badge.className = 'inv-actions';

        const sellBtn = document.createElement('button');
        sellBtn.type = 'button';
        sellBtn.className = 'sell-btn';
        sellBtn.dataset.sellId = String(phone.id);
        sellBtn.textContent = `Продать (${formatMoney(getSellPrice(phone))} ₽)`;

        badge.appendChild(sellBtn);

        card.appendChild(info);
        card.appendChild(badge);
        invList.appendChild(card);
    });
}

function getSellPrice(phone) {
    const k = 0.6;
    return Math.max(1, Math.floor(phone.price * k));
}

function sellPhone(id) {
    const entry = gameData.inventory.find(x => x.id === id);
    if (!entry) return;
    const phone = phonesDB.find(p => p.id === id);
    if (!phone) return;

    entry.qty -= 1;
    if (entry.qty <= 0) {
        gameData.inventory = gameData.inventory.filter(x => x.id !== id);
    }

    gameData.balance += getSellPrice(phone);
    updateUI();
    renderInventory();
    renderMarket();
}

document.getElementById('inventory-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button.sell-btn');
    if (!btn) return;
    const id = Number(btn.dataset.sellId);
    if (!Number.isFinite(id)) return;
    sellPhone(id);
});

// --- СОБЫТИЕ РЫНКА: СКИДКА НА 1 ЛОТ ---
function getActiveMarketEvent() {
    const ev = gameData.marketEvent;
    if (!ev || typeof ev !== 'object') return null;
    const expiresAt = Number(ev.expiresAt) || 0;
    if (!expiresAt || Date.now() > expiresAt) return null;
    const phoneId = Number(ev.phoneId);
    if (!Number.isFinite(phoneId)) return null;
    const discountPct = clamp(Number(ev.discountPct) || 0, 0.05, 0.9);
    return { phoneId, discountPct, expiresAt };
}

function maybeStartMarketEvent() {
    // 25% шанс при обновлении рынка, если нет активного события
    if (getActiveMarketEvent()) return;
    if (Math.random() > 0.25) return;
    if (!currentMarket.length) return;

    const pick = currentMarket[Math.floor(Math.random() * currentMarket.length)];
    const discountPct = 0.3;
    const durationMs = 2 * 60 * 1000;
    gameData.marketEvent = {
        phoneId: pick.id,
        discountPct,
        expiresAt: Date.now() + durationMs
    };
    scheduleSave();
}

function getMarketPrice(phone) {
    const base = phone.price;
    const ev = getActiveMarketEvent();
    if (!ev) return base;
    if (ev.phoneId !== phone.id) return base;
    return Math.max(1, Math.floor(base * (1 - ev.discountPct)));
}

// --- ИГРОВОЙ ЦИКЛ (Пассивный доход) ---
setInterval(() => {
    gameData.balance += getIncomePerSecond();
    updateUI();
    renderUpgrades();
    renderMarket(); // обновляем disabled на кнопках
}, 1000);

// Обновляем рынок каждые 15 секунд
setInterval(generateMarket, 15000);

// Инициализация при запуске
updateUI();
renderUpgrades();
generateMarket();