/**
 * ArenoX V2 — core.js الموحّد
 * بطولة 64 لاعب + نظام بطولة مخصصة مدفوعة
 */

// ── CONFIG ──────────────────────────────────────────
const ARENOX = {
  SCRIPT_URL:      'https://script.google.com/macros/s/AKfycby69DIPSN2VRDD5gEPYK8dpD7Zm9isM2jnUKDOaHkQ1s3qqCjM_R53Tntzp36CU5FdG/exec',
  SERVICES_URL:    'https://script.google.com/macros/s/AKfycby69DIPSN2VRDD5gEPYK8dpD7Zm9isM2jnUKDOaHkQ1s3qqCjM_R53Tntzp36CU5FdG/exec',
  MAX_PLAYERS:     128,
  ASIA_NUM:        '07XX-XXX-XXXX',
  ZAIN_NUM:        '07XX-XXX-XXXX',
  WHATSAPP:        '9647XXXXXXXXX',
  TELEGRAM:        'https://t.me/arenox7',
  SITE:            'ArenoX',
};

// ── UTILS ──────────────────────────────────────────
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

function genId() {
  return 'ARX-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2,4).toUpperCase();
}

function fmtDate(d = new Date()) {
  return d.toLocaleDateString('ar-IQ', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

/**
 * تنسيق الأرقام بفواصل آلاف لكن بأرقام إنجليزية (0-9) دائماً — وليس عربية هندية (٠-٩).
 * السبب: خطوط الموقع التقنية مثل Orbitron لا تدعم رسم الأرقام العربية الهندية،
 * فاستخدام toLocaleString('ar') يجعل الأرقام تظهر فارغة أو مشوّهة بصرياً.
 * استخدم هذه الدالة بدل toLocaleString('ar') بكل مكان بالموقع.
 */
function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function toast(msg, type = 'info', dur = 4500) {
  const palette = { success:'#00e676', error:'#ff1744', warning:'#ffaa00', info:'#00f2fe' };
  const bg      = { success:'rgba(0,230,118,0.1)', error:'rgba(255,23,68,0.1)', warning:'rgba(255,170,0,0.1)', info:'rgba(0,242,254,0.1)' };
  const el = document.createElement('div');
  el.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'times-circle':type==='warning'?'exclamation-triangle':'info-circle'}"></i> ${msg}`;
  Object.assign(el.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:'9999',
    background: bg[type], border:`1.5px solid ${palette[type]}`,
    color: palette[type], padding:'15px 22px', borderRadius:'14px',
    fontFamily:'Cairo,sans-serif', fontWeight:'700', fontSize:'1rem',
    maxWidth:'330px', lineHeight:'1.55',
    boxShadow:`0 8px 32px rgba(0,0,0,0.55), 0 0 20px ${palette[type]}44`,
    display:'flex', alignItems:'center', gap:'10px',
    transition:'all .35s ease', opacity:'0', transform:'translateY(10px)',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='none'; });
  setTimeout(() => {
    el.style.opacity='0'; el.style.transform='translateY(10px)';
    setTimeout(() => el.remove(), 360);
  }, dur);
}

function setLoading(btn, on) {
  if (on) {
    btn._txt = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> جاري المعالجة...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._txt || 'إرسال';
    btn.disabled = false;
  }
}

function showNotif(msg, type = 'info', elId = 'notifBox') {
  const el = document.getElementById(elId);
  if (!el) return;
  const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
  el.innerHTML = `<div class="notif notif-${type}"><i class="fas ${icons[type]}"></i>${msg}</div>`;
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  if (type !== 'error') setTimeout(() => { if (el) el.innerHTML = ''; }, 7000);
}

