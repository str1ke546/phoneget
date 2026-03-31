// --- ИГРОВЫЕ ДАННЫЕ (СОХРАНЕНИЯ) ---
const SAVE_KEY = 'phoneGetSave';
const SAVE_VERSION = 5;

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
        // инвентарь: [{ id: number, qty: number }]
        inventory: [],
        upgrades: {
            // апгрейды кликов больше не используются, но оставляем для совместимости
            clickPowerLevel: 0,
            critLevel: 0,
            autoTapLevel: 0
        },
        lastDailyClaimTs: 0,
        marketEvent: null,
        stats: {
            casesOpened: 0
        },
        // тема оформления
        theme: 'light',
        // gacha-таймер: следующее время дропа телефона
        nextAutoDropAt: Date.now() + 3 * 60 * 1000,
        // отложенная награда (кейс уже "заряжен", ждёт нажатия «Забрать»)
        pendingDrop: null
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

    const theme = typeof save.theme === 'string' ? save.theme : 'light';
    const nextAutoDropAt = Number(save.nextAutoDropAt) || (Date.now() + 3 * 60 * 1000);
    const pendingDrop = (save.pendingDrop && typeof save.pendingDrop === 'object')
        ? {
            id: Number(save.pendingDrop.id) || null,
            rarity: save.pendingDrop.rarity || null
        }
        : null;

    return {
        v: SAVE_VERSION,
        balance: Number(save.balance) || 0,
        clickPower: Number(save.clickPower) || 1,
        inventory: normalizedInv,
        upgrades: normalizedUpgrades,
        lastDailyClaimTs,
        marketEvent,
        stats: normalizedStats,
        theme,
        nextAutoDropAt,
        pendingDrop
    };
}

let gameData = migrateSave(loadGame()) || defaultGameData();

// --- LANGUAGE / I18N ---
const LANG_KEY = 'phoneGetLang';
const i18n = {
    ru: {
        balanceLabel: 'Баланс',
        incomeLabel: 'Доход',
        perSecond: 'сек',
        tabMining: '⛏️ Майнинг',
        tabMarket: '🛒 Авито',
        tabCases: '🎰 Кейсы',
        tabInventory: '📦 Склад',
        tapHint: 'Тапай по экрану!',
        dailyBtn: '🎁 Ежедневный бонус',
        upgradesTitle: 'Улучшения',
        marketTitle: 'Свежие объявления',
        casesTitle: 'Кейсы',
        casesOddsHint: 'Каждые 3 минуты выпадает случайный телефон (Gacha).',
        openCaseBtn: 'Забрать',
        dailyAvailable: (amt) => `Доступно: +${amt} ₽`,
        dailyIn: (tLeft) => `Можно через ${tLeft}`,
        notEnough: 'Не хватает рублей!',
        sell: (amt) => `Продать (${amt} ₽)`,
        rarity_common: 'обычный',
        rarity_rare: 'редкий',
        rarity_epic: 'эпический',
        rarity_legendary: 'легендарный',
        rarity_secret: 'секретный',
        caseIntro: 'Жди 3 минуты, чтобы получить новый телефон.',
        caseFailed: 'Не удалось открыть кейс. Попробуй ещё раз.',
        casePrice: (amt) => `Цена кейса: ${amt} ₽`,
        caseWin: (name) => `Выпало: ${name}`,
        caseRarityIncome: (rarity, income) => `Редкость: ${rarity} • +${income} ₽/сек`,
        invEmpty: 'У вас пока нет ферм.',
        invWorking: 'Работает',
        marketUsed: 'Состояние',
        incomeLine: (income) => `Доход: +${income} ₽/сек`,
        farmIncomeLine: (income) => `Приносит: +${income} ₽/сек`,
        autoDropTimer: (time) => `Следующий телефон через: ${time}`,
        autoDropReady: 'Новый телефон готов! Нажми «Забрать».',
        themeLabel: 'Тема оформления',
        theme_light: 'Светлая',
        theme_dark: 'Тёмная',
        theme_red: 'Красная',
        theme_green: 'Зелёная',
        theme_blue: 'Синяя'
    },
    en: {
        balanceLabel: 'Balance',
        incomeLabel: 'Income',
        perSecond: 's',
        tabMining: '⛏️ Mining',
        tabMarket: '🛒 Market',
        tabCases: '🎰 Cases',
        tabInventory: '📦 Storage',
        tapHint: 'Tap the screen!',
        dailyBtn: '🎁 Daily bonus',
        upgradesTitle: 'Upgrades',
        marketTitle: 'New listings',
        casesTitle: 'Cases',
        casesOddsHint: 'Every 3 minutes you get a free random phone (Gacha).',
        openCaseBtn: 'Claim',
        dailyAvailable: (amt) => `Available: +${amt} ₽`,
        dailyIn: (tLeft) => `Ready in ${tLeft}`,
        notEnough: 'Not enough money!',
        sell: (amt) => `Sell (${amt} ₽)`,
        rarity_common: 'common',
        rarity_rare: 'rare',
        rarity_epic: 'epic',
        rarity_legendary: 'legendary',
        rarity_secret: 'secret',
        caseIntro: 'Wait 3 minutes to receive a new phone.',
        caseFailed: 'Could not open the case. Try again.',
        casePrice: (amt) => `Case cost: ${amt} ₽`,
        caseWin: (name) => `You got: ${name}`,
        caseRarityIncome: (rarity, income) => `Rarity: ${rarity} • +${income} ₽/s`,
        invEmpty: 'No farms yet.',
        invWorking: 'Running',
        marketUsed: 'Condition',
        incomeLine: (income) => `Income: +${income} ₽/s`,
        farmIncomeLine: (income) => `Generates: +${income} ₽/s`,
        autoDropTimer: (time) => `Next phone in: ${time}`,
        autoDropReady: 'New phone is ready! Press “Claim”.',
        themeLabel: 'Theme',
        theme_light: 'Light',
        theme_dark: 'Dark',
        theme_red: 'Red',
        theme_green: 'Green',
        theme_blue: 'Blue'
    }
};

