// ==================== API CONFIGURATION ====================
const BASE_URL = 'https://api.exchangerate.host';
const API_KEY = 'd4debf58b2f551e7f0f34b45';

let currentRates = {};
let lastUpdateTimestamp = null;
let historicalData = [];
let historicalDates = [];
let trendChart = null;
let previousRates = {};
let fromTomSelect = null;
let toTomSelect = null;
let userWatchlist = [];

// Variabel untuk pasangan mata uang yang sedang ditampilkan di chart
let currentChartFrom = 'USD';
let currentChartTo = 'IDR';
let isLoadingChart = false;

// ==================== EXCHANGE TABLE VARIABLES ====================
let allExchangeData = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: 'currency', direction: 'asc' };
let searchQuery = '';
let tableFilter = 'all';
let baseCurrency = 'IDR';
let changePeriod = '24h';
let customChangeDate = null;
let historicalRatesCache = {};

// ==================== GET FLAG IMAGE ====================
function getFlagImage(currencyCode) {
    const map = {
        USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", AUD: "au",
        SGD: "sg", CNY: "cn", IDR: "id", CAD: "ca", CHF: "ch",
        HKD: "hk", NZD: "nz", KRW: "kr", INR: "in", MYR: "my",
        THB: "th", AED: "ae", SAR: "sa", PHP: "ph", VND: "vn",
        BRL: "br", RUB: "ru", ZAR: "za", TRY: "tr", SEK: "se",
        NOK: "no", DKK: "dk", PLN: "pl", MXN: "mx"
    };
    let countryCode = map[currencyCode];
    if (!countryCode) {
        countryCode = currencyCode.slice(0, 2).toLowerCase();
    }
    return `https://flagcdn.com/w20/${countryCode}.png`;
}

// ==================== NAMA CURRENCY ====================
function getCurrencyName(code) {
    const names = {
        USD: "US Dollar", EUR: "Euro", GBP: "British Pound",
        JPY: "Japanese Yen", AUD: "Australian Dollar", SGD: "Singapore Dollar",
        CNY: "Chinese Yuan", IDR: "Indonesian Rupiah", CAD: "Canadian Dollar",
        CHF: "Swiss Franc", HKD: "Hong Kong Dollar", NZD: "New Zealand Dollar",
        KRW: "South Korean Won", INR: "Indian Rupee", MYR: "Malaysian Ringgit",
        THB: "Thai Baht", AED: "UAE Dirham", SAR: "Saudi Riyal",
        PHP: "Philippine Peso", VND: "Vietnamese Dong", BRL: "Brazilian Real",
        RUB: "Russian Ruble", ZAR: "South African Rand", TRY: "Turkish Lira",
        SEK: "Swedish Krona", NOK: "Norwegian Krone", DKK: "Danish Krone",
        PLN: "Polish Zloty", MXN: "Mexican Peso"
    };
    return names[code] || code;
}

const displayCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'SGD', 'CNY'];

// ==================== FETCH API ====================
async function fetchExchangeRates() {
    try {
        const statusElem = document.getElementById('apiStatus');
        statusElem.innerHTML = '🟡 Mengambil data...';
        statusElem.style.background = '#f59e0b20';

        console.log('Fetching data from ExchangeRate.host API...');
        const response = await fetch(`${BASE_URL}/live?access_key=${API_KEY}&base=USD`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.success && data.quotes) {
            currentRates = {};
            for (let key in data.quotes) {
                const currencyCode = key.slice(3);
                currentRates[currencyCode] = data.quotes[key];
            }
            currentRates["USD"] = 1;
            
            console.log('Rates loaded:', Object.keys(currentRates).length, 'currencies');
            
            lastUpdateTimestamp = new Date();
            updateLastUpdateTime();

            statusElem.innerHTML = '🟢 API Connected (ExchangeRate.host)';
            statusElem.style.background = '#10b98120';
            
            return true;
        } else {
            throw new Error('Invalid API response format: ' + (data.error?.info || 'Unknown error'));
        }

    } catch (error) {
        console.error('API Error:', error);
        const statusElem = document.getElementById('apiStatus');
        statusElem.innerHTML = `🔴 Error: ${error.message}`;
        statusElem.style.background = '#ef444420';
        loadDemoData();
        return false;
    }
}

function loadDemoData() {
    console.log('Loading demo data...');
    currentRates = {
        USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5,
        AUD: 1.52, SGD: 1.34, CNY: 7.22, IDR: 15680
    };
    lastUpdateTimestamp = new Date();
    updateLastUpdateTime();
}

function getRate(from, to) {
    if (from === to) return 1;
    if (!currentRates[from] || !currentRates[to]) {
        console.warn(`Rate not available: ${from} -> ${to}`);
        return 1;
    }
    if (from === 'USD') return currentRates[to];
    if (to === 'USD') return 1 / currentRates[from];
    return currentRates[to] / currentRates[from];
}

function getRateToIDR(currency) {
    if (currency === 'IDR') return 1;
    const usdToIdr = currentRates.IDR || 15680;
    if (currency === 'USD') return usdToIdr;
    const usdRate = currentRates[currency];
    if (usdRate) return usdToIdr / usdRate;
    return 1;
}