function showSuccess(container, orderId, extra = '') {
  container.innerHTML = `
    <div class="success-state">
      <div class="success-icon">✅</div>
      <h3>تم استلام طلبك!</h3>
      <p>سيتواصل معك الفريق خلال 24 ساعة.</p>
      <div class="order-id-tag">${orderId}</div>
      ${extra}
      <div class="flex mt-24" style="justify-content:center;flex-wrap:wrap;gap:12px">
        <a href="https://wa.me/${ARENOX.WHATSAPP}?text=طلبي+${orderId}" target="_blank" class="btn btn-success btn-sm">
          <i class="fab fa-whatsapp"></i> متابعة واتساب
        </a>
        <a href="${ARENOX.TELEGRAM}" target="_blank" class="btn btn-outline btn-sm">
          <i class="fab fa-telegram"></i> تيليجرام
        </a>
      </div>
    </div>`;
}

function validateForm(form) {
  let ok = true;
  $$('[required]', form).forEach(f => {
    if (!f.value.trim()) { f.style.borderColor='var(--red)'; ok=false; }
    else f.style.borderColor='';
  });
  if (!ok) toast('يرجى تعبئة جميع الحقول المطلوبة', 'warning');
  return ok;
}

// ── FETCH TO SHEET ──────────────────────────────────
async function postToSheet(url, data) {
  try {
    await fetch(url, {
      method:'POST', mode:'no-cors',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ ...data, timestamp: fmtDate(), orderId: data.orderId || genId() }),
    });
    return { success:true, orderId: data.orderId || genId() };
  } catch(e) { return { success:false, error:e.message }; }
}

async function sendToServices(data) { return postToSheet(ARENOX.SERVICES_URL, data); }

// ── TOURNAMENT COUNT ────────────────────────────────
let _count = 0;

function loadCount(cb) {
  fetch(ARENOX.SCRIPT_URL)
    .then(r => r.text())
    .then(t => { _count = parseInt(t) || 0; if(cb) cb(_count); })
    .catch(() => { if(cb) cb(_count); });
}

function updateCounter(elId = 'counterBox') {
  const el = document.getElementById(elId);
  if (!el) return;
  const rem = ARENOX.MAX_PLAYERS - _count;
  if (rem <= 0) {
    el.innerHTML = `<span style="color:var(--red);font-size:1.1rem">●</span> اكتملت بطولة الـ 64 — ترقّب الجولة القادمة!`;
  } else {
    el.innerHTML = `
      <span style="color:var(--green);font-size:1.1rem">●</span>
      المقاعد المتبقية: <b style="color:var(--cyan);font-family:'Orbitron',sans-serif">${rem}</b>
      <span style="color:var(--muted);font-size:.85rem">/ ${ARENOX.MAX_PLAYERS} — المسجلون: <b style="color:var(--violet)">${_count}</b></span>`;
  }
}

// ── REGISTER PLAYER ─────────────────────────────────
async function registerPlayer(data) {
  if (_count >= ARENOX.MAX_PLAYERS) return { success:false, message:'البطولة مكتملة — تابع للجولة القادمة!' };
  try {
    await fetch(ARENOX.SCRIPT_URL, {
      method:'POST', mode:'no-cors',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ action:'register', ...data }),
    });
    _count++;
    return { success:true };
  } catch(e) { return { success:false, message:'خطأ في الاتصال، حاول مجدداً.' }; }
}

