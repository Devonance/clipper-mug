// Stand-in for docs/js/stage.js: implements the whole stage API (PLAN.md section D) with a flat 2-D placeholder, so the page works and can be tested without the 3D build.
// main.js loads the real stage first and falls back to this file. Nothing here touches the DOM outside the canvas.

const DEFAULTS = {
  start: { tHours: -0.2, saAngle: -90 }, frame: { ghost: 1, axes: 1, unroll: 0 }, sca: { tHours: -0.2, caKm: 50 },
  nadir: { altKm: 50, instr: 0, nacGimbal: 1 }, ram: { plume: 0.15, axes: 0 }, reason: { saAngle: -90, radarF: 9, iceKm: 10, cutaway: 1 },
  ecm: { magPlay: 1, oceanOn: 1, oceanSigma: 0.7 }, pims: { plasmaAz: 180, plasmaEl: 10, cones: 1 }, comms: { att: 1, earthAz: -30, beams: 1 },
  attitude: { turnX: 0, turnY: 0, burn: 0, roll: 0, nozzleArrows: 0 }, sensors: { cones: 1, sunAz: -60 }, rule: { mugFull: 1 },
  mug: { unroll: 0, lid: 0, coaster: 0, flip: 0 },
};

// A small stand-in for docs/art/mug-map.json (boxes in the 2048 x 910 print frame, read off the BRIEF transcription). The real file is read when present.
const B = (id, group, x, y, w, h, kind = 'text', pad = 6) => ({ id, group, kind, x, y, w, h, pad });
const STUB_MAP = [
  B('t-title-2', 'title', 534, 71, 223, 19), B('t-sca-3', 'sca', 578, 280, 154, 18), B('t-lrr', 'lrr', 579, 360, 149, 17), B('t-lid-coaster', 'lidcoaster', 560, 432, 184, 19),
  B('qr', 'lidcoaster', 558, 470, 184, 182, 'shape', 0), B('shape-speckle', 'speckle', 760, 652, 58, 67, 'shape', 0), B('ax-plus-x', 'axisX', 332, 372, 104, 54), B('ax-plus-z', 'axisZ', 966, 372, 98, 54),
  B('rect-plus-z', 'axisZ', 823, 263, 382, 484, 'shape', 0), B('ax-plus-y', 'axisY', 990, 803, 66, 47), B('ln-sa-x', 'saX', 400, 0, 26, 807, 'shape', 0), B('ln-sa-mx', 'saMX', 1623, 0, 27, 808, 'shape', 0),
  B('arrow-ecm', 'ecm', 7, 10, 56, 81, 'shape', 0), B('t-rem4', 'rem4', 156, 103, 83, 23), B('t-rwa4', 'rwa4', 110, 392, 100, 28), B('t-pims-lower-1', 'pimsLower', 28, 531, 348, 28),
  B('t-pims', 'pimsUpper', 861, 101, 106, 27), B('t-hga', 'hga', 982, 66, 88, 24), B('dot-maspex', 'maspex', 1131, 289, 64, 64, 'shape', 0), B('dot-suda', 'suda', 1132, 536, 64, 64, 'shape', 0),
  B('t-grs-1', 'grs', 1241, 83, 302, 28), B('t-fr-2', 'fr', 1282, 468, 223, 21), B('t-apert-2', 'apertures', 688, 754, 672, 36), B('t-srus', 'srus', 1120, 860, 80, 22),
  B('t-vault-1', 'vaultEdge', 1720, 285, 178, 23), B('t-lga3', 'rem3post', 1958, 92, 80, 23),
];

const CB = { parttap: 'onPartTap', parthover: 'onPartHover', mugtap: 'onMugTap', mughover: 'onMugHover', ready: 'onReady' };

