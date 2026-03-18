/* ── TSUNDOKU · VOICE MEMOS ─────────────────────────────────────
   Standalone module. Drop voice.js in repo root, then add
   <script src="voice.js"></script> just before </body> in index.html
   ─────────────────────────────────────────────────────────────── */

const VoiceMemos = (() => {

  /* ── DB SETUP ────────────────────────────────────────────────── */
  const DB_NAME   = 'TsundokuVoice';
  const DB_VER    = 1;
  const STORE     = 'memos';
  let   db        = null;

  function openDB() {
    return new Promise((res, rej) => {
      if (db) return res(db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const s = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          s.createIndex('bookPage', ['bookId', 'page'], { unique: false });
          s.createIndex('bookId',   'bookId',           { unique: false });
        }
      };
      req.onsuccess = e => { db = e.target.result; res(db); };
      req.onerror   = () => rej(req.error);
    });
  }

  async function saveMemo(bookId, page, blob) {
    const d    = await openDB();
    const tx   = d.transaction(STORE, 'readwrite');
    const memo = { bookId, page, blob, ts: Date.now() };
    return new Promise((res, rej) => {
      const req     = tx.objectStore(STORE).add(memo);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function getMemosForBook(bookId) {
    const d  = await openDB();
    const tx = d.transaction(STORE, 'readonly');
    return new Promise((res, rej) => {
      const idx = tx.objectStore(STORE).index('bookId');
      const req = idx.getAll(bookId);
      req.onsuccess = () => res(req.result || []);
      req.onerror   = () => rej(req.error);
    });
  }

  async function getMemosForPage(bookId, page) {
    const all = await getMemosForBook(bookId);
    return all.filter(m => m.page === page);
  }

  async function deleteMemo(id) {
    const d  = await openDB();
    const tx = d.transaction(STORE, 'readwrite');
    return new Promise((res, rej) => {
      const req     = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  /* ── STATE ───────────────────────────────────────────────────── */
  let mediaRecorder  = null;
  let audioChunks    = [];
  let isRecording    = false;
  let currentBookId  = null;
  let currentPage    = 1;
  let getPageFn      = () => currentPage;
  let getBookFn      = () => currentBookId;

  /* ── UI INJECTION ────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('vm-styles')) return;
    const s = document.createElement('style');
    s.id = 'vm-styles';
    s.textContent = `
      /* mic button floating in reader */
      #vm-btn {
        position: fixed;
        bottom: 110px;
        right: calc(50% - 240px + 18px);
        width: 46px; height: 46px;
        border-radius: 50%;
        background: var(--surf, #fff);
        border: 1.5px solid var(--bdr, #E8C5D0);
        color: var(--acc, #6B2737);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 350;
        box-shadow: 0 4px 16px rgba(107,39,55,.25);
        transition: background .2s, transform .15s;
        cursor: pointer;
      }
      @media(max-width:480px){ #vm-btn { right: 72px; } }
      #vm-btn.reader-visible { display: flex; }
      #vm-btn.recording {
        background: var(--acc, #6B2737);
        color: #fff;
        animation: vm-pulse 1.2s ease-in-out infinite;
      }
      @keyframes vm-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(107,39,55,.5); }
        50%      { box-shadow: 0 0 0 10px rgba(107,39,55,0); }
      }

      /* page memo indicator dot */
      .vm-dot {
        position: absolute;
        top: 10px; right: 10px;
        width: 10px; height: 10px;
        background: var(--acc, #6B2737);
        border-radius: 50%;
        cursor: pointer;
        z-index: 200;
        box-shadow: 0 0 0 3px rgba(107,39,55,.2);
      }

      /* memo tray overlay */
      #vm-tray {
        position: fixed;
        inset: 0;
        z-index: 700;
        display: none;
        align-items: flex-end;
        justify-content: center;
        background: rgba(0,0,0,.55);
        backdrop-filter: blur(4px);
      }
      #vm-tray.open { display: flex; }
      .vm-sheet {
        background: var(--surf, #fff);
        width: 100%; max-width: 480px;
        border-radius: 24px 24px 0 0;
        max-height: 70vh;
        overflow-y: auto;
        padding: 0 0 40px;
        animation: vm-up .35s cubic-bezier(.4,0,.2,1);
      }
      @keyframes vm-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
      .vm-handle {
        width: 38px; height: 4px;
        background: var(--bdr, #E8C5D0);
        border-radius: 2px;
        margin: 13px auto 18px;
      }
      .vm-tray-title {
        font-family: var(--fc, 'Dancing Script', cursive);
        font-size: 1.3rem;
        color: var(--acc, #6B2737);
        text-align: center;
        margin-bottom: 18px;
        padding: 0 24px;
      }
      .vm-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--bdr, #E8C5D0);
      }
      .vm-play-btn {
        width: 40px; height: 40px;
        border-radius: 50%;
        background: var(--acc, #6B2737);
        color: #fff;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        cursor: pointer;
        border: none;
        font-size: .9rem;
      }
      .vm-play-btn:active { opacity: .8; }
      .vm-item-info { flex: 1; }
      .vm-item-time {
        font-family: var(--fb, 'Cormorant Garamond', serif);
        font-size: .8rem;
        color: var(--t3, #9A7080);
      }
      .vm-item-page {
        font-family: var(--fc, 'Dancing Script', cursive);
        font-size: .85rem;
        color: var(--acc, #6B2737);
        margin-bottom: 2px;
      }
      .vm-del-btn {
        font-size: .75rem;
        color: var(--t3, #9A7080);
        cursor: pointer;
        background: none;
        border: none;
        padding: 4px;
      }
      .vm-del-btn:hover { color: var(--acc, #6B2737); }
      .vm-empty {
        font-family: var(--fb, 'Cormorant Garamond', serif);
        font-style: italic;
        color: var(--t3, #9A7080);
        text-align: center;
        padding: 30px 20px;
        font-size: .95rem;
      }

      /* storage warning */
      #vm-storage-warn {
        position: fixed;
        top: 60px; left: 50%; transform: translateX(-50%);
        background: var(--acc, #6B2737);
        color: #fff;
        font-family: var(--fb, 'Cormorant Garamond', serif);
        font-size: .88rem;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 800;
        display: none;
        white-space: nowrap;
        box-shadow: 0 4px 16px rgba(0,0,0,.3);
      }
    `;
    document.head.appendChild(s);
  }

  function injectMicButton() {
    if (document.getElementById('vm-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'vm-btn';
    btn.setAttribute('aria-label', 'Voice memo');
    btn.innerHTML = micSVG();
    btn.addEventListener('click', toggleRecording);
    document.body.appendChild(btn);
  }

  function injectTray() {
    if (document.getElementById('vm-tray')) return;
    const tray = document.createElement('div');
    tray.id = 'vm-tray';
    tray.innerHTML = `
      <div class="vm-sheet">
        <div class="vm-handle"></div>
        <div class="vm-tray-title" id="vm-tray-title">Voice Memos · Page <span id="vm-tray-page">—</span></div>
        <div id="vm-tray-list"></div>
      </div>`;
    tray.addEventListener('click', e => {
      if (e.target === tray) closeTray();
    });
    document.body.appendChild(tray);
  }

  function injectStorageWarn() {
    if (document.getElementById('vm-storage-warn')) return;
    const w = document.createElement('div');
    w.id = 'vm-storage-warn';
    w.textContent = '⚠ Storage almost full — older memos may not save';
    document.body.appendChild(w);
  }

  function micSVG(recording = false) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>`;
  }

  function stopSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>`;
  }

  function playSVG() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21"/>
    </svg>`;
  }

  /* ── RECORDING LOGIC ─────────────────────────────────────────── */
  async function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks  = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob   = new Blob(audioChunks, { type: 'audio/webm' });
        const bookId = getBookFn();
        const page   = getPageFn();
        if (!bookId) return;

        try {
          await saveMemo(bookId, page, blob);
          refreshPageDots(bookId, page);
          checkStorageUsage(bookId);
        } catch(err) {
          showStorageWarning();
        }

        stream.getTracks().forEach(t => t.stop());
        isRecording = false;
        const btn = document.getElementById('vm-btn');
        if (btn) { btn.classList.remove('recording'); btn.innerHTML = micSVG(); }
      };

      mediaRecorder.start();
      isRecording = true;
      const btn = document.getElementById('vm-btn');
      if (btn) { btn.classList.add('recording'); btn.innerHTML = stopSVG(); }

    } catch(err) {
      alert('Microphone access is needed for voice memos. Please allow it in your browser settings.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  /* ── PAGE DOTS ───────────────────────────────────────────────── */
  async function refreshPageDots(bookId, page) {
    const memos = await getMemosForPage(bookId, page);
    const wraps = document.querySelectorAll('.pdf-page-wrap');
    wraps.forEach(wrap => {
      const pg = parseInt(wrap.dataset.page);
      if (pg !== page) return;
      let dot = wrap.querySelector('.vm-dot');
      if (memos.length > 0) {
        if (!dot) {
          dot = document.createElement('div');
          dot.className = 'vm-dot';
          dot.title = `${memos.length} voice memo${memos.length > 1 ? 's' : ''}`;
          dot.addEventListener('click', e => {
            e.stopPropagation();
            openTray(bookId, page);
          });
          wrap.appendChild(dot);
        }
      } else {
        if (dot) dot.remove();
      }
    });
  }

  async function decorateAllVisiblePages(bookId) {
    const memos  = await getMemosForBook(bookId);
    const byPage = {};
    memos.forEach(m => {
      if (!byPage[m.page]) byPage[m.page] = [];
      byPage[m.page].push(m);
    });

    const wraps = document.querySelectorAll('.pdf-page-wrap');
    wraps.forEach(wrap => {
      const pg  = parseInt(wrap.dataset.page);
      let   dot = wrap.querySelector('.vm-dot');
      if (byPage[pg] && byPage[pg].length > 0) {
        if (!dot) {
          dot = document.createElement('div');
          dot.className = 'vm-dot';
          dot.title = `${byPage[pg].length} voice memo${byPage[pg].length > 1 ? 's' : ''}`;
          dot.addEventListener('click', e => {
            e.stopPropagation();
            openTray(bookId, pg);
          });
          wrap.appendChild(dot);
        }
      } else {
        if (dot) dot.remove();
      }
    });
  }

  /* ── TRAY ────────────────────────────────────────────────────── */
  async function openTray(bookId, page) {
    const memos = await getMemosForPage(bookId, page);
    const list  = document.getElementById('vm-tray-list');
    const pgEl  = document.getElementById('vm-tray-page');
    if (!list || !pgEl) return;

    pgEl.textContent = page;

    if (memos.length === 0) {
      list.innerHTML = `<div class="vm-empty">No voice memos on this page yet.</div>`;
    } else {
      list.innerHTML = memos.map(m => {
        const date = new Date(m.ts).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        return `
          <div class="vm-item" data-id="${m.id}">
            <button class="vm-play-btn" data-id="${m.id}">${playSVG()}</button>
            <div class="vm-item-info">
              <div class="vm-item-page">Page ${page}</div>
              <div class="vm-item-time">${date}</div>
            </div>
            <button class="vm-del-btn" data-id="${m.id}">✕</button>
          </div>`;
      }).join('');

      list.querySelectorAll('.vm-play-btn').forEach(btn => {
        btn.addEventListener('click', () => playMemo(bookId, parseInt(btn.dataset.id)));
      });
      list.querySelectorAll('.vm-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await deleteMemo(parseInt(btn.dataset.id));
          openTray(bookId, page);
          refreshPageDots(bookId, page);
        });
      });
    }

    document.getElementById('vm-tray').classList.add('open');
  }

  function closeTray() {
    const tray = document.getElementById('vm-tray');
    if (tray) tray.classList.remove('open');
  }

  let currentAudio = null;
  async function playMemo(bookId, memoId) {
    const d  = await openDB();
    const tx = d.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(memoId);
    req.onsuccess = () => {
      if (!req.result) return;
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      const url   = URL.createObjectURL(req.result.blob);
      currentAudio = new Audio(url);
      currentAudio.play();
      currentAudio.onended = () => URL.revokeObjectURL(url);
    };
  }

  /* ── STORAGE CHECK ───────────────────────────────────────────── */
  async function checkStorageUsage(bookId) {
    if (!navigator.storage || !navigator.storage.estimate) return;
    const est = await navigator.storage.estimate();
    const pct = (est.usage / est.quota) * 100;
    if (pct > 75) showStorageWarning();
  }

  function showStorageWarning() {
    const w = document.getElementById('vm-storage-warn');
    if (!w) return;
    w.style.display = 'block';
    setTimeout(() => { w.style.display = 'none'; }, 4000);
  }

  /* ── PUBLIC API ──────────────────────────────────────────────── */
  function showMicButton() {
    const btn = document.getElementById('vm-btn');
    if (btn) btn.classList.add('reader-visible');
  }

  function hideMicButton() {
    if (isRecording) stopRecording();
    const btn = document.getElementById('vm-btn');
    if (btn) btn.classList.remove('reader-visible');
  }

  function setBook(bookId) {
    currentBookId = bookId;
  }

  function setPage(page) {
    currentPage = page;
  }

  function setGetPageFn(fn)  { getPageFn  = fn; }
  function setGetBookFn(fn)  { getBookFn  = fn; }

  function init() {
    injectStyles();
    injectMicButton();
    injectTray();
    injectStorageWarn();
    openDB();
  }

  return {
    init,
    showMicButton,
    hideMicButton,
    setBook,
    setPage,
    setGetPageFn,
    setGetBookFn,
    decorateAllVisiblePages,
    refreshPageDots,
    getMemosForBook
  };

})();

/* Auto-init on load */
document.addEventListener('DOMContentLoaded', () => VoiceMemos.init());