function updateLastUpdateTime() {
    const timeElement = document.getElementById('lastUpdateTime');
    if (timeElement && lastUpdateTimestamp) {
        timeElement.innerHTML = `🔄 Update: ${lastUpdateTimestamp.toLocaleTimeString('id-ID')}`;
    }
}

function convertCurrency(amount, fromCurr, toCurr) {
    if (isNaN(amount) || amount === null || amount === '') return 0;
    if (fromCurr === toCurr) return amount;
    const rate = getRate(fromCurr, toCurr);
    return amount * rate;
}

// ==================== FORMAT INPUT ====================
function setupAmountInput() {
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', function (e) {
            let raw = e.target.value.replace(/\D/g, '');
            if (!raw) {
                e.target.value = '';
                return;
            }
            let number = Number(raw);
            e.target.value = number.toLocaleString('id-ID');
        });
    }
}

function updateConversionDisplay() {
    let raw = document.getElementById('amount').value.replace(/\./g, '');
    let amountVal = parseFloat(raw);
    if (isNaN(amountVal)) amountVal = 0;
    
    let from = document.getElementById('fromCurr').value;
    let to = document.getElementById('toCurr').value;
    let result = convertCurrency(amountVal, from, to);

    let formatted;
    if (to === 'IDR') {
        formatted = Math.round(result).toLocaleString('id-ID') + ' IDR';
    } else if (Math.abs(result) > 1000 && to !== 'JPY') {
        formatted = Math.round(result).toLocaleString('id-ID') + ` ${to}`;
    } else if (to === 'JPY') {
        formatted = result.toFixed(2) + ` ${to}`;
    } else {
        formatted = result.toFixed(4) + ` ${to}`;
    }

    const resultElem = document.getElementById('conversionResult');
    if (resultElem) {
        resultElem.innerHTML = formatted;
    }
    
    updateChartForPair(from, to, 30);
}

// ==================== FUNGSI GET RATE KE BASE CURRENCY ====================
function getRateToBase(currency, base) {
    if (currency === base) return 1;
    const rateFromUsd = getRate('USD', currency);
    const rateBaseFromUsd = getRate('USD', base);
    if (!rateFromUsd || !rateBaseFromUsd) return 1;
    return rateBaseFromUsd / rateFromUsd;
}

