/* ── TSUNDOKU · TORN PAGE QUOTE CARD ────────────────────────────
   Standalone module. Add to repo root, then add
   <script src="quoteshare.js"></script> just before </body>.
   Automatically attaches share buttons to every .qcard element.
   Also exposes QuoteShare.share({ text, bookTitle, page }) manually.
   ─────────────────────────────────────────────────────────────── */

const QuoteShare = (() => {

  /* ── CANVAS DIMENSIONS ───────────────────────────────────────── */
  const W = 800;
  const H = 1080;

  /* ── PAPER COLOURS (warm ivory, matches app palette) ─────────── */
  const PAPER_BG    = '#FDF6EE';
  const PAPER_DARK  = '#F0E4D4';
  const INK         = '#2A0F1A';
  const INK_LIGHT   = '#6B3A4A';
  const ACCENT      = '#6B2737';
  const TEAR_SHADOW = 'rgba(42,15,26,0.12)';

  /* ── TORN EDGE GENERATOR ─────────────────────────────────────── */
  function tornEdgePath(ctx, y, width, amplitude, peaks, flipped) {
    const step  = width / peaks;
    const pts   = [];

    for (let i = 0; i <= peaks; i++) {
      const x    = i * step;
      const vary = (Math.sin(i * 2.7) * 0.6 + Math.cos(i * 1.3) * 0.4);
      const dy   = vary * amplitude;
      pts.push({ x, y: y + (flipped ? -dy : dy) });
    }

    ctx.beginPath();
    if (flipped) {
      ctx.moveTo(0, H);
      ctx.lineTo(0, pts[0].y);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, pts[0].y);
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      const cy = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, cx, cy);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);

    if (flipped) {
      ctx.lineTo(width, H);
    } else {
      ctx.lineTo(width, 0);
    }
    ctx.closePath();
  }

  /* ── PAPER GRAIN TEXTURE ─────────────────────────────────────── */
  function addGrain(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data      = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i]     = Math.min(255, Math.max(0, data[i]     + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  /* ── SUBTLE PAGE LINES ───────────────────────────────────────── */
  function addPageLines(ctx, w, h, topY, bottomY) {
    ctx.save();
    ctx.strokeStyle = 'rgba(107,39,55,0.06)';
    ctx.lineWidth   = 1;
    const lineSpacing = 38;
    for (let y = topY + lineSpacing; y < bottomY - lineSpacing; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(w - 60, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── TEXT WRAP ───────────────────────────────────────────────── */
  function wrapText(ctx, text, x, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let   line  = '';

    for (const word of words) {
      const test     = line ? line + ' ' + word : word;
      const measured = ctx.measureText(test).width;
      if (measured > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ── OPENING MARKS ───────────────────────────────────────────── */
  function drawQuoteMark(ctx, x, y, size, opacity = 0.15) {
    ctx.save();
    ctx.font          = `${size}px 'Cormorant Garamond', serif`;
    ctx.fillStyle     = `rgba(107,39,55,${opacity})`;
    ctx.textAlign     = 'left';
    ctx.textBaseline  = 'top';
    ctx.fillText('\u201C', x, y);
    ctx.restore();
  }

  /* ── MAIN RENDER ─────────────────────────────────────────────── */
  async function renderCard({ text, bookTitle, page }) {
    await document.fonts.ready;

    const canvas    = document.createElement('canvas');
    canvas.width    = W;
    canvas.height   = H;
    const ctx       = canvas.getContext('2d');

    const TEAR_H    = 90;
    const TOP_Y     = TEAR_H;
    const BOTTOM_Y  = H - TEAR_H;

    ctx.fillStyle = PAPER_BG;
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.8);
    grad.addColorStop(0,   'rgba(255,255,255,0.0)');
    grad.addColorStop(0.6, 'rgba(201,112,128,0.04)');
    grad.addColorStop(1,   'rgba(107,39,55,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    addPageLines(ctx, W, H, TOP_Y, BOTTOM_Y);
    addGrain(ctx, W, H);

    ctx.save();
    tornEdgePath(ctx, TOP_Y, W, 28, 22, false);
    ctx.fillStyle = TEAR_SHADOW;
    ctx.fill();
    ctx.restore();

    ctx.save();
    tornEdgePath(ctx, TOP_Y - 6, W, 24, 22, false);
    ctx.fillStyle = PAPER_DARK;
    ctx.fill();
    ctx.restore();

    ctx.save();
    tornEdgePath(ctx, TOP_Y - 10, W, 20, 22, false);
    ctx.fillStyle = PAPER_BG;
    ctx.fill();
    ctx.restore();

    ctx.save();
    tornEdgePath(ctx, BOTTOM_Y, W, 28, 22, true);
    ctx.fillStyle = TEAR_SHADOW;
    ctx.fill();
    ctx.restore();

    ctx.save();
    tornEdgePath(ctx, BOTTOM_Y + 6, W, 24, 22, true);
    ctx.fillStyle = PAPER_DARK;
    ctx.fill();
    ctx.restore();

    ctx.save();
    tornEdgePath(ctx, BOTTOM_Y + 10, W, 20, 22, true);
    ctx.fillStyle = PAPER_BG;
    ctx.fill();
    ctx.restore();

    drawQuoteMark(ctx, 54, TOP_Y + 20, 180, 0.13);

    const PAD        = 88;
    const TEXT_W     = W - PAD * 2;
    const CENTER_Y   = (TOP_Y + BOTTOM_Y) / 2;

    let fontSize = 52;
    if (text.length > 180) fontSize = 38;
    else if (text.length > 100) fontSize = 44;
    else if (text.length < 60)  fontSize = 62;

    ctx.font         = `italic ${fontSize}px 'Cormorant Garamond', serif`;
    ctx.fillStyle    = INK;
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'left';

    const lineH = fontSize * 1.6;
    const lines = wrapText(ctx, text, PAD, TEXT_W, lineH);
    const blockH = lines.length * lineH;
    let   startY = CENTER_Y - blockH / 2 + lineH / 2;

    if (bookTitle) startY -= 36;

    lines.forEach((ln, i) => {
      ctx.fillText(ln, PAD, startY + i * lineH);
    });

    const lastLineY  = startY + (lines.length - 1) * lineH;
    const lastLineW  = ctx.measureText(lines[lines.length - 1]).width;
    ctx.save();
    ctx.font         = `italic ${fontSize * 0.9}px 'Cormorant Garamond', serif`;
    ctx.fillStyle    = `rgba(42,15,26,0.25)`;
    ctx.textBaseline = 'middle';
    ctx.fillText('\u201D', PAD + lastLineW + 6, lastLineY);
    ctx.restore();

    const ruleY = startY + lines.length * lineH + 28;
    ctx.save();
    const ruleGrad = ctx.createLinearGradient(PAD, 0, PAD + 120, 0);
    ruleGrad.addColorStop(0,   ACCENT);
    ruleGrad.addColorStop(1,   'rgba(107,39,55,0)');
    ctx.strokeStyle = ruleGrad;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, ruleY);
    ctx.lineTo(PAD + 140, ruleY);
    ctx.stroke();
    ctx.restore();

    if (bookTitle) {
      ctx.save();
      ctx.font         = `500 28px 'Dancing Script', cursive`;
      ctx.fillStyle    = INK_LIGHT;
      ctx.textBaseline = 'top';
      ctx.textAlign    = 'left';
      let attribution  = bookTitle;
      if (page) attribution += `  ·  p. ${page}`;
      ctx.fillText(attribution, PAD, ruleY + 16);
      ctx.restore();
    }

    ctx.save();
    ctx.font         = `italic 22px 'Cormorant Garamond', serif`;
    ctx.fillStyle    = `rgba(107,39,55,0.25)`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Tsundoku · 積ん読', W - PAD, BOTTOM_Y - 18);
    ctx.restore();

    return canvas;
  }

  /* ── SHARE OR DOWNLOAD ───────────────────────────────────────── */
  async function share({ text, bookTitle, page }) {
    showPreview({ text, bookTitle, page });
  }

  /* ── PREVIEW MODAL ───────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('qs-styles')) return;
    const s = document.createElement('style');
    s.id = 'qs-styles';
    s.textContent = `
      #qs-overlay {
        position: fixed; inset: 0; z-index: 900;
        display: none; align-items: flex-end; justify-content: center;
        background: rgba(0,0,0,.7); backdrop-filter: blur(6px);
      }
      #qs-overlay.open { display: flex; }
      .qs-sheet {
        background: var(--surf, #fff);
        width: 100%; max-width: 480px;
        border-radius: 24px 24px 0 0;
        padding: 0 0 44px;
        animation: qs-up .38s cubic-bezier(.4,0,.2,1);
      }
      @keyframes qs-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
      .qs-handle {
        width: 38px; height: 4px;
        background: var(--bdr, #E8C5D0);
        border-radius: 2px; margin: 13px auto 18px;
      }
      .qs-title {
        font-family: var(--fc, 'Dancing Script', cursive);
        font-size: 1.4rem; color: var(--acc, #6B2737);
        text-align: center; margin-bottom: 16px;
      }
      #qs-canvas-wrap {
        width: calc(100% - 48px); margin: 0 24px 20px;
        border-radius: 8px; overflow: hidden;
        box-shadow: 0 8px 32px rgba(42,15,26,.25);
      }
      #qs-canvas-wrap canvas {
        width: 100%; height: auto; display: block;
      }
      .qs-actions {
        display: flex; gap: 10px; padding: 0 24px;
      }
      .qs-btn {
        flex: 1; padding: 13px 10px;
        border-radius: 14px;
        font-family: var(--fc, 'Dancing Script', cursive);
        font-size: 1rem; text-align: center; cursor: pointer;
        transition: opacity .2s; border: none;
      }
      .qs-btn:active { opacity: .8; }
      .qs-btn-share {
        background: var(--acc, #6B2737);
        color: var(--acc-fg, #fff);
      }
      .qs-btn-save {
        background: var(--surf2, #FDF0F4);
        color: var(--acc, #6B2737);
        border: 1px solid var(--bdr, #E8C5D0) !important;
      }
      .qs-btn-close {
        background: none;
        color: var(--t3, #9A7080);
        font-family: var(--fb, 'Cormorant Garamond', serif);
        font-size: .9rem; flex: none; padding: 13px 16px;
      }
      .qs-card-btn {
        font-size: .72rem; color: var(--t3, #9A7080);
        cursor: pointer; background: none; border: none;
        padding: 2px 6px; margin-left: 4px;
        transition: color .2s;
      }
      .qs-card-btn:hover { color: var(--acc, #6B2737); }
    `;
    document.head.appendChild(s);
  }

  function injectOverlay() {
    if (document.getElementById('qs-overlay')) return;
    const el = document.createElement('div');
    el.id = 'qs-overlay';
    el.innerHTML = `
      <div class="qs-sheet">
        <div class="qs-handle"></div>
        <div class="qs-title">Share this passage</div>
        <div id="qs-canvas-wrap"></div>
        <div class="qs-actions">
          <button class="qs-btn qs-btn-share" id="qs-share-btn">Share</button>
          <button class="qs-btn qs-btn-save"  id="qs-save-btn">Save image</button>
          <button class="qs-btn qs-btn-close" id="qs-close-btn">Close</button>
        </div>
      </div>`;
    el.addEventListener('click', e => {
      if (e.target === el) closePreview();
    });
    document.body.appendChild(el);
    document.getElementById('qs-close-btn').addEventListener('click', closePreview);
  }

  let _currentCanvas = null;

  async function showPreview({ text, bookTitle, page }) {
    const overlay = document.getElementById('qs-overlay');
    const wrap    = document.getElementById('qs-canvas-wrap');
    if (!overlay || !wrap) return;

    wrap.innerHTML = `<div style="height:200px;display:flex;align-items:center;justify-content:center;
      font-family:'Cormorant Garamond',serif;font-style:italic;color:#9A7080;font-size:.95rem;">
      Preparing your page…</div>`;
    overlay.classList.add('open');

    const canvas = await renderCard({ text, bookTitle, page });
    _currentCanvas = canvas;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    document.getElementById('qs-share-btn').onclick = () => shareCanvas(canvas, bookTitle);
    document.getElementById('qs-save-btn').onclick  = () => saveCanvas(canvas, bookTitle);
  }

  function closePreview() {
    const overlay = document.getElementById('qs-overlay');
    if (overlay) overlay.classList.remove('open');
    _currentCanvas = null;
  }

  async function shareCanvas(canvas, bookTitle) {
    canvas.toBlob(async blob => {
      const file = new File([blob], 'tsundoku-quote.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files:  [file],
            title:  bookTitle ? `From "${bookTitle}"` : 'A passage',
            text:   'Read on Tsundoku'
          });
        } catch(err) {
          if (err.name !== 'AbortError') saveCanvas(canvas, bookTitle);
        }
      } else {
        saveCanvas(canvas, bookTitle);
      }
    }, 'image/png');
  }

  function saveCanvas(canvas, bookTitle) {
    const a    = document.createElement('a');
    const slug = (bookTitle || 'quote').replace(/\s+/g, '-').toLowerCase().slice(0, 30);
    a.download = `tsundoku-${slug}.png`;
    a.href     = canvas.toDataURL('image/png');
    a.click();
  }

  /* ── AUTO ATTACH TO QUOTE CARDS ──────────────────────────────── */
  function attachToCard(card) {
    if (card.dataset.qsAttached) return;
    card.dataset.qsAttached = '1';

    const textEl  = card.querySelector('.qcard-text, .gq-text');
    const metaEl  = card.querySelector('.qcard-meta, .gq-src');
    if (!textEl) return;

    const text      = textEl.textContent.trim();
    const meta      = metaEl ? metaEl.textContent.trim() : '';
    const pageMatch = meta.match(/p\.\s*(\d+)/i);
    const page      = pageMatch ? parseInt(pageMatch[1]) : null;
    const bookTitle = meta.replace(/·.*$/, '').replace(/p\.\s*\d+/i, '').trim();

    const btn       = document.createElement('button');
    btn.className   = 'qs-card-btn';
    btn.textContent = '↗ share';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      share({ text, bookTitle, page });
    });

    const delBtn = card.querySelector('.del-btn, .gq-del');
    if (delBtn) delBtn.insertAdjacentElement('beforebegin', btn);
    else card.appendChild(btn);
  }

  function scanAndAttach() {
    document.querySelectorAll('.qcard, .gq-item').forEach(attachToCard);
  }

  /* ── MUTATION OBSERVER ───────────────────────────────────────── */
  function observeDOM() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!node.querySelectorAll) return;
          node.querySelectorAll('.qcard, .gq-item').forEach(attachToCard);
          if (node.classList && (node.classList.contains('qcard') || node.classList.contains('gq-item'))) {
            attachToCard(node);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ── PUBLIC API ──────────────────────────────────────────────── */
  function init() {
    injectStyles();
    injectOverlay();
    scanAndAttach();
    observeDOM();
  }

  return { init, share };

})();

document.addEventListener('DOMContentLoaded', () => QuoteShare.init());
