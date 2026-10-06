// Europa Clipper mug explainer: dotted-term tips, glossary, pop-up card, menu drawer, modal, settings and the 3D toolbar.
import { TERMS } from './glossary.js';
import { CREDIT_LINKS } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const tags = (s) => esc(s).replace(/\[([A-Za-z0-9 .]+)\]/g, '<span class="src" role="button" tabindex="0">[$1]</span>');
const store = {
  get(k, d) { try { const v = localStorage.getItem('cm-' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cm-' + k, v); } catch (e) { /* private mode: fine */ } },
};

export function initUI(ctx) {
  const { stage, go, getCur, sections, linkify } = ctx;

  /* ── dotted-term tips ──────────────────────────── */
  const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let tipKey = null, tipPinned = false;
  function showTip(key, x, y, below = 12) {
    const T = TERMS[key]; if (!T) return hideTip();
    if (tipKey !== key) {
      tip.innerHTML = `<b>${esc(T.t)}</b><span>${esc(T.d)}</span><em>${esc(T.x)}${T.src ? ` [${esc(T.src)}]` : ''}</em>`;
      tipKey = key;
    }
    tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const L = Math.min(innerWidth - w - 10, Math.max(10, x - w / 2));
    let Tp = y + below; if (Tp + h > innerHeight - 10) Tp = y - h - 14;
    tip.style.transform = `translate(${L}px,${Math.max(10, Tp)}px)`;
  }
  function hideTip() { tip.classList.remove('on'); tipKey = null; tipPinned = false; }
  document.addEventListener('mouseover', (e) => { const b = e.target.closest('.term'); if (b && !tipPinned) { const r = b.getBoundingClientRect(); showTip(b.dataset.t, r.left + r.width / 2, r.bottom); } });
  document.addEventListener('mouseout', (e) => { if (e.target.closest('.term') && !tipPinned) hideTip(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.term');
    if (b && b.closest('summary')) e.preventDefault();        // do not fold a "go deeper" card when tapping its jargon
    if (b) { const r = b.getBoundingClientRect(); if (tipPinned && tipKey === b.dataset.t) hideTip(); else { showTip(b.dataset.t, r.left + r.width / 2, r.bottom); tipPinned = true; } return; }
    if (!e.target.closest('#tip') && tipPinned) hideTip();
  });
  $('#story').addEventListener('scroll', hideTip, { passive: true });

  /* ── glossary ──────────────────────────────────── */
  const gl = $('#gloss'), gList = $('#glossList'), gq = $('#glossQ');
  const entries = Object.entries(TERMS).sort((a, b) => a[1].t.localeCompare(b[1].t));
  gList.innerHTML = entries.map(([k, T]) => `<div class="ge" data-k="${k}"><b>${esc(T.t)}</b><p>${esc(T.d)}</p><p class="pro gx">${esc(T.x)}<span class="gs">Source: ${esc(T.src)}</span></p></div>`).join('');
  const filterGloss = (q) => { q = q.trim().toLowerCase(); $$('.ge', gList).forEach((e) => (e.style.display = !q || e.textContent.toLowerCase().includes(q) ? '' : 'none')); };
  const openGloss = (k) => {
    gl.hidden = false; gq.value = ''; filterGloss('');
    setTimeout(() => { gl.classList.add('on'); if (k) { const el = $(`.ge[data-k="${k}"]`, gList); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 1600); } } else gq.focus(); }, 16);
  };
  const closeGloss = () => { gl.classList.remove('on'); setTimeout(() => (gl.hidden = true), 200); };
  gq.addEventListener('input', () => filterGloss(gq.value));
  $('#glossBtn').addEventListener('click', () => openGloss());
  $('#glossX').addEventListener('click', closeGloss);
  gl.addEventListener('click', (e) => { if (e.target === gl) closeGloss(); });
  tip.addEventListener('click', () => { const k = tipKey; hideTip(); openGloss(k); });

  /* ── pop-up card: printed items on the mug, parts of the spacecraft ── */
  const pop = document.createElement('div'); pop.id = 'pop'; pop.setAttribute('role', 'dialog'); document.body.appendChild(pop);
  let popPinned = false;
  function showPop({ title, eli5, eng, x, y, pin, action, html }) {
    pop.innerHTML = `<b class="pt">${esc(title)}</b><p>${html ? eli5 : esc(eli5)}</p>${eng ? `<em>${html ? eng : tags(eng)}</em>` : ''}${action ? `<button class="btn" type="button">${esc(action.label)}</button>` : ''}`;
    if (action) $('button', pop).addEventListener('click', () => { hidePop(); action.fn(); });
    pop.classList.add('on'); popPinned = !!pin;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const L = Math.min(innerWidth - w - 10, Math.max(10, x + 14)); let T = y + 16; if (T + h > innerHeight - 10) T = Math.max(10, y - h - 14);
    pop.style.transform = `translate(${L}px,${Math.max(10, T)}px)`;
  }
  function hidePop() { pop.classList.remove('on'); popPinned = false; }
  document.addEventListener('pointerdown', (e) => { if (popPinned && !e.target.closest('#pop') && !e.target.closest('#stage') && !e.target.closest('.chip')) hidePop(); }, true);

  /* ── generic modal ─────────────────────────────── */
  const modal = $('#modal'), mBody = $('#mBody'), mTitle = $('#mTitle');
  function openModal(title, html) {
    mTitle.textContent = title; mBody.innerHTML = html; mBody.scrollTop = 0; modal.hidden = false; setTimeout(() => modal.classList.add('on'), 16); linkify(mBody); $('#mClose').focus({ preventScroll: true });
  }
  function closeModal() { modal.classList.remove('on'); setTimeout(() => { modal.hidden = true; mBody.innerHTML = ''; }, 200); }
  $('#mClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  const openCredits = () => openModal('Sources & credits', `<div class="credits" style="border:0;margin:0;padding:0">${CREDIT_LINKS}</div>`);

  /* ── menu drawer ───────────────────────────────── */
  const menu = $('#menu');
  $('#mStations').innerHTML = sections.map((s, k) => {
    const h = $('h1, h2', s).textContent.replace(/\s+/g, ' ');
    return `<li><button data-go-st="${k}"><span class="mn">${k === 0 ? '◆' : String(k).padStart(2, '0')}</span><span class="mt"><b>${esc(h)}</b><small>${esc(s.dataset.title)}</small></span><span class="mk" aria-hidden="true"></span></button></li>`;
  }).join('');
  const openMenu = () => {
    menu.hidden = false; setTimeout(() => menu.classList.add('on'), 16);
    $$('#mStations button').forEach((b) => { const k = +b.dataset.goSt; b.classList.toggle('on', k === getCur()); b.classList.toggle('seen', ctx.seen.has(k)); });
  };
  const closeMenu = () => { menu.classList.remove('on'); setTimeout(() => (menu.hidden = true), 250); };
  $('#menuBtn').addEventListener('click', openMenu);
  $('#menuX').addEventListener('click', closeMenu);
  menu.addEventListener('click', (e) => {
    if (e.target === menu) return closeMenu();
    const st = e.target.closest('[data-go-st]'); if (st) { closeMenu(); go(+st.dataset.goSt); return; }
    const a = e.target.closest('[data-menu]'); if (!a) return;
    closeMenu();
    const k = a.dataset.menu;
    if (k === 'mug') go(sections.length - 1); else if (k === 'glossary') openGloss(); else if (k === 'sources') openCredits();
  });

  /* ── settings ──────────────────────────────────── */
  const setQ = (q) => { stage.setQuality(q); store.set('quality', q); $$('#setQ button').forEach((b) => b.classList.toggle('on', b.dataset.q === q)); };
  $('#setQ').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setQ(b.dataset.q); });
  setQ(store.get('quality', 'auto'));
  const labelsT = $('#setLabels'), motionT = $('#setMotion');
  const applyLabels = (on) => { document.body.classList.toggle('nolabels', !on); stage.labelsVisible(on); store.set('labels', on ? '1' : '0'); labelsT.checked = on; $$('[data-tool="labels"]').forEach((b) => b.classList.toggle('on', on)); };
  labelsT.addEventListener('change', () => applyLabels(labelsT.checked));
  applyLabels(store.get('labels', '1') === '1');
  const applyMotion = (on) => { stage.noSway = !on; store.set('motion', on ? '1' : '0'); motionT.checked = on; };
  motionT.addEventListener('change', () => applyMotion(motionT.checked));
  applyMotion(store.get('motion', '1') === '1');

  /* ── 3D toolbar ────────────────────────────────── */
  $('#tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    const t = b.dataset.tool;
    if (t === 'reset') stage.resetView();
    else if (t === 'in') stage.zoomBy(0.8);
    else if (t === 'out') stage.zoomBy(1.25);
    else if (t === 'labels') applyLabels(document.body.classList.contains('nolabels'));
    else if (t === 'ghost') ctx.toggleGhost();
    else if (t === 'mug') ctx.toggleMug();
    else if (t === 'full') ctx.toggleImmersive();
  });

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!gl.hidden) closeGloss();
    if (!modal.hidden) closeModal();
    if (!menu.hidden) closeMenu();
    hideTip(); hidePop();
  });

  return {
    openGloss, closeGloss, showTip, hideTip, showPop, hidePop, openCredits, applyLabels,
    isOpen: () => !gl.hidden || !modal.hidden || !menu.hidden,
    closeAll: () => { if (!gl.hidden) closeGloss(); if (!modal.hidden) closeModal(); if (!menu.hidden) closeMenu(); hidePop(); hideTip(); },
    popOpen: () => pop.classList.contains('on'), popPinned: () => popPinned,
  };
}
