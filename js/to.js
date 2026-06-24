const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbz1WiE_djzWMAMpnr2wDkiKDfzj_En14V6J5uKVWvdccFY6N5jhaJCHFrwrE1HpyDXxAA/exec';

const flagsMap = {
  'العراق': '🇮🇶', 'مصر': '🇪🇬', 'السعودية': '🇸🇦', 'المغرب': '🇲🇦',
  'الجزائر': '🇩🇿', 'تونس': '🇹🇳', 'ليبيا': '🇱🇾', 'اليمن': '🇾🇪',
  'سوريا': '🇸🇾', 'الأردن': '🇯🇴', 'فلسطين': '🇵🇸', 'لبنان': '🇱🇧',
  'الكويت': '🇰🇼', 'الإمارات': '🇦🇪', 'قطر': '🇶🇦', 'عمان': '🇴🇲',
  'البحرين': '🇧🇭', 'السودان': '🇸🇩'
};

const statusMap = {
  'up': '⬆️ صاعد',
  'down': '⬇️ هابط',
  'stable': '➖ مستقر'
};

let allPlayers = [];
let lastUpdateTime = '';

// عناصر DOM
const loadingScreen = document.getElementById('loading-screen');
const toast = document.getElementById('toast');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sortSelect = document.getElementById('sort-select');
const refreshBtn = document.getElementById('refresh-button');
const tbody = document.getElementById('ranking-data');
const statPlayers = document.getElementById('stat-players');
const statCountries = document.getElementById('stat-countries');
const statMaxPoints = document.getElementById('stat-max-points');
const statTotalTitles = document.getElementById('stat-total-titles');
const lastUpdateSpan = document.getElementById('last-update-time');
const podiumSection = document.getElementById('podium-section');
const podiumNames = ['podium-1-name', 'podium-2-name', 'podium-3-name'];
const podiumPts = ['podium-1-pts', 'podium-2-pts', 'podium-3-pts'];

// === كود الهامبرغر (يُضاف هنا) ===
function initHamburger() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!toggleBtn || !navLinks) {
    console.warn('⚠️ عناصر الهامبرغر غير موجودة في الصفحة');
    return;
  }

  // فتح/إغلاق القائمة
  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    navLinks.classList.toggle('open');
  });

  // إغلاق القائمة عند النقر خارجها
  document.addEventListener('click', function(e) {
    const isClickInside = navLinks.contains(e.target) || toggleBtn.contains(e.target);
    if (!isClickInside) {
      navLinks.classList.remove('open');
    }
  });

  // منع إغلاق القائمة عند النقر على الروابط داخلها (اختياري)
  navLinks.addEventListener('click', function(e) {
    e.stopPropagation();
  });
}

// === وظائف مساعدة ===
function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className = type;
  toast.style.display = 'block';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function getFlag(country) {
  return flagsMap[country] || '🏳️';
}

function getStatusBadge(status) {
  const label = statusMap[status] || '➖';
  return `<span class="status-badge ${status}">${label}</span>`;
}

// === جلب البيانات (مع Cache سريع) ===
async function fetchRankings(showLoading = true) {
  if (showLoading) {
    refreshBtn.classList.add('rotating');
    loadingScreen.classList.remove('hide');
  }

  try {
    const res = await fetch(SHEET_API_URL, { method: 'GET', mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);

    allPlayers = json.data || [];
    lastUpdateTime = json.lastUpdate || new Date().toLocaleString('ar-EG');
    
    applyFiltersAndRender();
    updateStats();
    updatePodium();
    updateLastUpdate();
    
    if (showLoading) {
      showToast(`✅ تم التحديث (${allPlayers.length} لاعب)`, 'success');
    }
  } catch (err) {
    console.error(err);
    if (showLoading) {
      showToast('⚠️ فشل التحميل: ' + err.message, 'error');
    }
    if (allPlayers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:30px;color:#ff4a4a;">⚠️ تعذر تحميل البيانات</td></tr>`;
    }
  } finally {
    if (showLoading) {
      loadingScreen.classList.add('hide');
      refreshBtn.classList.remove('rotating');
    }
  }
}

// === التصفية والفرز ===
function applyFiltersAndRender() {
  const term = searchInput.value.trim().toLowerCase();
  let filtered = allPlayers.filter(p => p.name.toLowerCase().includes(term));

  const sortBy = sortSelect.value;
  if (sortBy === 'points') filtered.sort((a, b) => b.points - a.points);
  else if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'titles') filtered.sort((a, b) => b.titles - a.titles);
  else if (sortBy === 'matches') filtered.sort((a, b) => b.matches - a.matches);
  else filtered.sort((a, b) => a.currentRank - b.currentRank);

  renderTable(filtered);
  clearSearchBtn.classList.toggle('visible', term.length > 0);
}