// ── BRACKET ─────────────────────────────────────────
function loadBracket(displayId = 'bracketDisplay', filterId = 'bracketFilter', defaultFilter = '') {
  const display  = document.getElementById(displayId);
  const filterEl = document.getElementById(filterId);
  if (!display) return;
  const activeFilter = filterEl?.value || defaultFilter;
  const q = activeFilter ? `?get=bracket&tournament=${activeFilter}` : '?get=bracket';
  display.innerHTML = `<div style="text-align:center;padding:40px;width:100%"><span class="spinner spinner-lg" style="width:32px;height:32px;border-width:3px"></span><p style="margin-top:14px;color:var(--muted)">جاري التحميل...</p></div>`;

  fetch(ARENOX.SCRIPT_URL + q)
    .then(r => r.json())
    .then(data => {
      if (!data?.rounds?.length) {
        display.innerHTML = `
          <div style="text-align:center;padding:52px 20px;width:100%">
            <div style="font-size:4rem;margin-bottom:18px">🏟️</div>
            <h3 style="color:var(--muted);font-weight:700;margin-bottom:8px">لا توجد مباريات نشطة</h3>
            <p style="color:var(--muted);font-size:.95rem">انتظر اكتمال التسجيل لبدء القرعة الرسمية!</p>
          </div>`;
        return;
      }
      display.innerHTML = '';
      const inner = document.createElement('div');
      inner.className = 'bracket-inner';

      data.rounds.forEach((round, idx) => {
        const col = document.createElement('div');
        col.className = 'b-round';
        col.innerHTML = `<div class="b-round-title">${round.roundName || `الدور ${idx+1}`}</div>`;
        round.matches.forEach(m => {
          const statusCls = m.status==='منتهية'?'status-done':m.status==='جارية'||m.status==='جارية الآن'?'status-live':'status-pending';
          const p1w = m.winner && m.winner===m.player1;
          const p2w = m.winner && m.winner===m.player2;
          col.innerHTML += `
            <div class="b-match">
              <div class="b-match-head">
                <span class="b-match-id">#${m.matchId||'—'}</span>
                <span class="badge ${statusCls}">${m.status||'قادمة'}</span>
              </div>
              ${m.date?`<div class="b-match-date"><i class="fas fa-calendar-alt" style="color:var(--cyan);margin-left:5px"></i>${m.date}</div>`:''}
              <div class="b-player ${p1w?'winner':''}">
                <span>👤 ${m.player1||'بانتظار المتأهل'}</span>
                ${p1w?'<span title="الفائز">👑</span>':''}
              </div>
              <div class="b-vs">— VS —</div>
              <div class="b-player ${p2w?'winner':''}">
                <span>👤 ${m.player2||'بانتظار المتأهل'}</span>
                ${p2w?'<span title="الفائز">👑</span>':''}
              </div>
            </div>`;
        });
        inner.appendChild(col);
      });
      display.appendChild(inner);
    })
    .catch(() => {
      display.innerHTML = `<p style="text-align:center;color:var(--red);padding:36px;width:100%"><i class="fas fa-exclamation-triangle"></i> تعذّر جلب الشجرة، حاول لاحقاً.</p>`;
    });
}

// ── RANKINGS ────────────────────────────────────────
function loadRankings(tbodyId = 'rankDisplay') {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--muted)"><span class="spinner"></span></td></tr>`;
  fetch(ARENOX.SCRIPT_URL + '?get=rankings')
    .then(r => r.json())
    .then(list => {
      if (!list?.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--muted)">لا توجد تصنيفات بعد — كن أول المتصدرين!</td></tr>`;
        return;
      }
      const medals = ['🥇','🥈','🥉'];
      tbody.innerHTML = list.map((p,i) => `
        <tr>
          <td style="font-weight:800;color:var(--violet);font-size:1.15rem">${medals[i]||i+1}</td>
          <td style="font-weight:700;font-size:1rem">${p.name||'—'}</td>
          <td style="color:var(--green);font-weight:800;font-family:'Orbitron',sans-serif">${fmtNum(p.points)}</td>
          <td style="color:var(--muted)">${p.played||0}</td>
        </tr>`).join('');
    })
    .catch(() => {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--red);padding:28px">خطأ في التحميل.</td></tr>`;
    });
}

// ── TABS ────────────────────────────────────────────
function switchTab(tabId, container, bracketFilter = '') {
  const ctx = container ? document.getElementById(container) : document;
  $$(`.tab-pane`, ctx).forEach(p => p.classList.remove('active'));
  $$(`.tab-btn`,  ctx).forEach(b => b.classList.remove('active'));
  const pane = document.getElementById(tabId);
  const btn  = document.getElementById('btn-'+tabId);
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
  if (tabId === 'tab-bracket')  loadBracket('bracketDisplay', 'bracketFilter', bracketFilter);
  if (tabId === 'tab-rankings') loadRankings();
}