// ==================== FUNGSI GET RATE HISTORIS ====================
async function getHistoricalRate(currency, base, targetDate) {
    try {
        const cacheKey = `${currency}_${base}_${targetDate}`;
        if (historicalRatesCache[cacheKey]) {
            return historicalRatesCache[cacheKey];
        }
        
        const start = targetDate.toISOString().split('T')[0];
        
        const url = `${BASE_URL}/historical?access_key=${API_KEY}&date=${start}&base=USD&symbols=${currency},${base}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch historical rate');
        
        const data = await response.json();
        
        if (data.success && data.rates && data.rates[start]) {
            const rateCurrency = data.rates[start][currency];
            const rateBase = data.rates[start][base];
            
            if (rateCurrency && rateBase) {
                const result = rateBase / rateCurrency;
                historicalRatesCache[cacheKey] = result;
                return result;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching historical rate:', error);
        return null;
    }
}

function getTargetDateForPeriod(period, customDate = null) {
    const today = new Date();
    if (period === '24h') {
        const target = new Date(today);
        target.setDate(today.getDate() - 1);
        return target;
    } else if (period === '7d') {
        const target = new Date(today);
        target.setDate(today.getDate() - 7);
        return target;
    } else if (period === '30d') {
        const target = new Date(today);
        target.setDate(today.getDate() - 30);
        return target;
    } else if (period === 'custom' && customDate) {
        return new Date(customDate);
    }
    return null;
}

// ==================== EXCHANGE TABLE FUNCTIONS ====================
async function collectExchangeData() {
    const data = [];
    const currencies = Object.keys(currentRates).sort();
    const targetDate = getTargetDateForPeriod(changePeriod, customChangeDate);
    
    for (let curr of currencies) {
        const rateToBase = getRateToBase(curr, baseCurrency);
        let changePercent = 0;
        
        if (targetDate) {
            const historicalRate = await getHistoricalRate(curr, baseCurrency, targetDate);
            if (historicalRate && historicalRate > 0) {
                changePercent = ((rateToBase - historicalRate) / historicalRate) * 100;
            }
        } else {
            const prevRateKey = `${curr}_to_${baseCurrency}`;
            if (previousRates[prevRateKey]) {
                changePercent = ((rateToBase - previousRates[prevRateKey]) / previousRates[prevRateKey]) * 100;
            }
        }
        
        data.push({
            currency: curr,
            name: getCurrencyName(curr),
            rate: rateToBase,
            change: changePercent,
            isFavorite: isFavoriteCurrency(curr)
        });
        
        const prevRateKey = `${curr}_to_${baseCurrency}`;
        previousRates[prevRateKey] = rateToBase;
    }
    return data;
}

function isFavoriteCurrency(currency) {
    const favorites = JSON.parse(localStorage.getItem('favoriteCurrencies') || '[]');
    return favorites.includes(currency);
}

function toggleFavoriteCurrency(currency) {
    let favorites = JSON.parse(localStorage.getItem('favoriteCurrencies') || '[]');
    let message = '';
    
    if (favorites.includes(currency)) {
        favorites = favorites.filter(c => c !== currency);
        message = `⭐ ${currency} dihapus dari favorit`;
        if (confirm(`Hapus ${currency} dari watchlist juga?`)) {
            removeCurrencyFromWatchlist(currency);
        }
    } else {
        favorites.push(currency);
        message = `⭐ ${currency} ditambahkan ke favorit`;
        if (confirm(`Tambahkan ${currency}/IDR ke watchlist?`)) {
            addToWatchlist(currency, 'IDR');
        }
    }
    
    localStorage.setItem('favoriteCurrencies', JSON.stringify(favorites));
    renderEnhancedExchangeTable();
    renderWatchlist();
    showToast(message);
}

function removeCurrencyFromWatchlist(currency) {
    const index = userWatchlist.findIndex(item => item.to === currency);
    if (index !== -1) {
        userWatchlist.splice(index, 1);
        saveWatchlistToStorage();
        renderWatchlist();
        showToast(`🗑️ ${currency}/IDR dihapus dari watchlist`);
    }
}

function showToast(message) {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:#1e293b;color:white;padding:10px 20px;border-radius:40px;font-size:0.8rem;z-index:2000;opacity:0;transition:opacity 0.3s;pointer-events:none;`;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

function sortData(data, field, direction) {
    return [...data].sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        if (field === 'currency') { aVal = a.currency; bVal = b.currency; }
        if (typeof aVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
}

function filterData(data, query, filterType) {
    let filtered = data;
    if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(item => 
            item.currency.toLowerCase().includes(lowerQuery) ||
            item.name.toLowerCase().includes(lowerQuery)
        );
    }
    if (filterType === 'favorites') {
        filtered = filtered.filter(item => item.isFavorite);
    }
    return filtered;
}

function updateSortingIndicators() {
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        const field = th.dataset.sort;
        th.classList.remove('sort-asc', 'sort-desc');
        if (currentSort.field === field) {
            th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

async function renderEnhancedExchangeTable() {
    const tbody = document.getElementById('exchangeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="loading">🔄 Memuat data...</td></tr>';
    
    let data = await collectExchangeData();
    data = filterData(data, searchQuery, tableFilter);
    data = sortData(data, currentSort.field, currentSort.direction);
    
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pageData = data.slice(startIndex, endIndex);
    
    const totalItemsElem = document.getElementById('totalItems');
    const pageStartElem = document.getElementById('pageStart');
    const pageEndElem = document.getElementById('pageEnd');
    const pageInfoElem = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (totalItemsElem) totalItemsElem.textContent = totalItems;
    if (pageStartElem) pageStartElem.textContent = totalItems > 0 ? startIndex + 1 : 0;
    if (pageEndElem) pageEndElem.textContent = endIndex;
    if (pageInfoElem) pageInfoElem.textContent = `Halaman ${currentPage} dari ${totalPages || 1}`;
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    updateSortingIndicators();
    
    const rateHeader = document.querySelector('.data-table th[data-sort="rate"]');
    if (rateHeader) {
        rateHeader.innerHTML = `Rate (${baseCurrency}) <i class="fa-solid fa-arrow-down-wide-short sort-icon"></i>`;
    }
    
    const changeHeader = document.querySelector('.data-table th[data-sort="change"]');
    if (changeHeader) {
        let periodText = '';
        if (changePeriod === '24h') periodText = '24 Jam';
        else if (changePeriod === '7d') periodText = '7 Hari';
        else if (changePeriod === '30d') periodText = '30 Hari';
        else if (changePeriod === 'custom' && customChangeDate) periodText = `Sejak ${new Date(customChangeDate).toLocaleDateString('id-ID')}`;
        else periodText = 'Perubahan';
        changeHeader.innerHTML = `${periodText} <i class="fa-solid fa-arrow-down-wide-short sort-icon"></i>`;
    }
    
    if (pageData.length === 0) {
        tbody.innerHTML = `\\
<td colspan="4" class="loading">
            ${tableFilter === 'favorites' ? '⭐ Belum ada mata uang favorit. Klik bintang untuk menambahkan!' : '📭 Tidak ada mata uang yang ditemukan'}
        \\n`;
        return;
    }
    
    tbody.innerHTML = '';
    
    pageData.forEach(item => {
        const row = tbody.insertRow();
        const flagUrl = getFlagImage(item.currency);
        
        row.insertCell(0).innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${flagUrl}" style="width: 24px; height: 18px; border-radius: 2px;" onerror="this.src='https://flagcdn.com/w20/un.png'">
                <div>
                    <span style="font-weight: 600;">${item.currency}</span>
                    <span style="font-size: 0.7rem; color: #94a3b8; margin-left: 4px;">${item.name}</span>
                </div>
            </div>
        `;
        
        let formattedRate;
        if (baseCurrency === 'IDR' && item.currency !== 'JPY') {
            formattedRate = Math.round(item.rate).toLocaleString('id-ID');
        } else if (baseCurrency === 'JPY' || item.currency === 'JPY') {
            formattedRate = item.rate.toFixed(2);
        } else if (Math.abs(item.rate) < 0.01) {
            formattedRate = item.rate.toFixed(6);
        } else if (Math.abs(item.rate) > 1000) {
            formattedRate = Math.round(item.rate).toLocaleString('id-ID');
        } else {
            formattedRate = item.rate.toFixed(4);
        }
        
        row.insertCell(1).innerHTML = `
            <span style="font-weight: 600;">${formattedRate}</span>
            <span style="font-size: 0.6rem; color: #94a3b8; margin-left: 4px;">${baseCurrency}</span>
        `;
        
        const isPositive = item.change >= 0;
        const changeSymbol = isPositive ? '▲' : '▼';
        row.insertCell(2).innerHTML = `
            <span style="padding: 4px 10px; border-radius: 30px; font-size: 0.75rem; font-weight: 600; background: ${isPositive ? '#10b98120' : '#ef444420'}; color: ${isPositive ? '#10b981' : '#ef4444'};">
                ${changeSymbol} ${Math.abs(item.change).toFixed(2)}%
            </span>
        `;
        
        const starClass = item.isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
        row.insertCell(3).innerHTML = `<i class="${starClass}" data-currency="${item.currency}" style="cursor: pointer; color: ${item.isFavorite ? '#f59e0b' : '#cbd5e1'}; font-size: 1.1rem;"></i>`;
    });
    
    document.querySelectorAll('#exchangeTableBody .fa-star, #exchangeTableBody .fa-regular.fa-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoriteCurrency(star.dataset.currency);
        });
    });
}

function setupExchangeTableEvents() {
    const baseSelect = document.getElementById('baseCurrencySelect');
    const baseFlagPreview = document.getElementById('baseFlagPreview');
    
    if (baseSelect) {
        baseSelect.innerHTML = '';
        const currencies = Object.keys(currentRates).sort();
        currencies.forEach(curr => {
            const option = document.createElement('option');
            option.value = curr;
            option.textContent = `${curr} - ${getCurrencyName(curr)}`;
            baseSelect.appendChild(option);
        });
        baseSelect.value = baseCurrency;
        if (baseFlagPreview) {
            baseFlagPreview.style.backgroundImage = `url('${getFlagImage(baseCurrency)}')`;
        }
        baseSelect.addEventListener('change', async (e) => {
            baseCurrency = e.target.value;
            if (baseFlagPreview) {
                baseFlagPreview.style.backgroundImage = `url('${getFlagImage(baseCurrency)}')`;
            }
            currentPage = 1;
            await renderEnhancedExchangeTable();
            showToast(`💱 Base currency diubah ke ${baseCurrency}`);
        });
    }
    
    const periodSelect = document.getElementById('changePeriodSelect');
    const customDatePanel = document.getElementById('customChangeDatePanel');
    const changeStartDate = document.getElementById('changeStartDate');
    const applyChangeDateBtn = document.getElementById('applyChangeDateBtn');
    
    if (periodSelect) {
        periodSelect.value = changePeriod;
        periodSelect.addEventListener('change', async (e) => {
            changePeriod = e.target.value;
            if (changePeriod === 'custom') {
                if (customDatePanel) customDatePanel.style.display = 'flex';
                const defaultDate = new Date();
                defaultDate.setDate(defaultDate.getDate() - 7);
                if (changeStartDate) changeStartDate.value = defaultDate.toISOString().split('T')[0];
            } else {
                if (customDatePanel) customDatePanel.style.display = 'none';
                customChangeDate = null;
                currentPage = 1;
                await renderEnhancedExchangeTable();
                showToast(`📊 Perubahan: ${periodSelect.options[periodSelect.selectedIndex].text}`);
            }
        });
    }
    
    if (applyChangeDateBtn && changeStartDate) {
        applyChangeDateBtn.addEventListener('click', async () => {
            if (changeStartDate.value) {
                customChangeDate = changeStartDate.value;
                currentPage = 1;
                await renderEnhancedExchangeTable();
                showToast(`📅 Perubahan sejak ${new Date(customChangeDate).toLocaleDateString('id-ID')}`);
            }
        });
    }
    
    const searchInput = document.getElementById('searchCurrency');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            renderEnhancedExchangeTable();
        });
    }
    
    const filterSelect = document.getElementById('tableFilterSelect');
    if (filterSelect) {
        filterSelect.value = tableFilter;
        filterSelect.addEventListener('change', (e) => {
            tableFilter = e.target.value;
            currentPage = 1;
            renderEnhancedExchangeTable();
        });
    }
    
    const refreshBtn = document.getElementById('refreshTableBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await renderEnhancedExchangeTable();
            showToast('🔄 Data diperbarui');
        });
    }
    
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }
            renderEnhancedExchangeTable();
        });
    });
    
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (currentPage > 1) {
                currentPage--;
                await renderEnhancedExchangeTable();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            const data = await collectExchangeData();
            const filtered = filterData(data, searchQuery, tableFilter);
            const totalPages = Math.ceil(filtered.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                await renderEnhancedExchangeTable();
            }
        });
    }
}

async function updateRealtimeRates() {
    await renderEnhancedExchangeTable();
    renderWatchlist();
    const timeElement = document.getElementById('lastUpdateTime');
    if (timeElement && lastUpdateTimestamp) {
        timeElement.innerHTML = `🔄 Update: ${lastUpdateTimestamp.toLocaleTimeString('id-ID')}`;
    }
}

// ==================== FUNGSI AMBIL DATA HISTORIS CHART ====================
async function fetchHistoricalDataByDateRange(from, to, startDate, endDate) {
    try {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        const url = `${BASE_URL}/timeseries?access_key=${API_KEY}&start_date=${start}&end_date=${end}&base=${from}&symbols=${to}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.success && data.rates) {
            const historicalRates = [];
            const dates = Object.keys(data.rates).sort();
            for (let date of dates) {
                if (data.rates[date] && data.rates[date][to]) {
                    historicalRates.push({ date: date, rate: data.rates[date][to] });
                }
            }
            return historicalRates;
        }
        return null;
    } catch (error) {
        console.error('Gagal mengambil data historis:', error);
        return null;
    }
}

async function fetchHistoricalData(from, to, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return fetchHistoricalDataByDateRange(from, to, startDate, endDate);
}

// ==================== FUNGSI CHART ====================
async function updateChartWithDateRange(from, to, startDate, endDate) {
    if (isLoadingChart) return;
    isLoadingChart = true;
    if (trendChart) { trendChart.data.datasets[0].data = []; trendChart.update(); }
    const pairLabel = document.getElementById('chartPairLabel');
    if (pairLabel) pairLabel.innerHTML = `${from}/${to} <span style="font-size:0.7rem;">(loading...)</span>`;
    currentChartFrom = from;
    currentChartTo = to;
    let historicalRates = await fetchHistoricalDataByDateRange(from, to, startDate, endDate);
    if (historicalRates && historicalRates.length > 0) {
        historicalData = historicalRates.map(item => item.rate);
        historicalDates = historicalRates.map(item => item.date);
    } else {
        console.warn('Using simulated data as fallback');
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const currentRate = getPairRate(from, to);
        historicalData = generateSimulatedDataForDays(currentRate, daysDiff);
        historicalDates = generateSimulatedDatesBetween(startDate, endDate);
    }
    updateChartDataWithPair(from, to, getPairRate(from, to), startDate, endDate);
    isLoadingChart = false;
    if (pairLabel) pairLabel.innerHTML = `${from}/${to}`;
}

async function updateChartForPair(from, to, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    await updateChartWithDateRange(from, to, startDate, endDate);
}

function generateSimulatedDataForDays(currentRate, days) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
        const variation = (Math.random() - 0.5) * 0.03 * (i / days + 0.5);
        data.push(currentRate * (1 + variation));
    }
    if (data.length > 0) data[data.length - 1] = currentRate;
    return data;
}

function generateSimulatedDatesBetween(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

function getPairRate(from, to) {
    return getRate(from, to);
}

function updateChartDataWithPair(from, to, currentRate, startDate, endDate) {
    if (!trendChart) return;
    let labels;
    if (historicalDates && historicalDates.length > 0) {
        const totalPoints = historicalDates.length;
        const maxLabels = 8;
        labels = historicalDates.map((date, index) => {
            if (totalPoints <= maxLabels || index % Math.ceil(totalPoints / maxLabels) === 0 || index === totalPoints - 1) {
                const d = new Date(date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            }
            return '';
        });
    } else {
        labels = historicalData.map((_, i) => `H-${historicalData.length - i}`);
    }
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = [...historicalData];
    const maxValue = Math.max(...historicalData);
    const isSmallValue = maxValue < 0.1;
    const isVerySmallValue = maxValue < 0.01;
    const isIDRRelated = (to === 'IDR' || from === 'IDR');
    trendChart.options.plugins.tooltip.callbacks.label = function(ctx) {
        let value = ctx.raw;
        let formattedValue;
        if (isIDRRelated && Math.abs(value) > 100) formattedValue = Math.round(value).toLocaleString('id-ID');
        else if (isVerySmallValue) formattedValue = value.toFixed(8);
        else if (isSmallValue) formattedValue = value.toFixed(6);
        else if (Math.abs(value) > 1000) formattedValue = Math.round(value).toLocaleString('id-ID');
        else formattedValue = value.toFixed(4);
        const dateLabel = historicalDates && historicalDates[ctx.dataIndex] ? ` (${historicalDates[ctx.dataIndex]})` : '';
        return `${from}/${to}: ${formattedValue}${dateLabel}`;
    };
    trendChart.options.scales.y.ticks.callback = function(val) {
        if (isIDRRelated && Math.abs(val) > 100) return val.toLocaleString('id-ID');
        if (isVerySmallValue) return val.toFixed(8);
        if (isSmallValue) return val.toFixed(6);
        if (Math.abs(val) > 1000) return val.toLocaleString('id-ID');
        return val.toFixed(4);
    };
    trendChart.options.scales.x.title = { display: true, text: startDate && endDate ? `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}` : '', color: '#94a3b8', font: { size: 9 } };
    trendChart.options.scales.y.title = { display: true, text: `Nilai Tukar (${from}/${to})`, color: '#64748b', font: { size: 10 } };
    trendChart.update();
    updateChartInfoDisplay(from, to, currentRate, startDate, endDate);
}

function updateChartInfoDisplay(from, to, currentRate, startDate, endDate) {
    let infoElem = document.getElementById('chartInfo');
    const trendBox = document.querySelector('.trend-box');
    if (!infoElem && trendBox) {
        infoElem = document.createElement('div');
        infoElem.id = 'chartInfo';
        infoElem.style.cssText = 'margin-top: 12px; padding-top: 8px; border-top: 1px solid #eef2ff; font-size: 0.75rem; color: #5b6e8c; text-align: center;';
        trendBox.appendChild(infoElem);
    }
    if (infoElem) {
        let formattedRate;
        const isVerySmall = Math.abs(currentRate) < 0.1;
        if (to === 'IDR' || from === 'IDR') {
            if (Math.abs(currentRate) > 100) formattedRate = Math.round(currentRate).toLocaleString('id-ID');
            else if (Math.abs(currentRate) > 1) formattedRate = currentRate.toFixed(2);
            else formattedRate = currentRate.toFixed(4);
        } else if (isVerySmall) formattedRate = currentRate.toFixed(6);
        else if (Math.abs(currentRate) > 1000) formattedRate = Math.round(currentRate).toLocaleString('id-ID');
        else formattedRate = currentRate.toFixed(4);
        const periodText = startDate && endDate ? `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}` : '';
        infoElem.innerHTML = `💰 Rate saat ini: <strong>1 ${from} = ${formattedRate} ${to}</strong> | 📅 Periode: ${periodText} | 📊 Total ${historicalData.length} hari data`;
    }
}

// ==================== WATCHLIST DINAMIS ====================
function loadWatchlistFromStorage() {
    const saved = localStorage.getItem('exchangeHubWatchlist');
    if (saved) {
        try { userWatchlist = JSON.parse(saved); }
        catch(e) { userWatchlist = getDefaultWatchlist(); }
    } else { userWatchlist = getDefaultWatchlist(); }
    renderWatchlist();
}

function getDefaultWatchlist() {
    return [
        { from: 'EUR', to: 'USD', name: 'EUR/USD' },
        { from: 'GBP', to: 'IDR', name: 'GBP/IDR' },
        { from: 'USD', to: 'IDR', name: 'USD/IDR' }
    ];
}

function saveWatchlistToStorage() {
    localStorage.setItem('exchangeHubWatchlist', JSON.stringify(userWatchlist));
}

function renderWatchlist() {
    const container = document.getElementById('watchlistDynamic');
    if (!container) return;
    const favorites = JSON.parse(localStorage.getItem('favoriteCurrencies') || '[]');
    let combinedWatchlist = [...userWatchlist];
    favorites.forEach(favCurrency => {
        if (!combinedWatchlist.some(item => item.to === favCurrency)) {
            combinedWatchlist.push({ from: 'IDR', to: favCurrency, name: `${favCurrency}/IDR` });
        }
    });
    if (combinedWatchlist.length === 0) {
        container.innerHTML = '<div class="watchlist-empty">📭 Belum ada mata uang di watchlist.<br>Klik ⭐ di tabel atau "Tambah" untuk menambahkan.</div>';
        return;
    }
    container.innerHTML = '';
    combinedWatchlist.forEach((item, index) => {
        const rate = getPairRate(item.from, item.to);
        const prevRate = previousRates[`${item.from}_${item.to}`] || rate;
        const changePercent = ((rate - prevRate) / prevRate) * 100;
        const isPositive = changePercent >= 0;
        const isFavorite = favorites.includes(item.to);
        let formattedRate;
        if (item.to === 'IDR') formattedRate = Math.round(rate).toLocaleString('id-ID');
        else if (Math.abs(rate) < 0.1) formattedRate = rate.toFixed(6);
        else if (Math.abs(rate) > 1000) formattedRate = Math.round(rate).toLocaleString('id-ID');
        else formattedRate = rate.toFixed(4);
        const watchlistItem = document.createElement('div');
        watchlistItem.className = 'watchlist-item';
        watchlistItem.innerHTML = `
            <div class="watchlist-info">
                <span class="pair-name">${item.name || `${item.from}/${item.to}`}${isFavorite ? '<i class="fa-solid fa-star" style="color: #f59e0b; font-size: 0.7rem; margin-left: 4px;"></i>' : ''}</span>
                <span class="pair-base">${item.from} → ${item.to}</span>
            </div>
            <div class="watchlist-rate">
                <span class="watch-rate">${formattedRate}</span>
                <span class="watch-change ${isPositive ? 'positive' : 'negative'}">${changePercent >= 0 ? '▲' : '▼'} ${Math.abs(changePercent).toFixed(2)}%</span>
            </div>
            <button class="watchlist-remove" data-currency="${item.to}" title="Hapus dari watchlist"><i class="fa-regular fa-trash-can"></i></button>
        `;
        container.appendChild(watchlistItem);
        previousRates[`${item.from}_${item.to}`] = rate;
    });
    document.querySelectorAll('.watchlist-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const currency = btn.dataset.currency;
            const index = userWatchlist.findIndex(item => item.to === currency);
            if (index !== -1) {
                userWatchlist.splice(index, 1);
                saveWatchlistToStorage();
            }
            renderWatchlist();
            showToast(`🗑️ ${currency} dihapus dari watchlist`);
        });
    });
}

function addToWatchlist(from, to) {
    if (userWatchlist.some(item => item.from === from && item.to === to)) {
        alert(`${from}/${to} sudah ada di watchlist!`);
        return false;
    }
    userWatchlist.push({ from, to, name: `${from}/${to}` });
    saveWatchlistToStorage();
    renderWatchlist();
    return true;
}

function removeFromWatchlist(index) {
    userWatchlist.splice(index, 1);
    saveWatchlistToStorage();
    renderWatchlist();
}

function updateModalPreview() {
    const currencySelect = document.getElementById('watchlistCurrencySelect');
    const baseSelect = document.getElementById('watchlistBaseSelect');
    const previewFrom = document.getElementById('previewFromCurrency');
    const previewTo = document.getElementById('previewToCurrency');
    const currencyFlagPreview = document.getElementById('currencyFlagPreview');
    const baseFlagPreview = document.getElementById('baseFlagPreview');
    if (currencySelect && baseSelect) {
        const toCurrency = currencySelect.value;
        const fromCurrency = baseSelect.value;
        if (previewFrom) previewFrom.textContent = fromCurrency;
        if (previewTo) previewTo.textContent = toCurrency;
        if (currencyFlagPreview && toCurrency) currencyFlagPreview.style.backgroundImage = `url('${getFlagImage(toCurrency)}')`;
        if (baseFlagPreview && fromCurrency) baseFlagPreview.style.backgroundImage = `url('${getFlagImage(fromCurrency)}')`;
    }
}

function initWatchlistModal() {
    const modal = document.getElementById('watchlistModal');
    const addBtn = document.getElementById('addToWatchlistBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const confirmBtn = document.getElementById('confirmAddWatchlistBtn');
    const currencySelect = document.getElementById('watchlistCurrencySelect');
    const baseSelect = document.getElementById('watchlistBaseSelect');
    if (!modal || !addBtn) return;
    if (currencySelect && Object.keys(currentRates).length > 0) {
        currencySelect.innerHTML = '';
        Object.keys(currentRates).sort().forEach(curr => {
            const option = document.createElement('option');
            option.value = curr;
            option.textContent = `${curr} - ${getCurrencyName(curr)}`;
            currencySelect.appendChild(option);
        });
        currencySelect.value = 'IDR';
        if (baseSelect) baseSelect.value = 'USD';
        updateModalPreview();
    }
    if (currencySelect) currencySelect.addEventListener('change', updateModalPreview);
    if (baseSelect) baseSelect.addEventListener('change', updateModalPreview);
    addBtn.onclick = () => { modal.style.display = 'flex'; updateModalPreview(); };
    const closeModal = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const to = currencySelect ? currencySelect.value : 'IDR';
            const from = baseSelect ? baseSelect.value : 'USD';
            if (addToWatchlist(from, to)) closeModal();
        };
    }
}

// ==================== CHART INIT ====================
function initChart() {
    const canvas = document.getElementById('trendChartCanvas');
    if (!canvas) return;
    for (let i = 0; i < 7; i++) historicalData.push(15600 + (Math.random() * 100));
    trendChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'Kemarin', 'Hari Ini'], datasets: [{ data: historicalData, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.03)', borderWidth: 2.5, pointRadius: 3.5, pointBackgroundColor: '#2563eb', pointBorderColor: 'white', tension: 0.2, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `USD/IDR: ${Math.round(ctx.raw).toLocaleString('id-ID')}` } } }, scales: { y: { ticks: { callback: (val) => val.toLocaleString('id-ID') }, grid: { color: '#eef2ff' } } } }
    });
}

