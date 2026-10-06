// Europa Clipper mug explainer: boot, station engine, labels, controls, phone sheet, frame loop.
// The 3D stage is docs/js/stage.js (loaded by dynamic import); docs/js/stage-stub.js is the fallback. All traffic goes through the API in PLAN.md section D.
import { STATIONS, PARTS, MUG_POPUPS, CREDIT_LINKS, OWNER_NAME } from './content.js';
import { TERMS, autoLink } from './glossary.js';
import { initUI, tags } from './ui.js';
import { Sound } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const Q = new URLSearchParams(location.search);
const ROOT = document.documentElement;
const sections = $$('.step');
const IDS = STATIONS.map((s) => s.id);
const sound = new Sound();
const coarse = matchMedia('(pointer:coarse)').matches;

/* ── stage: the real one if it loads, else the stub ───────────────── */
let cv = $('#stage'), stage = null, stubbed = false;
const SI = {
  onPartTap: (i) => partTap(i), onPartHover: (i) => partHover(i), onMugTap: (i) => mugTap(i), onMugHover: (i) => mugHover(i),
};
async function loadStage(canvas, forceStub) {
  let mod = null;
  if (!forceStub && !Q.has('stub')) { try { mod = await import('./stage.js'); } catch (e) { mod = null; } }
  stubbed = !mod;
  if (!mod) mod = await import('./stage-stub.js');
  return mod.initStage(canvas, SI);
}
stage = await loadStage(cv);
// the page talks to the stage through this proxy, so the stage can be swapped (WebGL failure) without re-wiring anything
const S = new Proxy({}, { get: (_, k) => { const v = stage[k]; return typeof v === 'function' ? v.bind(stage) : v; }, set: (_, k, v) => { stage[k] = v; return true; } });
let nogl = false;
stage.ready.then(async (ok) => {
  if (ok || stubbed) return;
  nogl = true; ROOT.classList.add('nogl');                   // WebGL failed: text-only page with a flat print in station 12
  try { stage.dispose && stage.dispose(); } catch (e) { /* fine */ }
  stage = await loadStage(document.createElement('canvas'), true);
  const f = $('#s12 .ctls'); if (f && !$('.flat')) f.insertAdjacentHTML('beforebegin', '<figure class="flat"><img src="art/mug-wrap.svg" alt="The printed wrap of the mug, flat" onerror="this.parentNode.remove()"></figure>');
  go(cur, true);
});

/* ── explanation mode: ELI5 | Engineer ────────────────────────────── */
function setMode(m) {
  m = m === 'eng' ? 'eng' : 'eli5';
  ROOT.dataset.mode = m;
  $$('#mode button, #setMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  try { localStorage.setItem('cm-mode', m); } catch (e) { /* storage blocked: fine */ }
  requestAnimationFrame(() => labelEls.forEach((o) => measure(o)));
}
for (const el of [$('#mode'), $('#setMode')]) el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });

