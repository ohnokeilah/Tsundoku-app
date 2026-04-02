/* ── TSUNDOKU · READER CONTROLS ───────────────────────────────────────
   Ink drop font sizer + candle dark mode toggle.
   Add <script src="readercontrols.js"></script> before </body>.
   ─────────────────────────────────────────────────────────────────── */

const ReaderControls = (() => {

  const FONT_KEY  = 'tsundoku-fontsize';
  const THEME_KEY = 'tsundoku-theme';

  const DROPS = [
    { scale: 0.85, size: 7  },
    { scale: 1.0,  size: 11 },
    { scale: 1.2,  size: 16 },
    { scale: 1.42, size: 22 },
  ];

  let activeFont = 1;
  let isDark     = false;

  /* ── STYLES ──────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('rc-styles')) return;
    const s = document.createElement('style');
    s.id = 'rc-styles';
    s.textContent = `

      /* Trigger floats top-right inside reader, always visible */
      #rc-trigger {
        position: fixed;
        top: 54px;
        right: calc(50% - 240px + 16px);
        width: 38px; height: 38px;
        border-radius: 50%;
        background: rgba(107,39,55,.75);
        backdrop-filter: blur(8px);
        color: #fff;
        display: none;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(232,160,180,.3);
        cursor: pointer;
        z-index: 350;
        box-shadow: 0 2px 12px rgba(42,15,26,.3);
        transition: background .2s;
      }
      @media(max-width:480px){
        #rc-trigger { right: 16px; }
      }
      #rc-trigger.reader-open { display: flex; }
      #rc-trigger svg {
        width: 17px; height: 17px;
        fill: #fff; opacity: .9;
      }

      #rc-panel {
        position: fixed;
        bottom: 88px;
        left: 50%; transform: translateX(-50%);
        width: calc(100% - 48px);
        max-width: 380px;
        background: var(--surf, #fff);
        border-radius: 24px;
        padding: 22px 22px 24px;
        box-shadow: 0 12px 48px rgba(42,15,26,.38);
        z-index: 450;
        display: none;
        flex-direction: column;
        gap: 22px;
        border: 1px solid var(--bdr, #E8C5D0);
        animation: rc-rise .3s cubic-bezier(.4,0,.2,1);
      }
      @keyframes rc-rise {
        from { opacity:0; transform:translateX(-50%) translateY(14px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0);    }
      }
      #rc-panel.open { display: flex; }

      .rc-section-label {
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        font-size: .78rem;
        color: var(--t3, #9A7080);
        letter-spacing: .06em;
        margin-bottom: 14px;
      }

      .rc-drops-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        padding: 4px 0 6px;
      }

      .rc-drop-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 10px 14px;
        border-radius: 16px;
        border: 1.5px solid transparent;
        transition: border-color .22s, background .22s;
        background: transparent;
      }
      .rc-drop-wrap:active { opacity: .6; }
      .rc-drop-wrap.on {
        border-color: var(--acc, #6B2737);
        background: var(--surf2, #FDF0F4);
      }
      .rc-drop-svg {
        display: block;
        transition: transform .22s cubic-bezier(.4,0,.2,1);
      }
      .rc-drop-wrap.on .rc-drop-svg { transform: scale(1.12); }
      .rc-drop-wrap .drop-body { fill: var(--bdr, #E8C5D0); }
      .rc-drop-wrap.on .drop-body { fill: var(--acc, #6B2737); }
      .rc-drop-dot {
        width: 4px; height: 4px;
        border-radius: 50%;
        background: var(--bdr, #E8C5D0);
        transition: background .2s, transform .2s;
      }
      .rc-drop-wrap.on .rc-drop-dot {
        background: var(--acc, #6B2737);
        transform: scale(1.5);
      }

      .rc-divider {
        height: 1px;
        background: var(--bdr, #E8C5D0);
        margin: 0 -4px;
      }

      .rc-candle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .rc-candle-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
      }
      #rc-candle-svg { width: 36px; height: 60px; }

      .candle-flame {
        transform-origin: 50% 100%;
        animation: flicker 1.8s ease-in-out infinite alternate;
        transition: opacity .5s;
      }
      @keyframes flicker {
        0%   { transform: scaleX(1)    scaleY(1)    rotate(-1deg);  opacity: 1;   }
        30%  { transform: scaleX(.88)  scaleY(1.06) rotate(1.5deg); opacity: .9;  }
        60%  { transform: scaleX(1.05) scaleY(.96)  rotate(-.5deg); opacity: 1;   }
        100% { transform: scaleX(.94)  scaleY(1.04) rotate(1deg);   opacity: .85; }
      }
      .candle-flame.out { opacity: 0; animation: none; }
      .candle-smoke {
        opacity: 0;
        transition: opacity .6s;
        transform-origin: 50% 100%;
      }
      .candle-smoke.show {
        opacity: 1;
        animation: smoke-rise 2.5s ease-out forwards;
      }
      @keyframes smoke-rise {
        0%   { opacity:.7; transform: translateY(0)     scaleX(1);   }
        100% { opacity:0;  transform: translateY(-18px) scaleX(1.8); }
      }

      .rc-candle-label {
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        font-size: .82rem;
        color: var(--t2, #6B3A4A);
        text-align: center;
      }
      .rc-mode-desc {
        flex: 1;
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        font-size: .88rem;
        color: var(--t2, #6B3A4A);
        line-height: 1.55;
      }
      .rc-mode-desc strong {
        font-style: normal;
        font-weight: 600;
        color: var(--t1, #2A0F1A);
        display: block;
        margin-bottom: 2px;
        font-size: .9rem;
      }

      #rc-flash {
        position: fixed; inset: 0; z-index: 9999;
        pointer-events: none;
        opacity: 0;
        transition: opacity .18s ease;
      }
      #rc-flash.on { opacity: .45; }

      [data-theme="dark"] #pdf-viewer canvas {
        filter: invert(1) hue-rotate(180deg);
      }
    `;
    document.head.appendChild(s);
  }

  /* ── SVGs ──────────────────────────────────────────────────────────── */
  function dropSVG(size) {
    const w = size, h = size * 1.35;
    return `<svg class="rc-drop-svg" width="${w}" height="${h}"
      viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg">
      <path class="drop-body"
        d="M20 2 C20 2, 2 22, 2 34 A18 18 0 0 0 38 34 C38 22, 20 2, 20 2Z"/>
      <ellipse fill="rgba(255,255,255,0.22)" cx="14" cy="28" rx="3.5" ry="5"
        transform="rotate(-18,14,28)"/>
    </svg>`;
  }

  function candleSVG() {
    return `<svg id="rc-candle-svg" viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
      <path class="candle-smoke" id="rc-smoke"
        d="M18 14 Q16 8 18 3 Q20 8 18 14"
        stroke="var(--t3,#9A7080)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <g class="candle-flame" id="rc-flame">
        <path d="M18 6 C15 12,11 16,13 21 C15 26,21 26,23 21 C25 16,21 12,18 6Z"
          fill="#F5A623"/>
        <path d="M18 10 C17 14,15 17,16 20 C17 23,20 23,21 20 C22 17,19 14,18 10Z"
          fill="#FDD835" opacity=".85"/>
        <ellipse cx="18" cy="21" rx="2.5" ry="1.5" fill="#FFECB3" opacity=".7"/>
      </g>
      <path d="M14 36 Q13 40 14 42" stroke="var(--pink-l,#F2C4D4)"
        stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
      <rect x="11" y="26" width="14" height="26" rx="3"
        fill="var(--surf2,#FDF0F4)" stroke="var(--bdr,#E8C5D0)" stroke-width="1"/>
      <rect x="11" y="26" width="4" height="26" rx="3" fill="rgba(107,39,55,0.06)"/>
      <line x1="18" y1="26" x2="18" y2="22"
        stroke="var(--t2,#6B3A4A)" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="18" cy="52" rx="10" ry="2.5"
        fill="var(--bdr,#E8C5D0)" opacity=".7"/>
    </svg>`;
  }

  /* ── BUILD PANEL ─────────────────────────────────────────────────── */
  function buildPanel() {
    if (document.getElementById('rc-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'rc-panel';

    const fontSection = document.createElement('div');
    fontSection.innerHTML = `<div class="rc-section-label">ink weight · text size</div>`;
    const dropsRow = document.createElement('div');
    dropsRow.className = 'rc-drops-row';
    DROPS.forEach((d, i) => {
      const wrap = document.createElement('button');
      wrap.className   = 'rc-drop-wrap' + (i === activeFont ? ' on' : '');
      wrap.dataset.idx = i;
      wrap.innerHTML   = dropSVG(d.size) + `<span class="rc-drop-dot"></span>`;
      wrap.addEventListener('click', () => setFont(i));
      dropsRow.appendChild(wrap);
    });
    fontSection.appendChild(dropsRow);
    panel.appendChild(fontSection);

    const divEl = document.createElement('div');
    divEl.className = 'rc-divider';
    panel.appendChild(divEl);

    const darkSection = document.createElement('div');
    darkSection.innerHTML = `<div class="rc-section-label">light & shadow</div>`;
    const candleRow = document.createElement('div');
    candleRow.className = 'rc-candle-row';
    candleRow.innerHTML = `
      <div class="rc-candle-wrap" id="rc-candle-btn">
        ${candleSVG()}
        <span class="rc-candle-label" id="rc-candle-label">snuff</span>
      </div>
      <div class="rc-mode-desc" id="rc-mode-desc">
        <strong>Day</strong>warm ivory pages,<br>ink on paper
      </div>`;
    darkSection.appendChild(candleRow);
    panel.appendChild(darkSection);
    document.body.appendChild(panel);

    document.getElementById('rc-candle-btn')
      .addEventListener('click', toggleTheme);

    document.addEventListener('click', e => {
      const p = document.getElementById('rc-panel');
      const t = document.getElementById('rc-trigger');
      if (!p || !t) return;
      if (!p.contains(e.target) && e.target !== t && !t.contains(e.target)) {
        p.classList.remove('open');
      }
    });
  }

  /* ── TRIGGER — fixed position, shown/hidden by reader state ──────── */
  function buildTrigger() {
    if (document.getElementById('rc-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'rc-trigger';
    btn.setAttribute('aria-label', 'Reader controls');
    btn.innerHTML = `<svg viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg">
      <path fill="#fff" opacity=".9"
        d="M20 2 C20 2, 2 22, 2 34 A18 18 0 0 0 38 34 C38 22, 20 2, 20 2Z"/>
    </svg>`;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('rc-panel')?.classList.toggle('open');
    });
    document.body.appendChild(btn);

    /* Watch for reader page becoming active */
    const obs = new MutationObserver(() => {
      const readerActive = document.querySelector('#page-reader.active');
      btn.classList.toggle('reader-open', !!readerActive);
    });
    obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  /* ── FONT ──────────────────────────────────────────────────────────── */
  function applyFont(idx) {
    const scale = DROPS[idx].scale;
    document.documentElement.style.setProperty('--reader-font-scale', scale);

    // CSS zoom scales the entire reader-scroll including PDF canvas children.
    // This is the only reliable way to resize PDF (canvas-based) content.
    const rs = document.getElementById('reader-scroll');
    if (rs) {
      rs.style.zoom = scale;
      rs.style.transformOrigin = 'top center';
    }

    // Also set font-size for EPUB / text-based readers
    ['.epub-container', '#epub-viewer'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.fontSize = scale + 'rem';
      });
    });

    document.querySelectorAll('.rc-drop-wrap').forEach((w, i) => {
      w.classList.toggle('on', i === idx);
    });
  }

  function setFont(idx) {
    activeFont = idx;
    applyFont(idx);
    try { localStorage.setItem(FONT_KEY, idx); } catch(e) {}
  }

  /* ── THEME ─────────────────────────────────────────────────────────── */
  function applyTheme(dark, animate) {
    isDark = dark;
    if (animate) {
      const flash = document.getElementById('rc-flash');
      if (flash) {
        flash.style.background = dark ? '#1E0F16' : '#FDF8F5';
        flash.classList.add('on');
        setTimeout(() => flash.classList.remove('on'), 320);
      }
    }
    const root = document.documentElement.style;
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      root.setProperty('--bg',    '#1E0F16');
      root.setProperty('--surf',  '#2A1520');
      root.setProperty('--surf2', '#38192A');
      root.setProperty('--surf3', '#461E2E');
      root.setProperty('--t1',    '#F5D5E0');
      root.setProperty('--t2',    '#C8909A');
      root.setProperty('--t3',    '#8A6070');
      root.setProperty('--bdr',   '#5A2535');
      root.setProperty('--acc',   '#E8A0B4');
      root.setProperty('--acc-fg','#2A0F1A');
    } else {
      document.documentElement.removeAttribute('data-theme');
      root.setProperty('--bg',    '#FDF8F5');
      root.setProperty('--surf',  '#FFFFFF');
      root.setProperty('--surf2', '#FDF0F4');
      root.setProperty('--surf3', '#F9E8EF');
      root.setProperty('--t1',    '#2A0F1A');
      root.setProperty('--t2',    '#6B3A4A');
      root.setProperty('--t3',    '#9A7080');
      root.setProperty('--bdr',   '#E8C5D0');
      root.setProperty('--acc',   '#6B2737');
      root.setProperty('--acc-fg','#FFFFFF');
    }

    const flame = document.getElementById('rc-flame');
    const smoke = document.getElementById('rc-smoke');
    const label = document.getElementById('rc-candle-label');
    const desc  = document.getElementById('rc-mode-desc');

    if (flame) flame.classList.toggle('out', dark);
    if (smoke) {
      smoke.classList.remove('show');
      if (dark) { void smoke.offsetWidth; smoke.classList.add('show'); }
    }
    if (label) label.textContent = dark ? 'relight' : 'snuff';
    if (desc)  desc.innerHTML    = dark
      ? `<strong>Night</strong>darkness for the<br>serious hour`
      : `<strong>Day</strong>warm ivory pages,<br>ink on paper`;

    try { localStorage.setItem(THEME_KEY, dark ? '1' : '0'); } catch(e) {}
  }

  function toggleTheme() { applyTheme(!isDark, true); }

  function buildFlash() {
    if (document.getElementById('rc-flash')) return;
    const f = document.createElement('div');
    f.id = 'rc-flash';
    document.body.appendChild(f);
  }

  function loadSaved() {
    try {
      const fi = localStorage.getItem(FONT_KEY);
      if (fi !== null) {
        const idx = parseInt(fi);
        if (!isNaN(idx) && idx >= 0 && idx < DROPS.length) activeFont = idx;
      }
      if (localStorage.getItem(THEME_KEY) === '1') isDark = true;
    } catch(e) {}
  }

  function init() {
    injectStyles();
    loadSaved();
    buildFlash();
    buildPanel();
    buildTrigger();
    applyFont(activeFont);
    applyTheme(isDark, false);
  }

  return { init, setFont, toggleTheme };

})();

document.addEventListener('DOMContentLoaded', () => ReaderControls.init());