export function initStage(canvas, opts = {}) {
  const g = canvas.getContext('2d');
  const ev = {};
  const P = {};                       // parameters set by the page
  const stage = {
    isStub: true, ok: false, noSway: false, station: 'start', mugOn: false, hl: null, hover: null, art: null, map: STUB_MAP, log: [],
    ready: null,
    on(name, fn) { (ev[name] ||= new Set()).add(fn); return () => ev[name].delete(fn); },
    _emit(name, info) { (ev[name] || []).forEach((f) => f(info)); const cb = opts[CB[name]]; cb && cb(info); },
    go(id) {
      stage.station = id; stage.log.push('go ' + id);
      const d = { ...(DEFAULTS[id] || {}) }; Object.assign(P, d);
      if (id === 'mug') stage.showMug(true); else if (stage.mugOn) stage.showMug(false);
      stage._emit('station', { id }); return d;
    },
    set(a, b) { if (typeof a === 'string') P[a] = b; else Object.assign(P, a); },
    setNow(a, b) { stage.set(a, b); },
    get(k) { return P[k]; },
    pulse(k) { stage.log.push('pulse ' + k); if (k === 'play') { P.tHours = -3; stage.playing = true; } },
    highlight(id) { stage.hl = id; },
    focus(id) { stage.log.push('focus ' + id); },
    view(v) { stage.log.push('view ' + JSON.stringify(v)); },
    shot(n) { stage.log.push('shot ' + n); },
    resetView() { stage.log.push('reset'); },
    zoomBy(k) { stage.log.push('zoom ' + k); },
    showMug(b) { stage.mugOn = !!b; if (b) loadArt(); return Promise.resolve(); },
    ghost(b) { P.ghost = b ? 1 : 0; },
    anchor(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; const a = (h % 360) * Math.PI / 180; return [Math.cos(a), Math.sin(a), 0]; },
    project(p) { const w = canvas.clientWidth, h = canvas.clientHeight; return { x: w / 2 + p[0] * 120, y: h / 2 + p[1] * 120, z: 1 }; },
    labelsVisible() {}, setQuality() {},
    readouts() {
      const t = P.tHours ?? -0.2, ca = P.caKm ?? 50;
      const alt = Math.min(40000, ca + ((40000 - ca) / 6.25) * t * t), s = performance.now() / 1000;
      return { altKm: P.altKm ?? alt, saAngle: P.saAngle ?? (alt < 10000 ? -90 : 0), phase: alt < 10000 ? 'SCA' : t < -2.5 ? 'Sun-track' : 'nadir-ram', hgaSeesEarth: (P.att ?? 1) === 1, ground_kms: 4.5,
        rw: [0.2, 0.4 + 0.2 * Math.sin(s), 0.1, 0.3], thrustN: P.burn ? 220 : 0, echoes: [0.3, 0.3 + (P.iceKm ?? 10) / 40], cups: [0.8, 0.2, 0.5, 0.1], locked: [true, true] };
    },
    exportPrintMap() { return stage.map; },
    resize() { const d = Math.min(2, devicePixelRatio || 1); canvas.width = Math.max(1, Math.round(canvas.clientWidth * d)); canvas.height = Math.max(1, Math.round(canvas.clientHeight * d)); stage.dpr = d; },
    dispose() { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); },
    frame(now) { draw(now); },
  };
  const loadArt = () => {
    if (stage.art !== null) return; stage.art = false;
    const im = new Image(); im.onload = () => { stage.art = im; }; im.onerror = () => {}; im.src = 'art/mug-wrap.svg';
    fetch('art/mug-map.json').then((r) => (r.ok ? r.json() : null)).then((m) => { if (Array.isArray(m) && m.length) stage.map = m; else if (m && Array.isArray(m.items)) stage.map = m.items; }).catch(() => {});
  };

  // 2-D placeholder drawing
  let last = 0;
  const stars = Array.from({ length: 90 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 997) / 997, 0.4 + ((i * 31) % 10) / 10]);
  const printRect = () => { const w = canvas.clientWidth, h = canvas.clientHeight, s = Math.min((w - 40) / 2048, (h - 80) / 910); return { x: (w - 2048 * s) / 2, y: (h - 910 * s) / 2, s }; };
  function draw(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (stage.playing) { P.tHours = Math.min(12, (P.tHours ?? -3) + 0.375 * dt); if (P.tHours >= 12) stage.playing = false; }
    if (canvas.width < 2) stage.resize();
    const d = stage.dpr || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = '#060a14'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fb7d8'; for (const [x, y, r] of stars) { g.globalAlpha = 0.4 + r * 0.4; g.fillRect(x * w, y * h, r, r); } g.globalAlpha = 1;
    if (stage.mugOn) {
      const R = printRect();
      g.fillStyle = '#f9f8f4'; g.fillRect(R.x, R.y, 2048 * R.s, 910 * R.s);
      if (stage.art && stage.art.complete) g.drawImage(stage.art, R.x, R.y, 2048 * R.s, 910 * R.s);
      else { g.strokeStyle = '#990134'; g.fillStyle = '#990134'; g.font = '11px sans-serif'; for (const m of stage.map) { g.strokeRect(R.x + m.x * R.s, R.y + m.y * R.s, m.w * R.s, m.h * R.s); g.fillText(m.id, R.x + m.x * R.s + 2, R.y + m.y * R.s + 11); } }
      const hv = stage.hover || (stage.hl && stage.map.find((m) => m.id === stage.hl));
      if (hv) { g.strokeStyle = '#ffca00'; g.lineWidth = 3; g.strokeRect(R.x + hv.x * R.s - 3, R.y + hv.y * R.s - 3, hv.w * R.s + 6, hv.h * R.s + 6); g.lineWidth = 1; }
      g.fillStyle = '#9fb0c8'; g.font = '12px ui-monospace,monospace'; g.fillText('STUB STAGE · flat print · station mug', 14, 20);
    } else {
      const cx = w / 2, cy = h / 2, a = Math.cos(((P.saAngle ?? -90) * Math.PI) / 180);
      g.fillStyle = '#7d8aa0'; g.fillRect(cx - 70, cy - 20, 140, 90);                       // vault
      g.fillStyle = '#c9a24a'; g.fillRect(cx - 40, cy + 70, 80, 70);                        // propulsion module
      g.fillStyle = '#15234a'; const sw = 120 + 80 * Math.abs(a); g.fillRect(cx - 70 - sw, cy + 10, sw, 36); g.fillRect(cx + 70, cy + 10, sw, 36);
      g.strokeStyle = '#f2f2f0'; g.beginPath(); g.ellipse(cx, cy - 40, 60, 14, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#9fb0c8'; g.font = '12px ui-monospace,monospace'; g.fillText('STUB STAGE · station ' + stage.station, 14, 20);
      g.fillStyle = '#62728c'; g.fillText(Object.entries(P).map(([k, v]) => k + '=' + (typeof v === 'number' ? +v.toFixed(2) : v)).join('  ').slice(0, 140), 14, h - 14);
      if (stage.hl) { const p = stage.project(stage.anchor(stage.hl)); g.strokeStyle = '#ffca00'; g.beginPath(); g.arc(p.x, p.y, 14, 0, Math.PI * 2); g.stroke(); }
    }
    stage.ok = true;
  }

  // mug hit testing on the flat print (PLAN.md section E.4, on a 2-D print instead of a mug)
  function hit(e) {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, R = printRect();
    const px = (x - R.x) / R.s, py = (y - R.y) / R.s; if (px < 0 || py < 0 || px > 2048 || py > 910) return null;
    let best = null;
    for (const m of stage.map) { const p = m.pad || 0; if (px >= m.x - p && px <= m.x + m.w + p && py >= m.y - p && py <= m.y + m.h + p && (!best || m.w * m.h < best.w * best.h)) best = m; }
    return best && { m: best, info: { svgId: best.id, group: best.group, x, y, u: px / 2048, v: py / 910 } };
  }
  let downAt = null;
  const move = (e) => { if (!stage.mugOn) return; const h = hit(e); const id = h ? h.m.id : null; if ((stage.hover && stage.hover.id) !== id) { stage.hover = h ? h.m : null; stage._emit('mughover', h ? h.info : null); } };
  const down = (e) => { downAt = [e.clientX, e.clientY]; };
  const up = (e) => { if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null; if (stage.mugOn && moved < 6) { const h = hit(e); if (h) stage._emit('mugtap', h.info); } };
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up);

  stage.ready = Promise.resolve(true);
  Promise.resolve().then(() => { stage.resize(); stage._emit('ready', true); });
  return stage;
}