// ==================== POPULATE SELECTORS ====================
function populateSelectors() {
    const fromSelect = document.getElementById('fromCurr');
    const toSelect = document.getElementById('toCurr');
    if (!fromSelect || !toSelect) return;
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    Object.keys(currentRates).sort().forEach(curr => {
        const label = `${curr} - ${getCurrencyName(curr)}`;
        fromSelect.add(new Option(label, curr));
        toSelect.add(new Option(label, curr));
    });
    fromSelect.value = 'USD';
    toSelect.value = 'IDR';
    if (fromTomSelect) fromTomSelect.destroy();
    if (toTomSelect) toTomSelect.destroy();
    const tomConfig = {
        create: false,
        sortField: { field: "text", direction: "asc" },
        render: {
            option: (data, escape) => `<div style="display:flex;align-items:center;"><img src="${getFlagImage(data.value)}" style="width:20px;height:14px;margin-right:8px;"><span>${escape(data.text)}</span></div>`,
            item: (data, escape) => `<div style="display:flex;align-items:center;"><img src="${getFlagImage(data.value)}" style="width:20px;height:14px;margin-right:4px;"><span>${escape(data.text)}</span></div>`
        }
    };
    fromTomSelect = new TomSelect("#fromCurr", tomConfig);
    toTomSelect = new TomSelect("#toCurr", tomConfig);
    fromTomSelect.on('change', () => { updateChartForPair(fromTomSelect.getValue(), toTomSelect.getValue(), 30); updateConversionDisplay(); });
    toTomSelect.on('change', () => { updateChartForPair(fromTomSelect.getValue(), toTomSelect.getValue(), 30); updateConversionDisplay(); });
}