/* ── labels pinned to the 3D scene (a dot on each part; tap to open its text) ── */
const labelsEl = $('#labels');
let labelEls = [], openLbl = null;
const closeLabel = () => { if (openLbl) openLbl.classList.remove('open'); openLbl = null; };
const openLabel = (d) => { if (openLbl && openLbl !== d) openLbl.classList.remove('open'); d.classList.add('open'); openLbl = d; };
addEventListener('pointerdown', (e) => { if (openLbl && !openLbl.contains(e.target)) closeLabel(); }, true);
function setLabels(list = []) {
  labelsEl.innerHTML = ''; openLbl = null;
  labelEls = list.map((L) => {
    const d = document.createElement('button');
    d.type = 'button'; d.setAttribute('aria-label', L.t); d.className = 'lbl' + (L.side === 'l' ? ' l' : '');
    d.style.color = L.c; d.innerHTML = `<i></i><span>${L.t}</span>`; d.style.opacity = 0;
    d.addEventListener('click', () => {
      if (!d.classList.contains('open')) { openLabel(d); S.highlight(L.a); } else { S.focus(L.a); closeLabel(); }
    });
    labelsEl.appendChild(d);
    return { el: d, L, w: 0, full: 0 };
  });
  requestAnimationFrame(() => labelEls.forEach(measure));
}
function measure(o) { o.w = o.el.offsetWidth; o.full = o.w + 7 + o.el.querySelector('span').offsetWidth; }
function placeLabels() {
  if (!labelEls.length) return;
  const r = cv.getBoundingClientRect(), placed = [];
  for (const o of labelEls) {
    const p = S.project(S.anchor(o.L.a));
    const x = r.left + p.x, y = r.top + p.y;
    const at = (side) => (side === 'l' ? x - o.w + 3.5 : x - 3.5);
    let side = o.L.side === 'l' ? 'l' : 'r', left = at(side);
    const ext = (s, l) => (s === 'l' ? l + o.w - o.full : l);
    const bad = (s, l) => ext(s, l) < Math.max(4, r.left) || ext(s, l) + o.full > Math.min(innerWidth, r.right) - 4;
    if (bad(side, left)) { const alt = side === 'l' ? 'r' : 'l'; if (!bad(alt, at(alt))) { side = alt; left = at(alt); } }
    let yy = y;
    for (let k = 0; k < 4; k++) { const hit = placed.find((q) => left < q.r + 4 && left + o.w > q.l - 4 && Math.abs(yy - q.y) < 14); if (!hit) break; yy = hit.y + (yy >= hit.y ? 15 : -15); }
    placed.push({ l: left, r: left + o.w, y: yy });
    if (o.side !== side) { o.el.classList.toggle('l', side === 'l'); o.side = side; }
    const vis = stage.ok && !mugOn && !nogl && p.z > 0 && yy > r.top + 40 && yy < r.bottom - 6 && left > r.left && left + o.w < r.right;
    o.el.style.opacity = vis ? 1 : 0;
    o.el.style.pointerEvents = vis ? 'auto' : 'none';
    if (!vis && o.el === openLbl) closeLabel();
    o.el.style.transform = `translate(${left}px,${yy - 7}px)`;
  }
}

/* ── layout: desktop side panel, phone bottom sheet ───────────────── */
let mobile = false, sheetY = 0, sheetState = 'half', needResize = false;
const storyEl = $('#story'), grip = $('#grip');
const drawers = { L: false };
try { drawers.L = localStorage.getItem('cm-hideL') === '1'; } catch (e) { /* fine */ }
const snaps = () => ({ peek: innerHeight - 140, half: Math.round(innerHeight * 0.5), full: 54 });
function setSheet(y) {
  sheetY = y; ROOT.style.setProperty('--sy', y + 'px');
  if (mobile) { ROOT.style.setProperty('--cb', Math.max(0, innerHeight - y) + 'px'); needResize = true; }
}
const snapSheet = (st) => { sheetState = st; setSheet(snaps()[st]); };
{
  let d = null;
  grip.addEventListener('pointerdown', (e) => { if (!mobile) return; d = { y: e.clientY, s: sheetY, t: performance.now(), moved: 0 }; grip.setPointerCapture(e.pointerId); storyEl.classList.add('dragging'); });
  grip.addEventListener('pointermove', (e) => { if (!d) return; const dy = e.clientY - d.y; d.moved = Math.max(d.moved, Math.abs(dy)); setSheet(clamp(d.s + dy, 54, innerHeight - 110)); });
  const end = (e) => {
    if (!d) return; storyEl.classList.remove('dragging');
    const dy = e.clientY - d.y, v = dy / Math.max(1, performance.now() - d.t);
    if (d.moved < 6) snapSheet(sheetState === 'full' ? 'half' : sheetState === 'half' ? 'full' : 'half');
    else { const aim = sheetY + v * 220, Sn = snaps(); snapSheet(Object.keys(Sn).reduce((a, k) => (Math.abs(Sn[k] - aim) < Math.abs(Sn[a] - aim) ? k : a), 'half')); }
    d = null;
  };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); snapSheet(sheetState === 'full' ? 'half' : 'full'); } });
}
function applyDrawers() {
  document.body.classList.toggle('hideL', drawers.L);
  $('#tabL').setAttribute('aria-expanded', !drawers.L); $('#tabL').setAttribute('aria-label', drawers.L ? 'Show the text panel' : 'Hide the text panel');
  try { localStorage.setItem('cm-hideL', drawers.L ? '1' : '0'); } catch (e) { /* fine */ }
  layout();
}
$('#tabL').addEventListener('click', () => { drawers.L = !drawers.L; applyDrawers(); });
addEventListener('keydown', (e) => { if (e.target.closest('input,textarea,select') || mobile) return; if (e.key === '[') { drawers.L = !drawers.L; applyDrawers(); } });
function toggleImmersive() {
  if (mobile) { snapSheet(sheetState === 'peek' ? 'half' : 'peek'); return; }
  document.body.classList.toggle('immersive'); layout();
}
function layout() {
  mobile = innerWidth <= 900;
  if (!mobile) {
    const hide = drawers.L || document.body.classList.contains('immersive');
    ROOT.style.setProperty('--cl', hide ? '0px' : storyEl.offsetLeft + storyEl.offsetWidth + 6 + 'px'); ROOT.style.setProperty('--cb', '0px');
  } else { ROOT.style.setProperty('--cl', '0px'); snapSheet(sheetState); }
  needResize = true;
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 80); });