// === عرض الجدول مع ألوان حسب الترتيب ===
function renderTable(players) {
  if (!players.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:30px;color:var(--text-muted);">لا توجد نتائج</td></tr>`;
    return;
  }

  let html = '';
  players.forEach(p => {
    let rankClass = 'rank-other';
    const rank = p.currentRank;
    if (rank === 1) rankClass = 'rank-1';
    else if (rank === 2) rankClass = 'rank-2';
    else if (rank === 3) rankClass = 'rank-3';
    else if (rank >= 4 && rank <= 10) rankClass = `rank-${rank}`;
    else rankClass = 'rank-other';

    let rankHtml = rank;
    if (rank === 1) rankHtml = '<span class="medal">🥇</span> 1';
    else if (rank === 2) rankHtml = '<span class="medal">🥈</span> 2';
    else if (rank === 3) rankHtml = '<span class="medal">🥉</span> 3';

    const flag = getFlag(p.country);
    const statusBadge = getStatusBadge(p.status);
    const titlesDisplay = p.titles > 0 ? `🏆 ${p.titles}` : '0';

    html += `<tr class="${rankClass}">
      <td class="rank text-center">${rankHtml}</td>
      <td class="player-name">${p.name}</td>
      <td class="player-flag text-center">${flag} ${p.country}</td>
      <td class="matches text-center">${p.matches}</td>
      <td class="titles text-center">${titlesDisplay}</td>
      <td class="points text-center">${p.points} PTS</td>
      <td class="text-center">${statusBadge}</td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function updateStats() {
  statPlayers.textContent = allPlayers.length;
  const countries = new Set(allPlayers.map(p => p.country));
  statCountries.textContent = countries.size;
  const maxPts = allPlayers.reduce((max, p) => Math.max(max, p.points), 0);
  statMaxPoints.textContent = maxPts + ' PTS';
  const totalTitles = allPlayers.reduce((sum, p) => sum + p.titles, 0);
  statTotalTitles.textContent = totalTitles;
}

function updatePodium() {
  if (allPlayers.length >= 3) {
    for (let i = 0; i < 3; i++) {
      document.getElementById(podiumNames[i]).textContent = allPlayers[i].name;
      document.getElementById(podiumPts[i]).textContent = allPlayers[i].points + ' PTS';
    }
    podiumSection.style.display = 'flex';
  } else {
    podiumSection.style.display = 'none';
  }
}

function updateLastUpdate() {
  lastUpdateSpan.textContent = lastUpdateTime || 'الآن';
}

// === حدث عند العودة للصفحة (تحديث سريع) ===
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetchRankings(false);
  }
});

// === أحداث المستخدم (البحث، الفرز، التحديث) ===
searchInput.addEventListener('input', applyFiltersAndRender);
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  applyFiltersAndRender();
  searchInput.focus();
});
sortSelect.addEventListener('change', applyFiltersAndRender);
refreshBtn.addEventListener('click', () => fetchRankings(true));

// === تحميل أولي وتحديث دوري ===
fetchRankings(true);
setInterval(() => fetchRankings(false), 300000);

// === تشغيل الهامبرغر عند تحميل الصفحة ===
// نضعه في نفس المستمع لضمان أن العناصر موجودة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHamburger);
} else {
  initHamburger();
}