// ==================== REFRESH ALL DATA ====================
async function refreshAllData() {
    console.log('Refreshing data...');
    const success = await fetchExchangeRates();
    if (success || Object.keys(currentRates).length > 0) {
        await updateRealtimeRates();
        updateConversionDisplay();
        const from = currentChartFrom, to = currentChartTo, newRate = getPairRate(from, to);
        if (historicalData.length > 0 && historicalDates.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            if (historicalDates[historicalDates.length - 1] !== today) {
                historicalData.shift();
                historicalDates.shift();
                historicalData.push(newRate);
                historicalDates.push(today);
            } else {
                historicalData[historicalData.length - 1] = newRate;
            }
        }
        if (trendChart) trendChart.data.datasets[0].data = [...historicalData];
        trendChart?.update();
    }
}

// ==================== INITIALIZATION ====================
async function init() {
    console.log('Initializing application...');
    setupAmountInput();
    initChart();
    await refreshAllData();
    if (Object.keys(currentRates).length > 0) {
        populateSelectors();
        await updateChartForPair(document.getElementById('fromCurr').value, document.getElementById('toCurr').value, 30);
    }
    loadWatchlistFromStorage();
    initWatchlistModal();
    setupExchangeTableEvents();
    await renderEnhancedExchangeTable();
    updateConversionDisplay();
    setInterval(refreshAllData, 60000);
    document.getElementById('convertNowBtn')?.addEventListener('click', updateConversionDisplay);
    document.getElementById('amount')?.addEventListener('input', () => { document.getElementById('conversionResult').innerHTML = '—'; });
    document.getElementById('swapBtn')?.addEventListener('click', () => {
        if (fromTomSelect && toTomSelect) {
            const fromVal = fromTomSelect.getValue(), toVal = toTomSelect.getValue();
            document.getElementById('swapBtn').style.transform = "rotate(180deg)";
            setTimeout(() => document.getElementById('swapBtn').style.transform = "rotate(0deg)", 300);
            fromTomSelect.setValue(toVal);
            toTomSelect.setValue(fromVal);
            updateChartForPair(toVal, fromVal, 30);
            updateConversionDisplay();
        }
    });
    const presetRangeSelect = document.getElementById('presetRangeSelect');
    const customDatePanel = document.getElementById('customDatePanel');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const applyCustomRangeBtn = document.getElementById('applyCustomRange');
    const today = new Date();
    const defaultStart = new Date(); defaultStart.setDate(today.getDate() - 30);
    if (startDateInput) startDateInput.value = defaultStart.toISOString().split('T')[0];
    if (endDateInput) endDateInput.value = today.toISOString().split('T')[0];
    presetRangeSelect?.addEventListener('change', async (e) => {
        if (e.target.value === 'custom') {
            if (customDatePanel) customDatePanel.style.display = 'flex';
        } else {
            if (customDatePanel) customDatePanel.style.display = 'none';
            await updateChartForPair(currentChartFrom, currentChartTo, parseInt(e.target.value));
        }
    });
    applyCustomRangeBtn?.addEventListener('click', async () => {
        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);
        if (start > end) { alert('Tanggal awal harus lebih kecil dari tanggal akhir!'); return; }
        if (start < new Date(1999, 0, 1)) { alert('Data hanya tersedia dari Januari 1999.'); return; }
        if (end > today) { alert('Tanggal akhir tidak boleh melebihi hari ini!'); return; }
        const btn = applyCustomRangeBtn;
        const originalText = btn.innerText;
        btn.innerText = 'Memuat...';
        btn.disabled = true;
        await updateChartWithDateRange(currentChartFrom, currentChartTo, start, end);
        btn.innerText = originalText;
        btn.disabled = false;
        if (presetRangeSelect) presetRangeSelect.value = 'custom';
    });
    console.log('Initialization complete');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}