/* ── stations ──────────────────────────────────────────────────────── */
let cur = -1, mugOn = false, ctl = null;
const seen = new Set();
const dots = $('#dots');
sections.forEach((s, k) => {
  const b = document.createElement('button');
  b.textContent = k === 0 ? '◆' : String(k).padStart(2, '0');
  b.title = s.dataset.title; b.setAttribute('aria-label', `Station ${k}: ${s.dataset.title}`);
  b.addEventListener('click', () => go(k));
  dots.appendChild(b);
});
const stationOf = (v) => { if (v == null || v === '') return 0; if (/^\d+$/.test(v)) return clamp(+v, 0, sections.length - 1); const i = IDS.indexOf(v); return i < 0 ? 0 : i; };
function setMugState(on) {
  mugOn = on; document.body.classList.toggle('mugmode', on);
  $$('[data-tool="mug"]').forEach((b) => b.classList.toggle('on', on));
  const t = $('#mugT'); if (t) t.checked = on;
  if (on) { closeLabel(); setLabels([]); } else if (cur >= 0) setLabels(STATIONS[cur].labels);
}
function go(n, force) {
  n = clamp(n | 0, 0, sections.length - 1);
  if (n === cur && !force) return;
  const st = STATIONS[n];
  cur = n; seen.add(n);
  ui && ui.hidePop(); ui && ui.hideTip();
  document.body.className = document.body.className.replace(/\bst\d+\b/g, '').trim() + ' st' + n;
  sound.sfx('step');
  sections.forEach((s, k) => s.classList.toggle('on', k === n));
  $$('#dots button').forEach((b, k) => { b.classList.toggle('on', k === n); if (k === n) b.classList.add('seen'); });
  $('#stepName').textContent = `${String(n).padStart(2, '0')} · ${sections[n].dataset.title}`;
  $('#prev').disabled = n === 0;
  $('#next').textContent = n === sections.length - 1 ? (mobile ? '↺' : 'Restart ↺') : mobile ? '→' : 'Next →';
  storyEl.scrollTop = 0;
  history.replaceState(null, '', '#' + n);
  const params = S.go(st.id) || {};
  setMugState(st.id === 'mug');
  setLabels(st.labels);
  buildControls(st, params);
  if (!mobile) layout();
}
$('#prev').addEventListener('click', () => go(cur - 1));
$('#next').addEventListener('click', () => go(cur === sections.length - 1 ? 0 : cur + 1));
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (g) go(+g.dataset.go);
  const s = e.target.closest('span.src'); if (s) { go(sections.length - 1); setTimeout(() => { const c = $('#credits'); c && (storyEl.scrollTop = c.offsetTop - 12); }, 60); }
});
document.addEventListener('keydown', (e) => { if (e.target.matches && e.target.matches('span.src') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); } });
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,select,.pad') || (ui && ui.isOpen())) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(cur + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(cur - 1); e.preventDefault(); }
});
addEventListener('hashchange', () => go(stationOf(location.hash.slice(1))));

