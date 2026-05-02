/* =========================================================
   SleepSync — app.js
   Live, instant calculator. No submit button.
   ========================================================= */

(() => {
  'use strict';

  // ---------- Sleep recommendations by age (NSF) ----------
  // Each group: human label, min/max recommended sleep hours
  const AGE_GROUPS = [
    { id: 'newborn',    min: 0,   max: 0.25, label: 'Newborn',     range: '14–17 h', minH: 14, maxH: 17 },
    { id: 'infant',     min: 0.26,max: 1,    label: 'Infant',      range: '12–15 h', minH: 12, maxH: 15 },
    { id: 'toddler',    min: 1.01,max: 2,    label: 'Toddler',     range: '11–14 h', minH: 11, maxH: 14 },
    { id: 'preschool',  min: 3,   max: 5,    label: 'Preschooler', range: '10–13 h', minH: 10, maxH: 13 },
    { id: 'school',     min: 6,   max: 13,   label: 'School age',  range: '9–11 h',  minH: 9,  maxH: 11 },
    { id: 'teen',       min: 14,  max: 17,   label: 'Teen',        range: '8–10 h',  minH: 8,  maxH: 10 },
    { id: 'youngAdult', min: 18,  max: 25,   label: 'Young adult', range: '7–9 h',   minH: 7,  maxH: 9  },
    { id: 'adult',      min: 26,  max: 64,   label: 'Adult',       range: '7–9 h',   minH: 7,  maxH: 9  },
    { id: 'senior',     min: 65,  max: 200,  label: 'Older adult', range: '7–8 h',   minH: 7,  maxH: 8  },
  ];

  function getAgeGroup(age) {
    const a = Number(age);
    if (!isFinite(a) || a < 0) return AGE_GROUPS[6]; // default young adult
    for (const g of AGE_GROUPS) {
      if (a >= g.min && a <= g.max) return g;
    }
    return AGE_GROUPS[7]; // adult fallback
  }

  // ---------- State ----------
  const state = {
    mode: 'wake',           // 'wake' | 'bed' | 'now'
    time: '07:00',
    fallAsleep: 14,
    format: 12,
    age: 22,
    selectedIndex: 0,
    results: [],
  };

  // ---------- DOM helpers ----------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');

  // ---------- Time helpers ----------
  const parseHM = (str) => {
    const [h, m] = str.split(':').map(Number);
    return { h, m };
  };
  const hmToMin = ({ h, m }) => h * 60 + m;
  const minToHM = (total) => {
    total = ((total % 1440) + 1440) % 1440;
    return { h: Math.floor(total / 60), m: total % 60 };
  };
  const nowHM = () => {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  };
  function fmtTimePlain({ h, m }) {
    if (state.format === 24) return `${pad(h)}:${pad(m)}`;
    const ampm = h >= 12 ? 'PM' : 'AM';
    let hh = h % 12; if (hh === 0) hh = 12;
    return `${hh}:${pad(m)} ${ampm}`;
  }
  function fmtDuration(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  function qualityFor(cycles) {
    if (cycles >= 5 && cycles <= 6) return { label: 'Best',      cls: 'tag-best' };
    if (cycles === 4)               return { label: 'Good',      cls: 'tag-good' };
    if (cycles === 3)               return { label: 'Power nap', cls: 'tag-fair' };
    if (cycles >= 7)                return { label: 'Plenty',    cls: 'tag-good' };
    return                                  { label: 'Minimum',  cls: 'tag-low'  };
  }

  // ---------- Tokenize a time for the rolling-digit display ----------
  function timeTokens({ h, m }) {
    const tokens = [];
    if (state.format === 24) {
      const hStr = pad(h), mStr = pad(m);
      tokens.push({ type: 'digit', value: hStr[0] });
      tokens.push({ type: 'digit', value: hStr[1] });
      tokens.push({ type: 'sep' });
      tokens.push({ type: 'digit', value: mStr[0] });
      tokens.push({ type: 'digit', value: mStr[1] });
    } else {
      let hh = h % 12; if (hh === 0) hh = 12;
      const mStr = pad(m);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hStr = String(hh);
      for (const c of hStr) tokens.push({ type: 'digit', value: c });
      tokens.push({ type: 'sep' });
      tokens.push({ type: 'digit', value: mStr[0] });
      tokens.push({ type: 'digit', value: mStr[1] });
      tokens.push({ type: 'ampm', value: ampm });
    }
    return tokens;
  }
  function tokensSignature(tokens) {
    return tokens.map(t => t.type === 'digit' ? 'D' : t.type[0].toUpperCase()).join('');
  }

  function setTimeDisplay(container, hm) {
    if (!container) return;
    const tokens = timeTokens(hm);
    const sig = tokensSignature(tokens);
    if (container.dataset.tsig !== sig) {
      // Structure changed — rebuild
      let html = '';
      tokens.forEach(t => {
        if (t.type === 'digit') {
          html += `<span class="digit-roll"><span class="digit-stack" style="--d:${t.value}">`;
          for (let i = 0; i < 10; i++) html += `<span>${i}</span>`;
          html += '</span></span>';
        } else if (t.type === 'sep') {
          html += '<span class="tsep">:</span>';
        } else if (t.type === 'space') {
          html += '<span class="tspace"></span>';
        } else if (t.type === 'ampm') {
          html += `<span class="tampm">${t.value}</span>`;
        }
      });
      container.innerHTML = html;
      container.dataset.tsig = sig;
    } else {
      // Same structure — just update digit values to trigger the rolling animation
      const digits = container.querySelectorAll('.digit-stack');
      const ampms  = container.querySelectorAll('.tampm');
      let di = 0, ai = 0;
      tokens.forEach(t => {
        if (t.type === 'digit') {
          // Always set — no comparison check (keeps slider perfectly in sync)
          digits[di].style.setProperty('--d', t.value);
          di++;
        } else if (t.type === 'ampm') {
          const el = ampms[ai];
          if (el && el.textContent !== t.value) {
            el.classList.add('changing');
            setTimeout(() => {
              el.textContent = t.value;
              el.classList.remove('changing');
            }, 220);
          }
          ai++;
        }
      });
    }
  }

  // ---------- Core math ----------
  function compute() {
    const fa = Number(state.fallAsleep) || 0;
    let baseHM, dirSign;

    if (state.mode === 'wake') { baseHM = parseHM(state.time); dirSign = -1; }
    else if (state.mode === 'bed') { baseHM = parseHM(state.time); dirSign = +1; }
    else { baseHM = nowHM(); dirSign = +1; }

    const baseMin = hmToMin(baseHM);
    const cycleCounts = [6, 5, 4, 3];
    state.results = cycleCounts.map((c) => {
      const offset = fa + 90 * c;
      const t = minToHM(baseMin + dirSign * offset);
      return {
        cycles: c,
        sleepMin: 90 * c,
        totalOffset: offset,
        time: t,
        quality: qualityFor(c),
      };
    });
    if (state.selectedIndex < 0 || state.selectedIndex >= state.results.length) {
      state.selectedIndex = 0;
    }
  }

  // ---------- UI: mode + labels ----------
  function renderModeUI() {
    $$('#modeTabs button').forEach(b => {
      const active = b.dataset.mode === state.mode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const inputLabel  = $('#inputLabel');
    const resultsTitle = $('#resultsTitle');
    const nowBadge    = $('#nowBadge');
    const timeInput   = $('#timeInput');

    if (state.mode === 'wake') {
      inputLabel.textContent = 'Wake-up time';
      resultsTitle.textContent = 'Recommended bedtimes';
      nowBadge.classList.add('hidden');
      timeInput.disabled = false;
    } else if (state.mode === 'bed') {
      inputLabel.textContent = 'Bedtime';
      resultsTitle.textContent = 'Recommended wake-up times';
      nowBadge.classList.add('hidden');
      timeInput.disabled = false;
    } else {
      inputLabel.textContent = 'Sleeping right now';
      resultsTitle.textContent = 'Try waking at one of these';
      nowBadge.classList.remove('hidden');
      $('#nowText').textContent = fmtTimePlain(nowHM());
      timeInput.disabled = true;
    }
  }

  function renderPresets() {
    const wrap = $('#presets');
    const presets = (state.mode === 'wake')
      ? [['06:00','6:00 AM'], ['06:30','6:30 AM'], ['07:00','7:00 AM'], ['07:30','7:30 AM'], ['08:00','8:00 AM'], ['09:00','9:00 AM']]
      : [['22:00','10:00 PM'], ['22:30','10:30 PM'], ['23:00','11:00 PM'], ['23:30','11:30 PM'], ['00:00','12:00 AM'], ['01:00','1:00 AM']];
    wrap.innerHTML = '';
    presets.forEach(([val, label]) => {
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        state.time = val;
        $('#timeInput').value = val;
        rerender();
      });
      wrap.appendChild(btn);
    });
  }

  // ---------- UI: results ----------
  function ensureResultCards() {
    const grid = $('#resultsGrid');
    if (grid.children.length === state.results.length) return;
    grid.innerHTML = '';
    state.results.forEach((_, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'result-card';
      card.style.animationDelay = `${idx * 70}ms`;
      card.classList.add('fade-in');
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="rc-top">
          <span class="rc-cycle"></span>
          <span class="tag"></span>
        </div>
        <div class="rc-time" aria-live="polite"></div>
        <div class="rc-meta">
          <span class="rc-sleep font-mono"></span>
          <span class="rc-mode subtle"></span>
        </div>
        <div class="rc-bar"><div class="rc-bar-fill"></div></div>
      `;
      card.addEventListener('mouseenter', () => selectIndex(idx));
      card.addEventListener('focus',      () => selectIndex(idx));
      card.addEventListener('click',      () => selectIndex(idx));
      grid.appendChild(card);
    });
  }

  function renderResults() {
    ensureResultCards();
    const cards = $('#resultsGrid').children;

    state.results.forEach((r, idx) => {
      const card = cards[idx];
      card.classList.toggle('is-best',  idx === 0);
      card.classList.toggle('selected', idx === state.selectedIndex);

      card.querySelector('.rc-cycle').textContent = `${r.cycles} cycles`;
      const tag = card.querySelector('.tag');
      tag.textContent = r.quality.label;
      tag.className = `tag ${r.quality.cls}`;

      setTimeDisplay(card.querySelector('.rc-time'), r.time);

      card.querySelector('.rc-sleep').textContent = `${fmtDuration(r.sleepMin)} of sleep`;
      card.querySelector('.rc-mode').textContent  = state.mode === 'wake' ? 'go to bed' : 'wake up';

      const filledPct = Math.min(100, (r.cycles / 6) * 100);
      card.querySelector('.rc-bar-fill').style.width = `${filledPct}%`;
    });

    const best = state.results[0];
    const refTime  = state.mode === 'now'  ? fmtTimePlain(nowHM()) : fmtTimePlain(parseHM(state.time));
    const refLabel = state.mode === 'wake' ? 'wake at' : (state.mode === 'bed' ? 'sleep at' : 'sleep now');
    const verb     = state.mode === 'wake' ? 'go to bed by' : 'wake up at';
    const target   = fmtTimePlain(best.time);

    $('#bestSummaryText').innerHTML =
      `For best sleep, ${refLabel} <strong>${refTime}</strong> &middot; ${verb} <span class="accent">${target}</span> ` +
      `(${best.cycles} cycles, ${fmtDuration(best.sleepMin)}).`;
    $('#bestSummary').classList.remove('hidden');
  }

  function selectIndex(i) {
    state.selectedIndex = i;
    $$('#resultsGrid .result-card').forEach((c, idx) => {
      c.classList.toggle('selected', idx === i);
    });
    renderViz();
    updateOrb();
    updateAgeMatch();
  }

  // ---------- UI: orb ----------
  function updateOrb() {
    const r = state.results[state.selectedIndex];
    if (!r) return;
    $('#orbDuration').textContent = fmtDuration(r.sleepMin);
    const isBest = state.selectedIndex === 0;
    $('#orbCycles').textContent = `${r.cycles} cycles${isBest ? ' · best' : ''}`;
  }

  // ---------- UI: age recommendation ----------
  function updateAgeMatch() {
    const g = getAgeGroup(state.age);
    $('#ageGroup').textContent    = g.label;
    $('#ageRecValue').textContent = g.range;

    const r = state.results[state.selectedIndex];
    const ageRec = $('#ageRec');
    if (!r) {
      $('#ageRecMeta').textContent = 'recommended each night';
      ageRec.classList.remove('match');
      return;
    }
    const sleepHours = r.sleepMin / 60;
    if (sleepHours >= g.minH && sleepHours <= g.maxH) {
      $('#ageRecMeta').textContent = `selected: ${fmtDuration(r.sleepMin)} — within range ✓`;
      ageRec.classList.add('match');
    } else if (sleepHours < g.minH) {
      $('#ageRecMeta').textContent = `selected: ${fmtDuration(r.sleepMin)} — under target`;
      ageRec.classList.remove('match');
    } else {
      $('#ageRecMeta').textContent = `selected: ${fmtDuration(r.sleepMin)} — over target`;
      ageRec.classList.remove('match');
    }
  }

  // ---------- UI: visualization ----------
  function renderViz() {
    const r = state.results[state.selectedIndex];
    if (!r) return;

    let bedHM, wakeHM;
    if (state.mode === 'wake') { wakeHM = parseHM(state.time); bedHM  = r.time; }
    else if (state.mode === 'bed') { bedHM  = parseHM(state.time); wakeHM = r.time; }
    else { bedHM  = nowHM(); wakeHM = r.time; }

    setTimeDisplay($('#vizBedtime'), bedHM);
    setTimeDisplay($('#vizWake'),    wakeHM);
    $('#vizCycles').textContent  = `${r.cycles}`;
    $('#vizTotal').textContent   = fmtDuration(r.sleepMin);
    $('#vizRange').textContent   = `${fmtTimePlain(bedHM)}  →  ${fmtTimePlain(wakeHM)}`;

    const ticks = $('#vizTicks');
    ticks.innerHTML = '';
    const totalMin = state.fallAsleep + r.sleepMin;
    const tickCount = Math.min(r.cycles + 1, 7);
    for (let i = 0; i <= tickCount; i++) {
      const f = i / tickCount;
      const tMin = hmToMin(bedHM) + f * totalMin;
      const lbl = fmtTimePlain(minToHM(Math.round(tMin)));
      const span = document.createElement('span');
      span.textContent = lbl;
      ticks.appendChild(span);
    }
    drawCycles(r.cycles, state.fallAsleep);
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function hexToRgba(color, alpha) {
    if (!color) return `rgba(79,70,229,${alpha})`;
    if (color.startsWith('rgb')) {
      return color.replace(/rgba?\(([^)]+)\)/, (m, inner) => {
        const parts = inner.split(',').map(s => s.trim()).slice(0, 3);
        return `rgba(${parts.join(',')},${alpha})`;
      });
    }
    let h = color.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    if (isNaN(num)) return `rgba(79,70,229,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawCycles(cycles, fa) {
    const canvas = $('#cycleCanvas');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = 300;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const ink       = getCSSVar('--ink')        || '#0a0a0a';
    const inkSubtle = getCSSVar('--ink-subtle') || '#a3a3a3';
    const inkMuted  = getCSSVar('--ink-muted')  || '#525252';
    const accent    = getCSSVar('--accent')     || '#4f46e5';
    const border    = getCSSVar('--border')     || '#e6e6e0';

    const padL = 64, padR = 16, padT = 18, padB = 18;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const stageY = {
      awake: padT + innerH * 0.06,
      rem:   padT + innerH * 0.30,
      light: padT + innerH * 0.55,
      deep:  padT + innerH * 0.92,
    };
    const labels = ['Awake', 'REM', 'Light', 'Deep'];
    const ys     = [stageY.awake, stageY.rem, stageY.light, stageY.deep];

    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = inkSubtle;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    labels.forEach((lbl, i) => {
      ctx.fillText(lbl, 8, ys[i]);
      ctx.beginPath();
      ctx.moveTo(padL, ys[i]);
      ctx.lineTo(W - padR, ys[i]);
      ctx.stroke();
    });

    const totalMin = fa + 90 * cycles;
    const xAt = (m) => padL + (m / totalMin) * innerW;

    const path = [];
    path.push({ m: 0,  y: stageY.awake });
    path.push({ m: fa, y: stageY.light });
    for (let i = 0; i < cycles; i++) {
      const cs = fa + i * 90;
      const deepAmount = Math.max(0, 1 - i * 0.18);
      const deepY = stageY.light + (stageY.deep - stageY.light) * deepAmount;
      path.push({ m: cs + 18, y: deepY });
      path.push({ m: cs + 45, y: deepY });
      path.push({ m: cs + 60, y: stageY.light });
      const remDepth = 0.55 + (i / Math.max(1, cycles - 1)) * 0.45;
      const remY = stageY.rem + (stageY.light - stageY.rem) * (1 - remDepth);
      path.push({ m: cs + 78, y: remY });
      path.push({ m: cs + 90, y: stageY.light });
    }
    path.push({ m: totalMin, y: stageY.awake });

    const grad = ctx.createLinearGradient(0, padT, 0, padT + innerH);
    grad.addColorStop(0, hexToRgba(accent, 0.13));
    grad.addColorStop(1, hexToRgba(accent, 0.0));
    ctx.beginPath();
    ctx.moveTo(xAt(path[0].m), path[0].y);
    for (let i = 1; i < path.length; i++) {
      const p0 = path[i - 1], p1 = path[i];
      const cx = (xAt(p0.m) + xAt(p1.m)) / 2;
      ctx.bezierCurveTo(cx, p0.y, cx, p1.y, xAt(p1.m), p1.y);
    }
    ctx.lineTo(xAt(totalMin), padT + innerH);
    ctx.lineTo(xAt(0), padT + innerH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = border;
    for (let i = 1; i <= cycles; i++) {
      const x = xAt(fa + i * 90);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + innerH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(xAt(path[0].m), path[0].y);
    for (let i = 1; i < path.length; i++) {
      const p0 = path[i - 1], p1 = path[i];
      const cx = (xAt(p0.m) + xAt(p1.m)) / 2;
      ctx.bezierCurveTo(cx, p0.y, cx, p1.y, xAt(p1.m), p1.y);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(xAt(0), stageY.awake, 4, 0, Math.PI * 2);
    ctx.fillStyle = inkMuted;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(xAt(totalMin), stageY.awake, 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xAt(totalMin), stageY.awake, 9, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(accent, 0.25);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---------- Re-render orchestrator ----------
  function rerender() {
    compute();
    renderModeUI();
    renderPresets();
    renderResults();
    renderViz();
    updateOrb();
    updateAgeMatch();
  }

  // ---------- Theme ----------
  function applyTheme(mode) {
    const html = document.documentElement;
    const isDark = mode === 'dark';
    html.classList.toggle('dark', isDark);
    $('#iconSun').classList.toggle('hidden', !isDark);
    $('#iconMoon').classList.toggle('hidden', isDark);
    try { localStorage.setItem('ss_theme', isDark ? 'dark' : 'light'); } catch (_) {}
    renderViz();
  }

  // ---------- Orb mouse parallax ----------
  function bindOrbParallax() {
    const wrap = $('.orb-wrap');
    const orb  = $('#glassOrb');
    if (!wrap || !orb) return;
    let raf = null;
    let pointerInside = false;

    wrap.addEventListener('mousemove', (e) => {
      pointerInside = true;
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top)  / r.height;  // 0..1
      const rx = (0.5 - py) * 18;  // tilt range +/- 9deg
      const ry = (px - 0.5) * 18;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        orb.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
      });
    });
    wrap.addEventListener('mouseleave', () => {
      pointerInside = false;
      if (raf) cancelAnimationFrame(raf);
      orb.style.transform = '';
    });

    // Touch: simple gentle wobble
    wrap.addEventListener('touchstart', () => {
      orb.style.transform = 'rotateX(6deg) rotateY(-4deg) scale(1.02)';
      setTimeout(() => { if (!pointerInside) orb.style.transform = ''; }, 600);
    }, { passive: true });
  }

  // ---------- Bind events ----------
  function bind() {
    $('#modeTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mode]');
      if (!btn) return;
      state.mode = btn.dataset.mode;
      rerender();
    });

    $('#timeInput').addEventListener('input', (e) => {
      const v = e.target.value;
      if (!v) return;
      state.time = v;
      rerender();
    });

    $('#fallAsleep').addEventListener('input', (e) => {
      state.fallAsleep = Number(e.target.value);
      $('#fallAsleepVal').textContent = `${state.fallAsleep} min`;
      rerender();
    });

    $$('button[data-fmt]').forEach((b) => {
      b.addEventListener('click', () => {
        $$('button[data-fmt]').forEach(x => x.classList.toggle('active', x === b));
        state.format = Number(b.dataset.fmt);
        rerender();
      });
    });

    $('#ageInput').addEventListener('input', (e) => {
      let v = Number(e.target.value);
      if (!isFinite(v)) v = 0;
      v = Math.max(0, Math.min(120, v));
      state.age = v;
      updateAgeMatch();
    });

    $('#themeToggle').addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
    });

    let resizeRaf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(renderViz);
    });

    setInterval(() => {
      if (state.mode === 'now') {
        $('#nowText').textContent = fmtTimePlain(nowHM());
        rerender();
      }
    }, 30000);
  }

  // ---------- Init ----------
  function init() {
    $('#year').textContent = new Date().getFullYear();
    const isDark = document.documentElement.classList.contains('dark');
    $('#iconSun').classList.toggle('hidden', !isDark);
    $('#iconMoon').classList.toggle('hidden', isDark);

    bind();
    bindOrbParallax();
    rerender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