// ── PAYMENT SYSTEM ──────────────────────────────────
class PaySys {
  constructor(boxId) {
    this.box    = document.getElementById(boxId);
    this.method = null;
    if (this.box) this._init();
  }
  _init() {
    $$('.pay-tab', this.box).forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.pay-tab',    this.box).forEach(t => t.classList.remove('active'));
        $$('.pay-content',this.box).forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const cnt = this.box.querySelector('#' + tab.dataset.tab);
        if (cnt) cnt.classList.add('active');
        this.method = null;
      });
    });
    $$('.pay-method', this.box).forEach(card => {
      card.addEventListener('click', () => {
        $$('.pay-method', card.closest('.pay-content')).forEach(c => c.classList.remove('sel'));
        card.classList.add('sel');
        this.method = card.dataset.method;
        this._showDetail(card.dataset.method);
      });
    });
  }
  _showDetail(m) {
    $$('.pay-detail', this.box).forEach(d => d.classList.remove('open'));
    const d = this.box.querySelector(`[data-detail="${m}"]`);
    if (d) d.classList.add('open');
  }
  ok()   { if (!this.method) { toast('اختر طريقة الدفع أولاً','warning'); return false; } return true; }
  data() { return { paymentMethod: this.method }; }
}

// ── MODAL ───────────────────────────────────────────
class Modal {
  constructor(id) {
    this.el = document.getElementById(id);
    if (!this.el) return;
    this.el.addEventListener('click', e => { if (e.target===this.el) this.close(); });
    const cb = this.el.querySelector('.modal-close');
    if (cb) cb.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key==='Escape') this.close(); });
  }
  open()  { this.el?.classList.add('open');    document.body.style.overflow='hidden'; }
  close() { this.el?.classList.remove('open'); document.body.style.overflow=''; }
}