/* ── controls under each station's text ─────────────────────────────── */
const E = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
let live = { sliders: [], toggles: [], segs: [], pads: [], ro: [] };
function pushVal(key, v) {
  if (key === '@mug') return;
  if (key === 'ghost') { S.ghost(!!v); $$('[data-tool="ghost"]').forEach((b) => b.classList.toggle('on', !!v)); return; }
  S.set(key, v);
}
function makeSlider(c, params) {
  const lab = E('label', 'sl', `<span>${c.label} <output></output></span><input type="range" min="${c.min}" max="${c.max}" step="${c.step}">`);
  const inp = $('input', lab), out = $('output', lab);
  const show = (v) => { inp.style.setProperty('--p', ((v - c.min) / (c.max - c.min)) * 100 + '%'); out.textContent = c.show(v); };
  inp.value = params[c.key] ?? c.v; show(+inp.value);
  let drag = false;
  inp.addEventListener('input', () => { show(+inp.value); pushVal(c.key, +inp.value); });
  inp.addEventListener('pointerdown', () => (drag = true));
  for (const ev of ['pointerup', 'pointercancel', 'blur']) inp.addEventListener(ev, () => (drag = false));
  live.sliders.push({ c, inp, show, drag: () => drag || document.activeElement === inp });
  return lab;
}
function makeToggle(c, params) {
  const lab = E('label', 'tog', `<input type="checkbox"><span>${c.label}</span>`), inp = $('input', lab);
  if (c.key === '@mug') { inp.id = 'mugT'; inp.checked = mugOn; inp.addEventListener('change', () => setMug(inp.checked)); return lab; }
  inp.checked = !!(c.key === 'ghost' ? (params.ghost ?? c.v) : (params[c.key] ?? c.v));
  inp.addEventListener('change', () => pushVal(c.key, inp.checked ? 1 : 0));
  live.toggles.push({ c, inp });
  return lab;
}
function makeSeg(c, params) {
  const wrap = E('div'), root = E('div', 'seg'); root.setAttribute('role', 'group'); root.setAttribute('aria-label', c.label);
  wrap.appendChild(E('span', 'cl', c.label));
  const cv0 = params[c.key] ?? c.v;
  for (const [t, v] of c.opts) { const b = E('button', cv0 === v ? 'on' : '', t); b.type = 'button'; b._v = v; root.appendChild(b); }
  root.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', root).forEach((x) => x.classList.toggle('on', x === b)); pushVal(c.key, b._v); });
  wrap.appendChild(root); live.segs.push({ c, root });
  return wrap;
}
function makePad(c, params) {
  const wrap = E('div'), pad = E('div', 'pad', '<i></i>'); pad.tabIndex = 0; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', c.label + ': drag, or use the arrow keys');
  wrap.appendChild(E('span', 'cl', c.label)); wrap.appendChild(pad); wrap.appendChild(E('p', 'padh', c.hint || ''));
  const [kx, ky] = c.keys, [rx, ry] = c.range, dot = $('i', pad);
  const val = [params[kx] ?? c.v[0], params[ky] ?? c.v[1]];
  const draw = () => { dot.style.left = ((val[0] - rx[0]) / (rx[1] - rx[0])) * 100 + '%'; dot.style.top = (1 - (val[1] - ry[0]) / (ry[1] - ry[0])) * 100 + '%'; };
  const send = () => { pushVal(kx, val[0]); pushVal(ky, val[1]); draw(); };
  const at = (e) => { const r = pad.getBoundingClientRect(); const fx = clamp((e.clientX - r.left) / r.width, 0, 1), fy = clamp((e.clientY - r.top) / r.height, 0, 1); val[0] = rx[0] + fx * (rx[1] - rx[0]); val[1] = ry[0] + (1 - fy) * (ry[1] - ry[0]); send(); };
  let on = false;
  pad.addEventListener('pointerdown', (e) => { on = true; pad.setPointerCapture(e.pointerId); at(e); });
  pad.addEventListener('pointermove', (e) => { if (on) at(e); });
  const rel = () => { if (!on) return; on = false; if (c.spring) { val[0] = (rx[0] + rx[1]) / 2; val[1] = (ry[0] + ry[1]) / 2; send(); } };
  pad.addEventListener('pointerup', rel); pad.addEventListener('pointercancel', rel);
  pad.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (!k) return;
    e.preventDefault(); val[0] = clamp(val[0] + k[0] * (rx[1] - rx[0]) / 10, rx[0], rx[1]); val[1] = clamp(val[1] + k[1] * (ry[1] - ry[0]) / 10, ry[0], ry[1]); send();
  });
  pad.addEventListener('keyup', (e) => { if (c.spring && e.key.startsWith('Arrow')) { val[0] = (rx[0] + rx[1]) / 2; val[1] = (ry[0] + ry[1]) / 2; send(); } });
  draw(); live.pads.push({ c, val, draw });
  return wrap;
}
let flipState = 0;
function makeBtn(c) {
  const b = E('button', 'btn ' + (c.cls || ''), c.label); b.type = 'button';
  b.addEventListener('click', () => {
    sound.sfx('press');
    if (c.go != null) go(c.go);
    else if (c.shot) S.shot(c.shot);
    else if (c.pulse) S.pulse(c.pulse);
    else if (c.flip) { flipState = flipState ? 0 : 1; S.set('flip', flipState); sound.sfx('flip'); }
    else if (c.act === 'mug') { setMug(true); }
    else if (c.act === 'unmug') { setMug(false); }
    else if (c.act === 'reset') { const p = S.go(STATIONS[cur].id) || {}; syncControls(p); }
  });
  return b;
}
function makeHold(c) {
  const b = E('button', 'btn hold', c.label); b.type = 'button';
  const press = () => { b.classList.add('down'); S.set(c.key, c.on); sound.sfx('press'); };
  const lift = () => { b.classList.remove('down'); S.set(c.key, c.off); };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); press(); });
  b.addEventListener('pointerup', lift); b.addEventListener('pointercancel', lift);
  b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
  b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') lift(); });
  return b;
}
function makeItems() {
  const wrap = E('div'); wrap.appendChild(E('span', 'cl', 'Everything printed on the mug'));
  const box = E('div', 'items');
  for (const [g, P] of Object.entries(MUG_POPUPS)) {
    const b = E('button', 'chip', P.title.length > 28 ? P.title.slice(0, 26) + '…' : P.title); b.type = 'button'; b.title = P.title; b.dataset.g = g;
    b.addEventListener('click', () => { $$('.chip', box).forEach((x) => x.classList.toggle('on', x === b)); S.highlight(P.ids[0]); const r = b.getBoundingClientRect(); popFor(g, P.ids[0], r.left, r.bottom, true); });
    box.appendChild(b);
  }
  wrap.appendChild(box); return wrap;
}
function build(c, params) {
  switch (c.t) {
    case 'slider': return makeSlider(c, params);
    case 'toggle': return makeToggle(c, params);
    case 'seg': return makeSeg(c, params);
    case 'pad': return makePad(c, params);
    case 'btn': return makeBtn(c);
    case 'hold': return makeHold(c);
    case 'note': return E('p', 'note', c.html);
    case 'items': return makeItems();
    case 'row': { const r = E('div', 'row'); c.items.forEach((i) => r.appendChild(build(i, params))); return r; }
    default: return E('span');
  }
}
function buildControls(st, params) {
  $$('.ctls').forEach((e) => (e.innerHTML = ''));
  live = { sliders: [], toggles: [], segs: [], pads: [], ro: [] };
  const host = $(`.ctls[data-ctl="${st.id}"]`); if (!host) return;
  flipState = 0;
  for (const c of st.controls) host.appendChild(build(c, params));
  if (st.ro.length) {
    const ro = E('div', 'ro');
    st.ro.forEach((r) => { const d = E('div', '', `<small>${r.l}</small><span>—</span>`); ro.appendChild(d); live.ro.push({ r, el: d.lastChild, last: null }); });
    host.appendChild(ro);
  }
  autoLink(host);
}
function syncControls(params) {
  for (const { c, inp, show } of live.sliders) if (params[c.key] != null) { inp.value = params[c.key]; show(+inp.value); }
  for (const { c, inp } of live.toggles) if (params[c.key] != null) inp.checked = !!params[c.key];
  for (const { c, root } of live.segs) if (params[c.key] != null) $$('button', root).forEach((b) => b.classList.toggle('on', b._v === params[c.key]));
  for (const p of live.pads) { const [kx, ky] = p.c.keys; if (params[kx] != null) p.val[0] = params[kx]; if (params[ky] != null) p.val[1] = params[ky]; p.draw(); }
}
function setMug(on) {
  const run = () => { setMugState(on); return S.showMug(on); };
  if (on && cur !== sections.length - 1) { go(sections.length - 1); return; }
  run();
}
function toggleMug() { if (cur !== sections.length - 1) go(sections.length - 1); else setMug(!mugOn); }
function toggleGhost() { const on = !(S.get('ghost') > 0.5); S.ghost(on); $$('[data-tool="ghost"]').forEach((b) => b.classList.toggle('on', on)); const t = live.toggles.find((x) => x.c.key === 'ghost'); if (t) t.inp.checked = on; }