function getLang() {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'ru' || stored === 'en') return stored;
    return 'ru';
}

let currentLang = getLang();
let numberFmt = new Intl.NumberFormat(currentLang === 'en' ? 'en-US' : 'ru-RU');

function t(key, ...args) {
    const dict = i18n[currentLang] || i18n.ru;
    const v = dict[key];
    if (typeof v === 'function') return v(...args);
    return v ?? key;
}

function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (!k) return;
        el.textContent = t(k);
    });
    const sel = document.getElementById('lang-select');
    if (sel) sel.value = currentLang;
    document.documentElement.lang = currentLang;
}

function setLang(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    numberFmt = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU');
    applyI18n();
}

// База данных всех телефонов / объявлений
// Каждое объявление: { id, name, desc, price, income, rarity, icon, img }
const phonesDB = [
    // --- COMMON ---
    {
        id: 1,
        name: 'Nokia 3310',
        desc: 'Легендарная «неубиваемая». Состояние идеальное, батарея держит неделю.',
        price: 60,
        income: 1,
        rarity: 'common',
        icon: '🧱',
        img: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Nokia_3310_mobile_phone.jpg'
    },
    {
        id: 2,
        name: 'Nokia 1100',
        desc: 'Старая кнопочная, клавиатура стёрта, но всё ещё звонит.',
        price: 40,
        income: 1,
        rarity: 'common',
        icon: '📟',
        img: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Nokia_1100b.jpg'
    },
    {
        id: 3,
        name: 'iPhone 4S',
        desc: 'Экран с царапинами, батарея уставшая, iOS старая.',
        price: 350,
        income: 6,
        rarity: 'common',
        icon: '📱',
        img: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Black_iPhone_4s.jpg'
    },
    {
        id: 4,
        name: 'iPhone 6',
        desc: 'Корпус по краям побит, но Touch ID ещё работает.',
        price: 500,
        income: 9,
        rarity: 'common',
        icon: '📲',
        img: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/IPhone_6_silver_back.jpg'
    },
    {
        id: 5,
        name: 'Samsung Galaxy S7',
        desc: 'Стекло с трещиной, но камера снимает отлично.',
        price: 650,
        income: 11,
        rarity: 'common',
        icon: '📷',
        img: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Samsung_Galaxy_S7_and_S7_Edge.png'
    },
    {
        id: 6,
        name: 'Google Pixel 2',
        desc: 'Есть выгорание экрана, камера всё ещё топ за свои года.',
        price: 700,
        income: 12,
        rarity: 'common',
        icon: '📸',
        img: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Google_Pixel_2_and_Pixel_2_XL.jpg'
    },

    // --- RARE ---
    {
        id: 100,
        name: 'iPhone X',
        desc: 'Первый безрамочный iPhone. Небольшие царапины на корпусе.',
        price: 2000,
        income: 28,
        rarity: 'rare',
        icon: '❌',
        img: 'https://upload.wikimedia.org/wikipedia/commons/3/32/IPhone_X_vector.svg'
    },
    {
        id: 101,
        name: 'iPhone 11 Pro',
        desc: 'Тройная камера, аккуратный владелец, комплект без наушников.',
        price: 3200,
        income: 40,
        rarity: 'rare',
        icon: '🍏',
        img: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/IPhone_11_Pro_vector.svg'
    },
    {
        id: 102,
        name: 'Samsung Galaxy S10',
        desc: 'AMOLED без выгораний, всегда в чехле. Состояние отличное.',
        price: 2600,
        income: 32,
        rarity: 'rare',
        icon: '🌌',
        img: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Samsung_Galaxy_S10.png'
    },
    {
        id: 103,
        name: 'Samsung Galaxy Note 9',
        desc: 'Стилус на месте, лёгкие следы эксплуатации.',
        price: 2800,
        income: 34,
        rarity: 'rare',
        icon: '✏️',
        img: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Samsung_Galaxy_Note_9.png'
    },
    {
        id: 104,
        name: 'Google Pixel 5',
        desc: 'Чистый Android, небольшой скол на рамке.',
        price: 2900,
        income: 36,
        rarity: 'rare',
        icon: '🟢',
        img: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Pixel_5_and_Pixel_4a_5G.jpg'
    },

    // --- EPIC ---
    {
        id: 200,
        name: 'iPhone 13 Pro Max',
        desc: 'Почти как новый, один владелец, без сколов.',
        price: 6500,
        income: 85,
        rarity: 'epic',
        icon: '📳',
        img: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/IPhone_13_Pro_vector.svg'
    },
    {
        id: 201,
        name: 'iPhone 15 Pro',
        desc: 'Титановый корпус, минимальные следы использования.',
        price: 8800,
        income: 110,
        rarity: 'epic',
        icon: '🍎',
        img: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/IPhone_15_Pro_%26_iPhone_15_Pro_Max.jpg'
    },
    {
        id: 202,
        name: 'Samsung Galaxy S23 Ultra',
        desc: 'Топовый флагман, мощная камера, аккуратный владелец.',
        price: 9000,
        income: 115,
        rarity: 'epic',
        icon: '📡',
        img: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Samsung_Galaxy_S23_Ultra.png'
    },
    {
        id: 203,
        name: 'Google Pixel 8 Pro',
        desc: 'Новая камера с ИИ, полный комплект.',
        price: 9200,
        income: 118,
        rarity: 'epic',
        icon: '🤖',
        img: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Pixel_8_Pro.png'
    },
    {
        id: 204,
        name: 'Samsung Galaxy Z Flip',
        desc: 'Складной экран, видимый сгиб, но работает идеально.',
        price: 7800,
        income: 95,
        rarity: 'epic',
        icon: '📂',
        img: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Samsung_Galaxy_Z_Flip.png'
    },

    // --- LEGENDARY ---
    {
        id: 300,
        name: 'Золотой Vertu',
        desc: 'Премиальный телефон, инкрустация, комплект с коробкой.',
        price: 30000,
        income: 650,
        rarity: 'legendary',
        icon: '💎',
        img: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Vertu_mobile.jpg'
    },
    {
        id: 301,
        name: 'iPhone 1 (2G)',
        desc: 'Коллекционный экземпляр, первая модель iPhone.',
        price: 45000,
        income: 800,
        rarity: 'legendary',
        icon: '📼',
        img: 'https://upload.wikimedia.org/wikipedia/commons/2/28/IPhone_2G_PSD.png'
    },
    {
        id: 302,
        name: 'Nokia N-Gage',
        desc: 'Геймерский кирпич, редкость для коллекционеров.',
        price: 20000,
        income: 420,
        rarity: 'legendary',
        icon: '🎮',
        img: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Nokia-NGage-QD.jpg'
    },
    {
        id: 303,
        name: 'Motorola RAZR V3',
        desc: 'Культовая раскладушка, состояние близко к идеальному.',
        price: 18000,
        income: 360,
        rarity: 'legendary',
        icon: '📞',
        img: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Motorola_RAZR_V3.jpg'
    },

    // --- SECRET (0.01%) ---
    {
        id: 999,
        name: 'Xiaomi Mi Mix Alpha',
        desc: 'Супер-редкий концепт с экраном вокруг корпуса. Секретный дроп.',
        price: 150000,
        income: 2500,
        rarity: 'legendary',
        icon: '🧪',
        img: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Xiaomi_Mi_Mix_Alpha.jpg'
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
const langSelectEl = document.getElementById('lang-select');
const claimDropBtn = document.getElementById('claim-drop-btn');
const autoDropTextEl = document.getElementById('auto-drop-text');

function formatMoney(n) {
    return numberFmt.format(Math.floor(Number(n) || 0));
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

// Апгрейды кликов больше не используются, поэтому список оставляем пустым
const upgradesDB = [];

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
        btn.textContent = isMax ? (currentLang === 'en' ? 'Owned' : 'Куплено') : `${formatMoney(cost)} ₽`;

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

// --- BALANCE COUNTER ANIMATION ---
let balanceAnimRaf = 0;
let shownBalance = Math.floor(Number(gameData.balance) || 0);

function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function animateBalanceTo(target) {
    if (!balanceEl) return;
    const to = Math.floor(Number(target) || 0);
    const from = Math.floor(Number(shownBalance) || 0);
    if (from === to) {
        balanceEl.innerText = formatMoney(to);
        return;
    }

    if (balanceAnimRaf) cancelAnimationFrame(balanceAnimRaf);
    const start = performance.now();
    const duration = 420;

    const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const v = Math.floor(from + (to - from) * easeOutCubic(p));
        shownBalance = v;
        balanceEl.innerText = formatMoney(v);
        if (p < 1) balanceAnimRaf = requestAnimationFrame(tick);
    };
    balanceAnimRaf = requestAnimationFrame(tick);
}

function updateUI() {
    animateBalanceTo(gameData.balance);
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
        dailyHintEl.textContent = t('dailyAvailable', formatMoney(getDailyBonusAmount()));
    } else {
        dailyBtn.disabled = true;
        dailyHintEl.textContent = t('dailyIn', formatTime(rem));
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

// --- МЕХАНИКА КЛИКЕРА УБРАНА --- (клики больше не дают телефоны/баланс)

// --- МЕХАНИКА АВИТО (Генератор рынка) ---
const rarityWeights = {
    common: 55,
    rare: 25,
    epic: 15,
    legendary: 5
};

// --- GACHA / КЕЙСЫ ---
function getCaseCost() {
    const opened = Math.max(0, Math.floor(Number(gameData?.stats?.casesOpened) || 0));
    return Math.floor(500 * Math.pow(1.08, Math.min(opened, 60)));
}

function pickRarityByChance() {
    const r = Math.random() * 100;
    if (r < rarityWeights.common) return 'common';
    if (r < rarityWeights.common + rarityWeights.rare) return 'rare';
    if (r < rarityWeights.common + rarityWeights.rare + rarityWeights.epic) return 'epic';
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
        empty.textContent = t('caseFailed');
        caseResultEl.appendChild(empty);
        return;
    }

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    const rarityClass = rarity || phone.rarity;
    title.className = `case-win-title rarity-${rarityClass}`;
    title.textContent = t('caseWin', phone.name);

    const sub = document.createElement('div');
    sub.className = 'hint';
    const rarityKey = rarity || phone.rarity;
    const rarityTxt = t(`rarity_${rarityKey}`);
    sub.textContent = t('caseRarityIncome', rarityTxt, formatMoney(phone.income));

    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);

    caseResultEl.appendChild(createPhoneMedia(phone));
    caseResultEl.appendChild(titleWrap);
}

function updateCasesUI() {
    if (!openCaseBtn || !caseCostHintEl) return;
    const cost = getCaseCost();
    caseCostHintEl.textContent = t('casePrice', formatMoney(cost));
    openCaseBtn.disabled = isRouletteSpinning || gameData.balance < cost;
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
        epic: phonesDB.filter(p => p.rarity === 'epic'),
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
    if (isRouletteSpinning) return;
    const cost = getCaseCost();
    if (gameData.balance < cost) {
        alert(t('notEnough'));
        return;
    }

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

// --- АВТОМАТИЧЕСКИЙ ДРОП ТЕЛЕФОНОВ (GACHA, раз в 3 минуты) ---
const AUTO_DROP_INTERVAL_MS = 3 * 60 * 1000;

function ensureNextAutoDrop() {
    if (!Number.isFinite(Number(gameData.nextAutoDropAt))) {
        gameData.nextAutoDropAt = Date.now() + AUTO_DROP_INTERVAL_MS;
    }
}

function rollAutoDropPhone() {
    // 0.01% шанс секретного Xiaomi Mi Mix Alpha
    const secretPhone = phonesDB.find(p => p.id === 999);
    if (secretPhone && Math.random() < 0.0001) {
        return { id: secretPhone.id, rarity: 'secret' };
    }

    const rarity = pickRarityByChance();
    const phone = pickPhoneByRarity(rarity);
    if (!phone) return null;
    return { id: phone.id, rarity };
}

function isAutoDropReady() {
    if (gameData.pendingDrop && gameData.pendingDrop.id) return true;
    ensureNextAutoDrop();
    return Date.now() >= gameData.nextAutoDropAt;
}

function updateAutoDropLogic() {
    ensureNextAutoDrop();
    if (gameData.pendingDrop && gameData.pendingDrop.id) return;
    if (Date.now() < gameData.nextAutoDropAt) return;

    const drop = rollAutoDropPhone();
    if (!drop) {
        // если по какой-то причине не смогли выбрать телефон — сдвигаем таймер
        gameData.nextAutoDropAt = Date.now() + AUTO_DROP_INTERVAL_MS;
        return;
    }

    gameData.pendingDrop = drop;
    gameData.nextAutoDropAt = Date.now() + AUTO_DROP_INTERVAL_MS;
}

function updateAutoDropUI() {
    const timerEl = document.getElementById('auto-drop-timer');
    if (!timerEl) return;

    if (gameData.pendingDrop && gameData.pendingDrop.id) {
        timerEl.textContent = t('autoDropReady');
        if (claimDropBtn) claimDropBtn.disabled = false;
        if (autoDropTextEl) {
            const phone = phonesDB.find(p => p.id === gameData.pendingDrop.id);
            autoDropTextEl.textContent = phone ? t('caseWin', phone.name) : t('autoDropReady');
        }
        return;
    }

    ensureNextAutoDrop();
    const remaining = Math.max(0, gameData.nextAutoDropAt - Date.now());
    timerEl.textContent = t('autoDropTimer', formatTime(remaining));
    if (claimDropBtn) claimDropBtn.disabled = true;
    if (autoDropTextEl) autoDropTextEl.textContent = t('caseIntro');
}

function claimAutoDrop() {
    const drop = gameData.pendingDrop;
    if (!drop || !drop.id) return;
    const phone = phonesDB.find(p => p.id === drop.id);
    if (!phone) return;
    gameData.pendingDrop = null;
    spinRouletteAndGrant(phone, drop.rarity || phone.rarity);
}

if (claimDropBtn) {
    claimDropBtn.addEventListener('click', () => {
        claimAutoDrop();
    });
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
        p1.textContent = t('incomeLine', formatMoney(phone.income));

        const p2 = document.createElement('p');
        const condition = phone.desc || t('marketUsed');
        p2.textContent = `${t('marketUsed')}: ${condition}`;

        const p3 = document.createElement('p');
        p3.textContent = `${formatMoney(phone.price)} ₽`;

        info.appendChild(title);
        info.appendChild(p1);
        info.appendChild(p2);
        info.appendChild(p3);

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
        alert(t('notEnough'));
    }
}

// --- ИНВЕНТАРЬ ---
function renderInventory() {
    const invList = document.getElementById('inventory-list');
    invList.innerHTML = '';
    
    if (gameData.inventory.length === 0) {
        invList.innerHTML = `<p style="text-align:center; color:gray;">${t('invEmpty')}</p>`;
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
        p.textContent = t('farmIncomeLine', formatMoney(phone.income * entry.qty));

        info.appendChild(title);
        info.appendChild(p);

        const badge = document.createElement('div');
        badge.className = 'inv-actions';

        const sellBtn = document.createElement('button');
        sellBtn.type = 'button';
        sellBtn.className = 'sell-btn';
        sellBtn.dataset.sellId = String(phone.id);
        sellBtn.textContent = t('sell', formatMoney(getSellPrice(phone)));

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

// --- ТЕМЫ ОФОРМЛЕНИЯ ---
const THEME_KEY = 'phoneGetTheme';

const THEMES = {
    light: {
        '--bg-color': '#f5f7fb',
        '--bg-accent': '#ffffff',
        '--card-bg': '#ffffff',
        '--accent-color': '#3b82f6',
        '--accent-soft': 'rgba(59,130,246,0.12)',
        '--text-color': '#111827'
    },
    dark: {
        '--bg-color': '#050816',
        '--bg-accent': '#020617',
        '--card-bg': '#111827',
        '--accent-color': '#22d3ee',
        '--accent-soft': 'rgba(34,211,238,0.15)',
        '--text-color': '#e5e7eb'
    },
    red: {
        '--bg-color': '#1f0a0a',
        '--bg-accent': '#2c0d0d',
        '--card-bg': '#3f0f12',
        '--accent-color': '#ef4444',
        '--accent-soft': 'rgba(248,113,113,0.16)',
        '--text-color': '#fee2e2'
    },
    green: {
        '--bg-color': '#022c22',
        '--bg-accent': '#064e3b',
        '--card-bg': '#064e3b',
        '--accent-color': '#22c55e',
        '--accent-soft': 'rgba(74,222,128,0.18)',
        '--text-color': '#dcfce7'
    },
    blue: {
        '--bg-color': '#020617',
        '--bg-accent': '#0b1120',
        '--card-bg': '#0f172a',
        '--accent-color': '#3b82f6',
        '--accent-soft': 'rgba(59,130,246,0.18)',
        '--text-color': '#e5f0ff'
    }
};

function applyTheme(themeId) {
    const theme = THEMES[themeId] || THEMES.light;
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
    root.setAttribute('data-theme', themeId);
    gameData.theme = themeId;
    try {
        localStorage.setItem(THEME_KEY, themeId);
    } catch {
        // no-op
    }
    scheduleSave();
}

function initTheme() {
    let theme = gameData.theme;
    if (!theme) {
        const stored = localStorage.getItem(THEME_KEY);
        theme = stored || 'light';
        gameData.theme = theme;
    }
    applyTheme(theme);
    const select = document.getElementById('theme-select');
    if (select) {
        select.value = theme;
        select.addEventListener('change', (e) => {
            const val = e.target.value;
            if (THEMES[val]) applyTheme(val);
        });
    }
}

// --- ПОГОДНЫЕ ЭФФЕКТЫ ---
function setWeather(weather) {
    const root = document.documentElement;
    root.setAttribute('data-weather', weather);
    const layer = document.getElementById('weather-layer');
    if (!layer) return;
    layer.innerHTML = '';

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (weather === 'rain') {
        for (let i = 0; i < 120; i++) {
            const drop = document.createElement('div');
            drop.className = 'weather-drop rain';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDelay = `${Math.random() * 4}s`;
            layer.appendChild(drop);
        }
    } else if (weather === 'snow') {
        for (let i = 0; i < 80; i++) {
            const flake = document.createElement('div');
            flake.className = 'weather-drop snow';
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.animationDelay = `${Math.random() * 6}s`;
            layer.appendChild(flake);
        }
    } else if (weather === 'fog') {
        for (let i = 0; i < 6; i++) {
            const fog = document.createElement('div');
            fog.className = 'weather-fog';
            fog.style.left = `${Math.random() * 100}%`;
            fog.style.animationDelay = `${Math.random() * 10}s`;
            layer.appendChild(fog);
        }
    } else if (weather === 'sun') {
        const sun = document.createElement('div');
        sun.className = 'weather-sun';
        layer.appendChild(sun);
    }
}

function chooseWeatherByTime() {
    const hour = new Date().getHours();
    const roll = Math.random();
    if (hour >= 7 && hour < 11) {
        return roll < 0.6 ? 'sun' : 'fog';
    }
    if (hour >= 11 && hour < 18) {
        if (roll < 0.5) return 'sun';
        if (roll < 0.75) return 'rain';
        return 'fog';
    }
    if (hour >= 18 && hour < 23) {
        if (roll < 0.4) return 'rain';
        if (roll < 0.8) return 'fog';
        return 'snow';
    }
    return roll < 0.5 ? 'snow' : 'fog';
}

function initWeatherSystem() {
    setWeather(chooseWeatherByTime());
    setInterval(() => {
        setWeather(chooseWeatherByTime());
    }, 5 * 60 * 1000);
}

// --- ИГРОВОЙ ЦИКЛ (Пассивный доход + авто-дроп) ---
setInterval(() => {
    gameData.balance += getIncomePerSecond();
    updateAutoDropLogic();
    updateUI();
    renderUpgrades();
    renderMarket(); // обновляем disabled на кнопках
    updateAutoDropUI();
}, 1000);

// Обновляем рынок каждые 15 секунд
setInterval(generateMarket, 15000);

// Инициализация при запуске
applyI18n();
if (langSelectEl) {
    langSelectEl.value = currentLang;
    langSelectEl.addEventListener('change', (e) => setLang(e.target.value));
}
initTheme();
initWeatherSystem();
updateUI();
renderUpgrades();
generateMarket();