// ══════════════════════════════════════════════════
//  CUSTOM TOURNAMENT SYSTEM (البطولة المخصصة)
// ══════════════════════════════════════════════════
const CustomTournament = {
  players:  [],
  size:     16,
  name:     '',
  game:     '',
  bracket:  [],

  /** إضافة لاعب */
  addPlayer(name = '') {
    if (this.players.length >= this.size) { toast(`الحد الأقصى ${this.size} لاعب`,'warning'); return; }
    this.players.push({ id: Date.now(), name: name.trim() });
    this.renderPlayersList();
    this.renderPreview();
  },

  /** حذف لاعب */
  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
    this.renderPlayersList();
    this.renderPreview();
  },

  /** تحديث اسم لاعب */
  updatePlayer(id, name) {
    const p = this.players.find(p => p.id === id);
    if (p) { p.name = name; this.renderPreview(); }
  },

  /** إنشاء قوائم إدخال اللاعبين */
  renderPlayersList(containerId = 'playersList') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    for (let i=0; i<this.size; i++) {
      const p    = this.players[i];
      const div  = document.createElement('div');
      div.className = 'player-input-row';
      div.innerHTML = `
        <div class="player-num">${i+1}</div>
        <input type="text" placeholder="اسم اللاعب ${i+1}"
          value="${p?.name||''}"
          oninput="CustomTournament.setPlayerAt(${i}, this.value)"
          maxlength="40">
        ${p ? `<button class="remove-player-btn" onclick="CustomTournament.removeAt(${i})" title="حذف"><i class="fas fa-times"></i></button>` : '<div style="width:28px"></div>'}`;
      el.appendChild(div);
    }
    this.updateProgress();
  },

  setPlayerAt(idx, name) {
    if (!this.players[idx]) this.players[idx] = { id: Date.now()+idx, name: '' };
    this.players[idx].name = name.trim();
    this.renderPreview();
    this.updateProgress();
  },

  removeAt(idx) {
    this.players.splice(idx, 1);
    this.renderPlayersList();
    this.renderPreview();
  },

  updateProgress() {
    const filled = this.players.filter(p => p?.name).length;
    const el = document.getElementById('playersProgress');
    if (el) el.textContent = `${filled} / ${this.size} لاعب`;
    const bar = document.getElementById('playersBar');
    if (bar) bar.style.width = `${(filled/this.size)*100}%`;
  },

  /** معاينة القرعة */
  renderPreview(containerId = 'bracketPreview') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const named = this.players.filter(p => p?.name);
    if (named.length < 2) {
      el.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">أضف لاعبَين على الأقل لرؤية القرعة</p>';
      return;
    }
    const pairs = [];
    for (let i=0; i<named.length-1; i+=2) {
      pairs.push({ p1: named[i].name, p2: named[i+1]?.name || 'بانتظار' });
    }
    el.innerHTML = `
      <h4 style="color:var(--violet);margin-bottom:14px;font-size:1rem"><i class="fas fa-sitemap"></i> معاينة الدور الأول</h4>
      ${pairs.map((pair,i) => `
        <div class="preview-match">
          <span class="badge badge-purple" style="font-size:.7rem;min-width:28px;justify-content:center">${i+1}</span>
          <span class="p-name">${pair.p1}</span>
          <span class="vs">VS</span>
          <span class="p-name">${pair.p2}</span>
        </div>`).join('')}
      ${named.length % 2 !== 0 ? `<p style="color:var(--gold);font-size:.85rem;margin-top:10px;text-align:center"><i class="fas fa-info-circle"></i> ${named[named.length-1].name} يحصل على تأهل مباشر</p>` : ''}`;
  },

  /** توليد الشجرة الكاملة للإرسال */
  generateBracket() {
    const named = this.players.filter(p => p?.name).map(p => p.name);
    if (named.length < 4) { toast('يلزم 4 لاعبين على الأقل','warning'); return null; }
    // قرعة عشوائية
    const shuffled = [...named].sort(() => Math.random() - 0.5);
    const rounds = [];
    let current = [...shuffled];
    const roundNames = this._roundNames(current.length);

    roundNames.forEach((rn, ri) => {
      const matches = [];
      for (let i=0; i<current.length-1; i+=2) {
        matches.push({ matchId:`R${ri+1}M${i/2+1}`, player1:current[i], player2:current[i+1]||'بانتظار', status:'قادمة' });
      }
      rounds.push({ roundName: rn, matches });
      current = Array(Math.ceil(current.length/2)).fill('بانتظار المتأهل');
    });
    return rounds;
  },

  _roundNames(n) {
    const all = ['دور الـ128','دور الـ64','دور الـ32','دور الـ16','ربع النهائي','نصف النهائي','النهائي'];
    const needed = Math.ceil(Math.log2(n));
    return all.slice(all.length - needed);
  },

  /** إعادة التعيين */
  reset() {
    this.players = []; this.size = 16; this.name = ''; this.game = '';
    this.renderPlayersList(); this.renderPreview();
  },
};

// ── NAV ACTIVE ──────────────────────────────────────
function setActiveNav() {
  const cur = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href')||'').split('/').pop();
    a.classList.toggle('active', href === cur);
  });
}

// ── INIT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) links.classList.remove('open');
    });
  }
});

// ── EXPORT ──────────────────────────────────────────
window.ARENOX = ARENOX;
window.CustomTournament = CustomTournament;
window.$ = $; window.$$ = $$;
window.genId = genId; window.fmtDate = fmtDate; window.fmtNum = fmtNum;
window.toast = toast; window.setLoading = setLoading;
window.showNotif = showNotif; window.showSuccess = showSuccess;
window.validateForm = validateForm;
window.sendToServices = sendToServices; window.registerPlayer = registerPlayer;
window.loadCount = loadCount; window.updateCounter = updateCounter;
window.loadBracket = loadBracket; window.loadRankings = loadRankings;
window.switchTab = switchTab;
window.PaySys = PaySys; window.Modal = Modal;