/* ── mug pop-ups and part taps ──────────────────────────────────────── */
const REV = {};
for (const [g, P] of Object.entries(MUG_POPUPS)) for (const id of P.ids) REV[id] ||= g;
function popFor(group, svgId, x, y, pin) {
  const P = MUG_POPUPS[group] || MUG_POPUPS[REV[svgId]]; if (!P) return;
  const si = IDS.indexOf(P.st);
  ui.showPop({ title: P.title, eli5: P.eli5, eng: P.eng, x, y, pin, action: P.st === 'mug' ? null : { label: 'Show in 3D →', fn: () => { S.showMug(false); setMugState(false); go(si); S.highlight(svgId); } } });
}
const canvasXY = (i) => { const r = cv.getBoundingClientRect(); return [r.left + (i.x || 0), r.top + (i.y || 0)]; };
function mugHover(i) {
  if (coarse || !mugOn) return;
  if (!i) { if (!ui.popPinned()) { ui.hidePop(); S.highlight(null); } return; }
  if (ui.popPinned()) return;
  const [x, y] = canvasXY(i); popFor(i.group, i.svgId, x, y, false);
}
function mugTap(i) {
  if (!i) { ui.hidePop(); return; }
  const [x, y] = canvasXY(i); popFor(i.group, i.svgId, x, y, true);
}
function partHover(i) { cv.style.cursor = i ? 'pointer' : ''; }
function partTap(i) {
  if (!i) { ui.hidePop(); return; }
  const P = PARTS[i.part] || [i.part, null, null], T = P[1] ? TERMS[P[1]] : null, [x, y] = canvasXY(i);
  const si = P[2] ? IDS.indexOf(P[2]) : -1;
  S.highlight(i.part);
  ui.showPop({ title: P[0], eli5: T ? T.d : 'A part of the spacecraft.', eng: T ? `${T.x}${T.src ? ' [' + T.src + ']' : ''}` : '', x, y, pin: true,
    action: si >= 0 && si !== cur ? { label: 'Open its station →', fn: () => go(si) } : null });
}

/* ── sound button ───────────────────────────────────────────────────── */
const sBtn = $('#soundBtn');
sound.onChange((on) => {
  const none = sound.available === false;
  sBtn.classList.toggle('off', !on || none); sBtn.disabled = none; sBtn.setAttribute('aria-pressed', on && !none);
  sBtn.setAttribute('aria-label', none ? 'No music available' : on ? 'Mute sound' : 'Turn sound on');
  $('b', sBtn).textContent = none ? 'No music' : on ? 'Sound on' : 'Muted';
  $('#musicLine').textContent = none ? 'Music: none available.' : `Music: ${sound.title || 'Under The Jovian Sky'}, made by ${OWNER_NAME} with Google Lyria.`;
});
sBtn.addEventListener('click', () => sound.toggle());
let toastT;
function toast(html, ms = 4200) { const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
addEventListener('pointerdown', () => { if (sound.on) setTimeout(() => { if (sound.available) toast('♪ Soft music is playing. Tap <b>Sound on</b> at the top to mute it.'); }, 900); }, { once: true });

/* ── frame loop ─────────────────────────────────────────────────────── */
let ro = 0;
function loop(now) {
  if (needResize) { needResize = false; S.resize(); }
  S.frame(now);
  placeLabels();
  if (now > ro) {
    ro = now + 100;
    const r = live.ro.length ? S.readouts() || {} : null;
    if (r) for (const o of live.ro) { const h = o.r.f(r); if (h !== o.last) { o.el.innerHTML = h; o.last = h; } }
    for (const s of live.sliders) if (s.c.track && !s.drag()) { const v = S.get(s.c.key); if (typeof v === 'number' && Math.abs(v - +s.inp.value) > 0.01) { s.inp.value = v; s.show(v); } }
  }
  requestAnimationFrame(loop);
}

/* ── boot ───────────────────────────────────────────────────────────── */
autoLink(storyEl);
const credits = $('#credits');
if (credits) { credits.innerHTML = CREDIT_LINKS; autoLink(credits); }
$$('.owner').forEach((e) => { e.textContent = OWNER_NAME; });   // static copy carries the name from the generator; this keeps it in step with content.js
const ui = initUI({ stage: S, go, getCur: () => cur, sections, seen, linkify: autoLink, toggleImmersive, toggleMug, toggleGhost, sound });
cv.addEventListener('dblclick', () => S.resetView());
setMode(ROOT.dataset.mode);
applyDrawers();
snapSheet('half');
layout();
go(stationOf(location.hash.slice(1)), true);
setLabels(STATIONS[cur].labels);
requestAnimationFrame(loop);
const popupGroup = (id, g) => (MUG_POPUPS[g] ? g : REV[id] || null);
window.__cm = { STATIONS, MUG_POPUPS, partTap, mugTap, popupGroup, go, setMode, S, get stubbed() { return stubbed; }, get nogl() { return nogl; }, cur: () => cur, sound, ui, layout, snapSheet, setMug, TERMS, tags };
