// Bean Hunt motion piece — 15s, 1080x1920 design space. Every frame is a pure function of render(t).
// Used two ways: rendered to mp4 by render.mjs (social reel), and run live on beanhunt.app as the hero intro.
// Beats are keyed to the voiceover's word timings (ElevenLabs alignment), so a re-recorded VO re-times the cut.
(function (root) {
'use strict';
const W = 1080, H = 1920, DUR = 15, FPS = 60, LEAD = 0.12;
const C = { esp: '#1A110C', esp2: '#2B1A12', roast: '#3E2517', bean: '#6E4126', beanL: '#9A6238', beanD: '#3A2012',
  crease: '#241108', caramel: '#C98A4B', gold: '#E8B27E', crema: '#F6D2A8', cream: '#FBEFE0', latte: '#EAD7BF',
  paper: '#F7EBD8', ink: '#24150F', ink2: '#6B5445', green: '#5FBF7A', blue: '#4C8DFF', rose: '#D9776A',
  sage: '#7FA88B', plum: '#9A6FB0', shoe: '#1A0F0A', limb: '#B07A4A', limbO: '#2A160C' };
const SERIF = '"Fraunces", Georgia, serif', SANS = '"DM Sans", system-ui, sans-serif';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = p => 1 - Math.pow(1 - p, 3), ei = p => p * p * p;
const eio = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const back = p => { const c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const spring = (p, f = 3.2, d = 6) => p <= 0 ? 0 : 1 - Math.exp(-d * p) * Math.cos(f * Math.PI * p);
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const imp = (t, t0, k = 9, f = 26) => t < t0 ? 0 : Math.exp(-(t - t0) * k) * Math.sin((t - t0) * f);
const bump = (t, t0, d) => t < t0 || t > t0 + d ? 0 : Math.sin(Math.PI * (t - t0) / d);

function create(canvas, opt = {}) {
  const X = canvas.getContext('2d');
  // easing overshoot can briefly produce negative radii; clamp instead of throwing mid-loop
  const arc0 = X.arc.bind(X), ell0 = X.ellipse.bind(X);
  X.arc = (x, y, r, a0, a1, ccw) => arc0(x, y, Math.max(0, r), a0, a1, ccw);
  X.ellipse = (x, y, rx, ry, ro, a0, a1, ccw) => ell0(x, y, Math.max(0, rx), Math.max(0, ry), ro, a0, a1, ccw);
  let k = canvas.width / W;
  const imgs = {};
  const loads = Object.entries(opt.images || {}).map(([n, src]) => new Promise(res => {
    const i = new Image(); i.onload = i.onerror = () => res(); i.src = src; imgs[n] = i; }));
  const fonts = (typeof document !== 'undefined' && document.fonts) ? Promise.all([
    ...[400, 600, 700, 900].map(w => document.fonts.load(`${w} 40px "Fraunces"`)),
    ...[500, 700, 800, 900].map(w => document.fonts.load(`${w} 40px "DM Sans"`))]).catch(() => {}) : Promise.resolve();
  const ready = Promise.all([...loads, fonts]);
  const img = n => imgs[n] && imgs[n].complete && imgs[n].naturalWidth ? imgs[n] : null;
  const base = () => X.setTransform(k, 0, 0, k, 0, 0);

  // ---------- voice alignment: words, captions, lip sync ----------
  const CH = [], WORDS = [], A = opt.align;
  if (A) {
    let w = null;
    A.characters.forEach((c, i) => {
      const s = LEAD + A.character_start_times_seconds[i], e = LEAD + A.character_end_times_seconds[i];
      CH.push({ c: c.toLowerCase(), s, e });
      if (c === ' ') { if (w) { WORDS.push(w); w = null; } return; }
      if (!w) w = { txt: '', s, e }; w.txt += c; w.e = e;
    });
    if (w) WORDS.push(w);
    let g = 0; WORDS.forEach(w => { w.g = g; if (/[.!?]$/.test(w.txt)) g++; });
  }
  // Word index map for the script in vo.py (39 words). Fallback timings keep the engine usable without a VO.
  const FALLBACK = [0, .3, .61, .86, 1.7, 1.92, 2.55, 2.71, 2.8, 3.06, 3.18, 3.32, 3.55, 3.98, 4.15, 4.65, 5.39, 6.06, 6.34, 7.02,
    7.29, 7.48, 8.03, 8.43, 8.77, 8.97, 9.05, 9.11, 9.4, 10.14, 10.39, 11.12, 11.35, 11.49, 12.11, 12.34, 12.96, 13.4, 13.7];
  const ws = i => WORDS[i] ? WORDS[i].s : LEAD + FALLBACK[i];
  const we = i => WORDS[i] ? WORDS[i].e : LEAD + FALLBACK[i] + .3;
  const B = { intro: ws(4) - .2, map: ws(6) - .1, hunt: ws(15) - .16, stamp: ws(22) - .16, badge: ws(29) - .16,
    pass: ws(31) - .14, cta: ws(34) - .14, end: 14.45 };

  const OPEN = { a: 1, o: .95, e: .72, i: .6, u: .55, y: .5, m: .04, b: .04, p: .04, f: .22, v: .22, w: .3 };
  function openAt(t) { for (const q of CH) if (t >= q.s && t < q.e) return /[a-zé]/.test(q.c) ? (OPEN[q.c] ?? .38) : 0; return 0; }
  const mouthAt = t => (openAt(t - .04) + openAt(t) * 2 + openAt(t + .04)) / 4;

  // ---------- drawing helpers ----------
  function rr(x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, r); }
  function ell(cx, cy, rx, ry, col) { X.beginPath(); X.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, 7); X.fillStyle = col; X.fill(); }
  function txt(s, x, y, o = {}) {
    X.save(); X.font = `${o.it ? 'italic ' : ''}${o.w || 800} ${o.size || 60}px ${o.serif ? SERIF : SANS}`;
    X.textAlign = o.align || 'center'; X.textBaseline = 'middle'; X.letterSpacing = (o.ls || 0) + 'px'; X.globalAlpha *= o.alpha ?? 1;
    if (o.maxW) { const m = X.measureText(s).width; if (m > o.maxW) { X.translate(x, y); X.scale(o.maxW / m, o.maxW / m); x = 0; y = 0; } }
    if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = o.sw || 12; X.strokeStyle = o.stroke; X.strokeText(s, x, y); }
    X.fillStyle = o.color || C.cream; X.fillText(s, x, y); X.restore();
  }
  function measure(s, o) { X.save(); X.font = `${o.it ? 'italic ' : ''}${o.w || 800} ${o.size || 60}px ${o.serif ? SERIF : SANS}`; X.letterSpacing = (o.ls || 0) + 'px'; const m = X.measureText(s).width; X.restore(); return m; }
  function vgrad(y0, y1, stops) { const g = X.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function fillAll(style) { X.fillStyle = style; X.fillRect(-80, -80, W + 160, H + 160); }
  function glow(x, y, r, col, a = 1) {
    const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    X.save(); X.globalAlpha *= a; X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r); X.restore();
  }
  function sparkle(x, y, s, col, a = 1) {
    if (s <= 0) return;
    X.save(); X.globalAlpha *= a; X.fillStyle = col; X.translate(x, y); X.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .26 : s, an = i * Math.PI / 4 - Math.PI / 2; X.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    X.closePath(); X.fill(); X.restore();
  }
  function rays(cx, cy, n, t, col, speed = .2) {
    X.save(); X.translate(cx, cy); X.rotate(t * speed); X.fillStyle = col;
    for (let i = 0; i < n; i++) { X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, 2600, i * 2 * Math.PI / n, (i + .5) * 2 * Math.PI / n); X.fill(); }
    X.restore();
  }
  function miniBean(x, y, s, r, col = C.bean) {
    X.save(); X.translate(x, y); X.rotate(r); ell(0, 0, s, s * 1.3, col);
    X.strokeStyle = C.crease; X.lineWidth = s * .22; X.lineCap = 'round';
    X.beginPath(); X.moveTo(0, -s * 1.1); X.bezierCurveTo(-s * .45, -s * .3, s * .45, s * .3, 0, s * 1.1); X.stroke(); X.restore();
  }
  function stroked(fn, col, lw) { X.strokeStyle = col; X.lineWidth = lw; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); fn(); X.stroke(); }

  // Line icons, drawn in a 100x100 box centred on (0,0).
  function icon(name, x, y, s, col, lw = 8) {
    X.save(); X.translate(x, y); X.scale(s / 100, s / 100); X.strokeStyle = X.fillStyle = col; X.lineWidth = lw; X.lineCap = X.lineJoin = 'round';
    X.beginPath();
    if (name === 'laptop') { X.roundRect(-34, -30, 68, 44, 6); X.moveTo(-46, 24); X.lineTo(46, 24); }
    else if (name === 'gem') { X.moveTo(-40, -14); X.lineTo(-22, -34); X.lineTo(22, -34); X.lineTo(40, -14); X.lineTo(0, 38); X.closePath(); X.moveTo(-40, -14); X.lineTo(40, -14); X.moveTo(-10, -34); X.lineTo(-16, -14); X.lineTo(0, 38); X.moveTo(10, -34); X.lineTo(16, -14); X.lineTo(0, 38); }
    else if (name === 'clock') { X.arc(0, 0, 38, 0, 7); X.moveTo(0, 0); X.lineTo(0, -22); X.moveTo(0, 0); X.lineTo(16, 10); }
    else if (name === 'compass') { X.arc(0, 0, 38, 0, 7); X.moveTo(0, -24); X.lineTo(10, 0); X.lineTo(0, 24); X.lineTo(-10, 0); X.closePath(); }
    else if (name === 'cup') { X.moveTo(-30, -18); X.lineTo(26, -18); X.lineTo(20, 26); X.quadraticCurveTo(-2, 36, -24, 26); X.closePath(); X.moveTo(26, -8); X.quadraticCurveTo(46, -6, 40, 10); X.quadraticCurveTo(36, 18, 22, 16); X.moveTo(-10, -30); X.quadraticCurveTo(-16, -38, -10, -46); X.moveTo(6, -30); X.quadraticCurveTo(0, -38, 6, -46); }
    else if (name === 'dripper') { X.moveTo(-36, -30); X.lineTo(36, -30); X.lineTo(12, 6); X.lineTo(-12, 6); X.closePath(); X.moveTo(-26, 14); X.lineTo(26, 14); X.moveTo(0, 22); X.lineTo(0, 36); }
    else if (name === 'moon') { X.arc(0, 0, 36, Math.PI * .35, Math.PI * 1.65); X.quadraticCurveTo(-6, 0, 36 * Math.cos(Math.PI * .35), 36 * Math.sin(Math.PI * .35)); }
    else if (name === 'pin') { X.arc(0, -12, 22, Math.PI * .8, Math.PI * 2.2); X.lineTo(0, 36); X.closePath(); X.moveTo(8, -12); X.arc(0, -12, 8, 0, 7); }
    X.stroke(); X.restore();
  }

  // ---------- Bean: the host character (feet at origin, 400 units tall) ----------
  let LENS = null; // world position of Bean's magnifier lens, captured while drawing
  function bean(o) {
    const s = o.size / 400, m = o.mouth || 0, mood = o.mood || 'happy', t = o.t || 0;
    X.save(); X.globalAlpha *= o.alpha ?? 1;
    X.translate(o.x, o.y); X.rotate(o.rot || 0); X.scale(s, s);
    ell(0, 2, 118, 15, 'rgba(0,0,0,.3)');
    X.scale(o.sx || 1, o.sy || 1);
    // legs + shoes
    const kick = o.kick || 0;
    for (const [lw2, col] of [[24, C.limbO], [15, C.limb]]) {
      stroked(() => { X.moveTo(-44, -70); X.lineTo(-54, -14); }, col, lw2);
      stroked(() => { X.moveTo(44, -70); X.lineTo(54 + kick * 30, -14 - kick * 40); }, col, lw2);
    }
    ell(-66, -10, 42, 19, C.shoe); ell(66 + kick * 34, -10 - kick * 42, 42, 19, C.shoe);
    ell(-76, -16, 16, 5, 'rgba(255,255,255,.18)'); ell(56 + kick * 34, -16 - kick * 42, 16, 5, 'rgba(255,255,255,.18)');
    // body group (tilted like a bean)
    X.save(); X.translate(0, -250 + (o.headDy || 0)); X.rotate(-.08 + (o.lean || 0));
    const g = X.createRadialGradient(-70, -90, 10, -10, -10, 230);
    g.addColorStop(0, C.beanL); g.addColorStop(.5, C.bean); g.addColorStop(1, C.beanD);
    X.fillStyle = g; X.beginPath(); X.ellipse(0, 0, 152, 188, 0, 0, 7); X.fill();
    X.strokeStyle = 'rgba(246,210,168,.28)'; X.lineWidth = 6; X.beginPath(); X.ellipse(0, 0, 146, 182, 0, -2.75, -1.35); X.stroke();
    // the seam that makes it a coffee bean
    stroked(() => { X.moveTo(70, -176); X.bezierCurveTo(34, -96, 112, -12, 78, 86); X.bezierCurveTo(64, 128, 78, 158, 64, 180); }, C.crease, 15);
    stroked(() => { X.moveTo(58, -170); X.bezierCurveTo(22, -94, 100, -14, 66, 84); }, 'rgba(246,210,168,.16)', 5);
    // cheeks
    ell(-112, 28, 26, 15, 'rgba(255,128,104,.32)'); ell(36, 28, 22, 14, 'rgba(255,128,104,.32)');
    // eyes
    const eye = o.eye ?? 1, lx = o.lookX || 0, ly = o.lookY || 0;
    const EY = [[-78, -48], [4, -48]];
    const drawEye = (ex, ey, zoom = 1) => {
      X.save(); X.translate(ex, ey); X.scale(zoom, zoom * Math.max(.08, eye));
      ell(0, 0, 33, 39, '#FFF9F0');
      ell(lx * 10, 4 + ly * 10, 19, 21, C.shoe);
      ell(lx * 10 + 7, -5 + ly * 10, 7, 7, '#fff'); ell(lx * 10 - 6, 11 + ly * 10, 3, 3, 'rgba(255,255,255,.7)');
      if (mood === 'sad') { X.fillStyle = C.bean; X.beginPath(); X.moveTo(-40, -44); X.lineTo(40, -44); X.lineTo(40, -6); X.lineTo(-40, -20); X.closePath(); X.fill(); }
      X.restore();
    };
    for (const [ex, ey] of EY) drawEye(ex, ey);
    // brows
    const br = o.brow ?? (mood === 'excited' ? 1 : 0);
    for (const [i, [ex, ey]] of EY.entries()) {
      const tilt = mood === 'sad' ? (i ? -.35 : .35) : mood === 'focus' ? (i ? .2 : -.2) : 0;
      X.save(); X.translate(ex, ey - 58 - br * 14); X.rotate(tilt);
      stroked(() => { X.moveTo(-22, 4); X.quadraticCurveTo(0, -8 - br * 4, 22, 4); }, C.shoe, 9); X.restore();
    }
    // mouth
    const mx = -36, my = 44;
    if (m > .06) {
      const hw = 22 + m * 6, dep = 8 + m * 34;
      X.beginPath(); X.moveTo(mx - hw, my); X.quadraticCurveTo(mx, my + 6, mx + hw, my); X.quadraticCurveTo(mx, my + dep * 1.3, mx - hw, my); X.closePath();
      X.fillStyle = '#2A0F08'; X.fill(); X.save(); X.clip(); ell(mx, my + dep * .9, hw * .62, dep * .42, C.rose);
      X.fillStyle = '#fff'; rr(mx - 12, my - 2, 24, 8, 3); X.fill(); X.restore();
    } else if (mood === 'sad') stroked(() => { X.moveTo(mx - 22, my + 12); X.quadraticCurveTo(mx, my - 6, mx + 22, my + 12); }, C.shoe, 7);
    else if (mood === 'focus') stroked(() => { X.moveTo(mx - 16, my + 4); X.quadraticCurveTo(mx, my + 8, mx + 16, my + 2); }, C.shoe, 7);
    else {
      X.beginPath(); X.moveTo(mx - 28, my); X.quadraticCurveTo(mx, my + 30, mx + 28, my); X.closePath(); X.fillStyle = '#2A0F08'; X.fill();
      X.save(); X.clip(); ell(mx, my + 22, 16, 9, C.rose); X.restore();
    }
    // arms: left waves, right holds the magnifier
    const hand = (hx, hy) => { ell(hx, hy, 25, 25, '#FFF9F0'); ell(hx - 16, hy - 12, 11, 11, '#FFF9F0'); X.strokeStyle = 'rgba(0,0,0,.12)'; X.lineWidth = 3; X.beginPath(); X.arc(hx, hy, 25, .3, 2.2); X.stroke(); };
    const arm = (sx, sy, hx, hy, bend) => {
      const mx2 = (sx + hx) / 2, my2 = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
      for (const [lw2, col] of [[24, C.limbO], [15, C.limb]]) stroked(() => { X.moveTo(sx, sy); X.quadraticCurveTo(mx2 - dy / L * bend, my2 + dx / L * bend, hx, hy); }, col, lw2);
    };
    const wv = o.wave || 0, wig = Math.sin(t * 17) * 26 * wv;
    const lh = [lerp(-205, -222 + wig, wv), lerp(96, -150, wv)];
    arm(-128, 22, lh[0], lh[1], lerp(-30, 30, wv)); hand(lh[0], lh[1]);
    const mg = o.mag || 0;
    const rh = [lerp(206, 70, mg), lerp(92, 58, mg)];
    const lens = [lerp(rh[0] + 18, EY[1][0], mg), lerp(rh[1] - 104, EY[1][1], mg)];
    arm(126, 22, rh[0], rh[1], 34);
    if (!o.noMag) {
      const dx = rh[0] - lens[0], dy = rh[1] - lens[1], L = Math.hypot(dx, dy) || 1;
      stroked(() => { X.moveTo(lens[0] + dx / L * 58, lens[1] + dy / L * 58); X.lineTo(rh[0] + dx / L * 14, rh[1] + dy / L * 14); }, '#C98A4B', 15);
      X.save(); X.beginPath(); X.arc(lens[0], lens[1], 54, 0, 7); X.clip();
      X.fillStyle = 'rgba(210,235,255,.16)'; X.fillRect(lens[0] - 60, lens[1] - 60, 120, 120);
      if (mg > .6) drawEye(EY[1][0], EY[1][1], 1 + .45 * seg(mg, .6, 1));
      X.restore();
      X.strokeStyle = C.gold; X.lineWidth = 11; X.beginPath(); X.arc(lens[0], lens[1], 55, 0, 7); X.stroke();
      stroked(() => X.arc(lens[0], lens[1], 38, 3.6, 4.4), 'rgba(255,255,255,.75)', 7);
      const mt = X.getTransform(); X.save(); X.translate(lens[0], lens[1]); const lt = X.getTransform(); X.restore();
      LENS = { x: lt.e / k, y: lt.f / k, r: 55 * Math.hypot(mt.a, mt.b) / k };
    }
    hand(rh[0], rh[1]);
    X.restore(); // body group
    X.restore();
  }

  // ---------- scene 0: the hook — sad coffee ----------
  function sadCup(cx, cy, sc, t, fling) {
    X.save(); X.translate(cx + fling * 1400, cy - fling * 300); X.rotate(fling * 2.2); X.scale(sc, sc * (1 - .04 * Math.sin(t * 2)));
    ell(0, 6, 150, 18, 'rgba(0,0,0,.35)');
    X.fillStyle = vgrad(-400, 0, ['#AEB4BC', '#7C838C']); X.beginPath(); X.moveTo(-150, -390); X.lineTo(150, -390); X.lineTo(112, 0); X.lineTo(-112, 0); X.closePath(); X.fill();
    X.fillStyle = '#5B626B'; X.beginPath(); X.moveTo(-134, -240); X.lineTo(134, -240); X.lineTo(122, -110); X.lineTo(-122, -110); X.closePath(); X.fill();
    X.fillStyle = '#C9CED4'; rr(-168, -432, 336, 52, 22); X.fill(); X.fillStyle = '#B7BCC3'; rr(-138, -458, 276, 34, 16); X.fill();
    // droopy face
    for (const ex of [-52, 52]) { stroked(() => { X.moveTo(ex - 24, -312); X.quadraticCurveTo(ex, -296, ex + 24, -312); }, '#3A3F46', 8); }
    stroked(() => { X.moveTo(-34, -262); X.quadraticCurveTo(0, -282, 34, -262); }, '#3A3F46', 8);
    const tq = ((t * .9) % 1);
    X.save(); X.globalAlpha = Math.sin(tq * Math.PI); X.fillStyle = '#9CC3E8'; X.beginPath();
    const ty = -292 + tq * 130; X.moveTo(64, ty - 16); X.quadraticCurveTo(76, ty, 64, ty + 8); X.quadraticCurveTo(52, ty, 64, ty - 16); X.fill(); X.restore();
    // steam that gives up
    X.save(); X.globalAlpha = .45; stroked(() => { X.moveTo(0, -470); X.bezierCurveTo(30, -540, -30, -580, 10, -620); X.quadraticCurveTo(40, -640, 60, -610); }, '#C7CCD2', 10); X.restore();
    X.restore();
  }
  function hook(t) {
    fillAll(vgrad(0, H, ['#262B32', '#101215']));
    glow(540, 1350, 800, 'rgba(120,140,165,.18)');
    X.save(); X.strokeStyle = 'rgba(170,190,215,.16)'; X.lineWidth = 3;
    for (let i = 0; i < 70; i++) {
      const x = rnd(i) * 1300 - 100, y = ((rnd(i + 50) * H + t * (1500 + rnd(i + 9) * 600)) % (H + 200)) - 100;
      X.beginPath(); X.moveTo(x, y); X.lineTo(x - 14, y + 70); X.stroke();
    }
    X.restore();
    const fling = ei(seg(t, B.intro - .28, B.intro + .1));
    sadCup(540, 1640, 1.05, t, fling);
    const lines = [
      { w: 'STOP', y: 330, size: 250, col: C.gold },
      { w: 'DRINKING', y: 555, size: 162, col: C.cream },
      { w: 'SAD', y: 755, size: 215, col: '#8C939C', sad: true },
      { w: 'COFFEE.', y: 1000, size: 215, col: C.cream }];
    lines.forEach((l, i) => {
      const st = ws(i) - .03, q = seg(t, st, st + .14); if (q <= 0) return;
      const sc = lerp(1.9, 1, eo(q)), out = eo(seg(t, B.intro - .2, B.intro + .1));
      X.save(); X.translate(88 - out * 1200 * (i % 2 ? -1 : 1), l.y); X.scale(sc, sc); X.globalAlpha = q;
      if (l.sad) {
        let x = 0; const o = { size: l.size, w: 900, serif: true };
        for (let j = 0; j < 3; j++) {
          const ch = 'SAD'[j], cw = measure(ch, o), droop = eo(seg(t, st + .15 + j * .08, st + .6 + j * .08));
          X.save(); X.translate(x + cw / 2, droop * (18 + j * 20)); X.rotate(droop * (.08 + j * .07));
          txt(ch, 0, 0, { ...o, color: l.col }); X.restore(); x += cw;
        }
      } else txt(l.w, 0, 0, { size: l.size, w: 900, serif: true, align: 'left', color: l.col, maxW: 910 });
      X.restore();
    });
  }

  // ---------- scene 1: Bean arrives ----------
  const BURST = Array.from({ length: 40 }, (_, i) => ({ a: -Math.PI / 2 + (rnd(i) - .5) * 2.6, v: 900 + rnd(i + 50) * 1600, s: 14 + rnd(i + 99) * 16, r: rnd(i + 7) * 6, spark: i % 4 === 0 }));
  function burst(t, t0, ox, oy) {
    const d = t - t0; if (d < 0 || d > 1.4) return;
    BURST.forEach(b => {
      const x = ox + Math.cos(b.a) * b.v * d * (1 - d * .3), y = oy + Math.sin(b.a) * b.v * d * (1 - d * .3) + 1500 * d * d;
      X.save(); X.globalAlpha = 1 - seg(d, .8, 1.4);
      if (b.spark) sparkle(x, y, b.s * 1.4, C.crema); else miniBean(x, y, b.s, b.r + d * 9, b.s > 22 ? C.beanL : C.bean);
      X.restore();
    });
  }
  function warmBg(t, cx = 540, cy = 1000) {
    fillAll(vgrad(0, H, [C.esp2, C.esp, '#0E0805']));
    rays(cx, cy, 16, t, 'rgba(232,178,126,.06)', .12);
    glow(cx, cy, 820, 'rgba(232,178,126,.28)');
  }
  function intro(t) {
    warmBg(t, 540, 1050);
    burst(t, B.intro + .02, 540, 1900);
    const q = back(seg(t, ws(5) - .05, ws(5) + .25));
    if (q > 0) {
      X.save(); X.translate(540, 360); X.rotate(-.05 * (1 - q)); X.scale(q, q);
      txt('Bean', 0, 0, { size: 230, w: 900, serif: true, it: true, color: C.crema });
      X.restore();
      txt('CAFÉ DETECTIVE', 540, 520, { size: 42, w: 800, ls: 14, color: C.gold, alpha: eo(seg(t, ws(5) + .15, ws(5) + .4)) });
    }
  }

  // ---------- scene 2: the map ----------
  const PINS = [[250, 540, 1], [720, 470, 0], [900, 820, 0], [390, 900, 1], [640, 1060, 0], [200, 1200, 1], [880, 1180, 0], [520, 660, 0], [760, 1330, 0], [150, 800, 0]];
  const TARGET = PINS[2];
  function mapBase(t) {
    fillAll('#131922');
    X.save(); X.lineCap = 'round';
    X.strokeStyle = '#0F2236'; X.lineWidth = 150; X.beginPath(); X.moveTo(-100, 1560); X.bezierCurveTo(300, 1380, 700, 1560, 1200, 1300); X.stroke();
    const xs = [-60, 180, 420, 660, 900, 1140], ys = [100, 380, 640, 900, 1160, 1420, 1700, 1980];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const park = rnd(i * 13 + j * 7) > .82;
      X.fillStyle = park ? '#1B3326' : '#1C2430'; rr(xs[i] + 20, ys[j] + 20, xs[i + 1] - xs[i] - 40, ys[j + 1] - ys[j] - 40, 18); X.fill();
      if (!park && rnd(i * 5 + j * 11) > .5) { X.fillStyle = '#212B38'; rr(xs[i] + 40, ys[j] + 40, (xs[i + 1] - xs[i]) * .4, (ys[j + 1] - ys[j]) * .35, 10); X.fill(); }
    }
    X.strokeStyle = '#26303E'; X.lineWidth = 46; X.beginPath(); X.moveTo(-50, 250); X.lineTo(1130, 1520); X.stroke();
    X.strokeStyle = 'rgba(255,255,255,.05)'; X.lineWidth = 3; X.setLineDash([22, 22]); X.beginPath(); X.moveTo(-50, 250); X.lineTo(1130, 1520); X.stroke(); X.setLineDash([]);
    X.restore();
  }
  function pin(x, y, stamped, sc, hot) {
    X.save(); X.translate(x, y); X.scale(sc, sc);
    ell(0, 4, 20, 7, 'rgba(0,0,0,.4)');
    X.fillStyle = stamped ? C.cream : C.gold; X.beginPath(); X.arc(0, -64, 36, Math.PI * .78, Math.PI * 2.22); X.lineTo(0, 0); X.closePath(); X.fill();
    if (hot) { X.strokeStyle = '#fff'; X.lineWidth = 6; X.stroke(); }
    ell(0, -64, 24, 24, stamped ? C.gold : C.esp);
    if (stamped) stroked(() => { X.moveTo(-10, -64); X.lineTo(-3, -56); X.lineTo(11, -72); }, C.esp, 6);
    else icon('cup', 0, -62, 30, C.gold, 10);
    X.restore();
  }
  function lensPos(t) {
    const a = B.map + .35, b = ws(11), c = ws(12) + .05;
    if (t < b) { const q = eio(seg(t, a, b)); return [lerp(330, 560, q), lerp(1150, 700, q) - Math.sin(q * Math.PI) * 60]; }
    const q = eio(seg(t, b, c)); return [lerp(560, TARGET[0], q), lerp(700, TARGET[1] - 60, q)];
  }
  function mapScene(t) {
    const z = 1 + .06 * seg(t, B.map, B.hunt);
    X.save(); X.translate(540, 960); X.scale(z, z); X.translate(-540, -960);
    mapBase(t);
    const you = seg(t, ws(13) - .1, ws(13) + .2);
    if (you > 0) {
      for (let i = 0; i < 2; i++) { const q = ((t * .8 + i / 2) % 1); X.strokeStyle = `rgba(76,141,255,${.5 * (1 - q) * you})`; X.lineWidth = 5; X.beginPath(); X.arc(540, 960, 30 + q * 140, 0, 7); X.stroke(); }
      glow(540, 960, 120, 'rgba(76,141,255,.35)', you); ell(540, 960, 22 * back(you), 22 * back(you), '#fff'); ell(540, 960, 15 * back(you), 15 * back(you), C.blue);
    }
    const drops = PINS.map((p, i) => ws(10) - .15 + i * .06);
    PINS.forEach((p, i) => { const q = seg(t, drops[i], drops[i] + .3); if (q > 0) pin(p[0], p[1] - (1 - back(q)) * 240, p[2], .9 + (p === TARGET ? .25 * seg(t, ws(12), ws(12) + .2) : 0), p === TARGET && t > ws(12)); });
    X.restore();
    // search pill
    const sp = eo(seg(t, B.map + .1, B.map + .4));
    X.save(); X.globalAlpha = sp; X.translate(0, (1 - sp) * -80);
    X.fillStyle = 'rgba(26,17,12,.92)'; rr(90, 150, 900, 110, 55); X.fill(); X.strokeStyle = 'rgba(232,178,126,.35)'; X.lineWidth = 3; rr(90, 150, 900, 110, 55); X.stroke();
    icon('pin', 162, 205, 60, C.gold, 9);
    txt('Coffee near you', 215, 205, { size: 44, w: 700, align: 'left', color: C.cream });
    txt('3 of 10 stamped', 950, 205, { size: 30, w: 700, align: 'right', color: C.gold });
    X.restore();
    // the lens: a magnified slice of the map
    const lp = seg(t, B.map + .25, B.map + .5); if (lp <= 0) return;
    const [lx, ly] = lensPos(t), R = 205 * back(lp), Z = 1.9;
    X.save(); X.beginPath(); X.arc(lx, ly, R, 0, 7); X.clip();
    X.translate(lx, ly); X.scale(Z, Z); X.translate(-lx, -ly);
    X.translate(540, 960); X.scale(z, z); X.translate(-540, -960);
    mapBase(t); PINS.forEach((p, i) => { if (t > drops[i]) pin(p[0], p[1], p[2], .9, p === TARGET && t > ws(12)); });
    X.restore();
    glow(lx - R * .3, ly - R * .35, R * .8, 'rgba(255,255,255,.12)');
    X.strokeStyle = C.gold; X.lineWidth = 16; X.beginPath(); X.arc(lx, ly, R, 0, 7); X.stroke();
    X.strokeStyle = 'rgba(255,255,255,.5)'; X.lineWidth = 8; X.beginPath(); X.arc(lx, ly, R - 30, 3.5, 4.3); X.stroke();
    // café card when the lens lands
    const cq = back(seg(t, ws(12) + .02, ws(12) + .3));
    if (cq > 0) {
      X.save(); X.translate(540, TARGET[1] - 380); X.scale(cq, cq);
      X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 40; X.shadowOffsetY = 16;
      X.fillStyle = C.cream; rr(-400, -95, 800, 190, 36); X.fill(); X.shadowColor = 'transparent';
      txt('Hearth & Hayes Coffee', -350, -30, { size: 52, w: 700, serif: true, align: 'left', color: C.ink });
      txt('★ 4.8', -350, 42, { size: 36, w: 800, align: 'left', color: '#E0A33A' });
      ell(-190, 42, 9, 9, C.green); txt('Open now · 0.3 mi', -168, 42, { size: 34, w: 700, align: 'left', color: C.ink2 });
      X.restore();
    }
  }
  function beam(t) {
    if (!LENS || t < B.map + .25 || t > B.hunt) return;
    const [lx, ly] = lensPos(t), R = 205 * back(seg(t, B.map + .25, B.map + .5));
    const d = Math.hypot(lx - LENS.x, ly - LENS.y); if (d < R + 10) return;
    const ang = Math.atan2(LENS.y - ly, LENS.x - lx), bt = Math.acos(R / d), pa = ang + Math.PI / 2;
    X.save(); X.globalAlpha = .9 * seg(t, B.map + .3, B.map + .5);
    const g = X.createLinearGradient(LENS.x, LENS.y, lx, ly); g.addColorStop(0, 'rgba(232,178,126,.38)'); g.addColorStop(1, 'rgba(232,178,126,.05)');
    X.fillStyle = g; X.beginPath();
    X.moveTo(LENS.x + Math.cos(pa) * LENS.r * .7, LENS.y + Math.sin(pa) * LENS.r * .7);
    X.lineTo(lx + R * Math.cos(ang + bt), ly + R * Math.sin(ang + bt));
    X.arc(lx, ly, R, ang + bt, ang - bt + 2 * Math.PI);
    X.lineTo(LENS.x - Math.cos(pa) * LENS.r * .7, LENS.y - Math.sin(pa) * LENS.r * .7);
    X.closePath(); X.fill(); X.restore();
    // sniff lines
    const sn = bump(t, ws(8) - .05, .5);
    if (sn > 0) for (let i = 0; i < 3; i++) { X.save(); X.globalAlpha = sn; stroked(() => X.arc(LENS.x - 150, LENS.y + 40, 30 + i * 22, -.7, .7), C.crema, 6); X.restore(); }
  }

  // ---------- scene 3: hunts ----------
  const HUNTS = [
    { w: 15, title: 'Laptop-friendly', sub: 'Wi-Fi, outlets, room to stay', icon: 'laptop', col: C.sage, n: '2 of 5' },
    { w: 17, title: 'Hidden gems', sub: 'Loved, not yet famous', icon: 'gem', col: C.plum, n: '0 of 4' },
    { w: 19, title: 'Open right now', sub: 'Go get one', icon: 'clock', col: C.rose, n: '3 of 6', open: true }];
  function hunts(t) {
    fillAll(vgrad(0, H, ['#F7EAD7', '#EBD5B7']));
    X.save(); X.fillStyle = 'rgba(155,98,50,.09)';
    for (let i = 0; i < 12; i++) for (let j = 0; j < 22; j++) { X.beginPath(); X.arc(((i * 100 + t * 30) % 1200) - 60, j * 95 + (i % 2) * 47, 6, 0, 7); X.fill(); }
    X.restore();
    const hq = eo(seg(t, B.hunt + .05, B.hunt + .35));
    txt('HUNTS NEAR YOU', 110, 300, { size: 40, w: 800, ls: 10, align: 'left', color: '#9A6232', alpha: hq });
    txt('Pick one. Go.', 106, 390, { size: 92, w: 900, serif: true, it: true, align: 'left', color: C.ink, alpha: hq });
    HUNTS.forEach((h, i) => {
      const st = ws(h.w) - .08, q = seg(t, st, st + .32); if (q <= 0) return;
      const side = i % 2 ? 1 : -1, y = 600 + i * 285, p = back(q);
      X.save(); X.translate(540 + side * (1 - p) * 1200, y); X.rotate(side * (1 - eo(q)) * .25 + Math.sin(t * 1.4 + i) * .006);
      X.scale(lerp(1, 1.04, bump(t, st + .12, .3)), 1);
      X.shadowColor = 'rgba(62,39,35,.22)'; X.shadowBlur = 40; X.shadowOffsetY = 18; X.fillStyle = '#FFFCF6'; rr(-440, -125, 880, 250, 40); X.fill(); X.shadowColor = 'transparent';
      X.fillStyle = h.col; rr(-410, -95, 190, 190, 34); X.fill(); icon(h.icon, -315, 0, 120, '#fff', 9);
      if (h.icon === 'clock') { // hands spinning to "now"
        const sp = t * 9; X.save(); X.translate(-315, 0); stroked(() => { X.moveTo(0, 0); X.lineTo(Math.cos(sp) * 30, Math.sin(sp) * 30); }, '#fff', 8); X.restore(); }
      txt(h.title, -185, -38, { size: 60, w: 700, serif: true, align: 'left', color: C.ink, maxW: 560 });
      txt(h.sub, -185, 18, { size: 32, w: 600, align: 'left', color: C.ink2 });
      const fill = eo(seg(t, st + .2, st + .7)) * (h.open ? .5 : h.n[0] === '0' ? .04 : .4);
      X.fillStyle = '#EFE1CC'; rr(-185, 62, 400, 16, 8); X.fill(); X.fillStyle = h.col; rr(-185, 62, Math.max(16, 400 * fill), 16, 8); X.fill();
      txt(h.n + ' stamped', 240, 70, { size: 26, w: 700, align: 'left', color: C.ink2 });
      if (h.open) { const pu = .5 + .5 * Math.sin(t * 8); ell(356, -60, 12 + pu * 4, 12 + pu * 4, 'rgba(95,191,122,.35)'); ell(356, -60, 10, 10, C.green); }
      if (q < 1) { X.globalAlpha = (1 - q) * .85; X.fillStyle = '#fff'; rr(-440, -125, 880, 250, 40); X.fill(); }
      X.restore();
    });
  }

  // ---------- scene 4: stamp it ----------
  const TAPS = () => [[ws(23), .677, .702], [ws(27), .26, .834], [ws(28) + .1, .5, .946]];
  function phoneAt(t) { const p = seg(t, B.stamp, B.stamp + .45); return { x: 700, y: lerp(2600, 840, back(p)), r: lerp(.25, -.04, eo(p)) }; }
  function stampMark(x, y, sc, rot, col, label, sub, shape = 'circle') {
    X.save(); X.translate(x, y); X.rotate(rot); X.scale(sc, sc); X.strokeStyle = X.fillStyle = col;
    X.lineWidth = 10; X.beginPath(); if (shape === 'circle') X.arc(0, 0, 100, 0, 7); else X.roundRect(-110, -80, 220, 160, 26); X.stroke();
    X.lineWidth = 4; X.beginPath(); if (shape === 'circle') X.arc(0, 0, 82, 0, 7); else X.roundRect(-94, -64, 188, 128, 18); X.stroke();
    txt(label, 0, -8, { size: shape === 'circle' ? 36 : 34, w: 900, serif: true, color: col, maxW: 150 });
    txt(sub, 0, 32, { size: 20, w: 800, ls: 4, color: col });
    X.restore();
  }
  function stampScene(t) {
    warmBg(t, 700, 800);
    const hq = eo(seg(t, B.stamp + .1, B.stamp + .35));
    txt('CHECK IN', 110, 240, { size: 40, w: 800, ls: 10, align: 'left', color: C.gold, alpha: hq });
    ['Café.', 'Drink.', 'Stars.'].forEach((w, i) => {
      const q = back(seg(t, TAPS()[i][0] - .05, TAPS()[i][0] + .2)); if (q <= 0) return;
      X.save(); X.translate(110, 340 + i * 110); X.scale(q, q); txt(w, 0, 0, { size: 96, w: 900, serif: true, it: true, align: 'left', color: C.cream }); X.restore();
    });
    const ph = phoneAt(t), pw = 520, phh = 1100;
    X.save(); X.translate(ph.x, ph.y); X.rotate(ph.r);
    X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 90; X.shadowOffsetY = 40;
    X.fillStyle = '#0D0907'; rr(-pw / 2, -phh / 2, pw, phh, 72); X.fill(); X.shadowColor = 'transparent';
    X.strokeStyle = '#3A2A20'; X.lineWidth = 4; rr(-pw / 2 + 2, -phh / 2 + 2, pw - 4, phh - 4, 70); X.stroke();
    const sw = pw - 36, sh = phh - 36; X.save(); rr(-sw / 2, -sh / 2, sw, sh, 56); X.clip();
    const im = img('checkin');
    if (im) X.drawImage(im, -sw / 2, -sh / 2, sw, sh); else { X.fillStyle = '#1E1511'; X.fillRect(-sw / 2, -sh / 2, sw, sh); }
    TAPS().forEach(([tt, fx, fy]) => {
      const d = t - tt; if (d < 0 || d > .5) return;
      const px = -sw / 2 + fx * sw, py = -sh / 2 + fy * sh;
      X.strokeStyle = `rgba(255,255,255,${1 - d / .5})`; X.lineWidth = 8; X.beginPath(); X.arc(px, py, 20 + eo(d / .5) * 110, 0, 7); X.stroke();
      ell(px, py, 30 * (1 - d / .5), 30 * (1 - d / .5), 'rgba(255,255,255,.85)');
    });
    X.restore();
    // the stamp slams onto the screen
    const sd = t - (we(28) - .02), sq = seg(sd, 0, .13);
    if (sq > 0) {
      if (sd < .5) for (let i = 0; i < 14; i++) { const a = i / 14 * 7, r = 180 + eo(clamp(sd / .3)) * 140; ell(Math.cos(a) * r, 40 + Math.sin(a) * r, 12 * (1 - sd / .5), 12 * (1 - sd / .5), C.gold); }
      X.save(); X.globalAlpha = sq; stampMark(0, 40, lerp(3.2, 1.9, eo(sq)), -.18, C.gold, 'STAMPED', 'BEAN HUNT · #7'); X.restore();
      if (sd < .12) { X.save(); X.globalAlpha = (1 - sd / .12) * .6; X.fillStyle = '#fff'; rr(-pw / 2, -phh / 2, pw, phh, 72); X.fill(); X.restore(); }
    }
    X.restore();
  }

  // ---------- scene 5: badges ----------
  const BADGES = [['EXPLORER', 'compass', 165, 620], ['REGULAR', 'cup', 405, 540], ['POUR-OVER\nPILGRIM', 'dripper', 675, 540], ['NIGHT OWL', 'moon', 915, 620]];
  function medal(x, y, r, ic, t, pop, shine) {
    X.save(); X.translate(x, y); X.scale(pop, pop);
    X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 30; X.shadowOffsetY = 12;
    const g = X.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#F9D9A9'); g.addColorStop(.5, C.caramel); g.addColorStop(1, '#8A5528');
    X.fillStyle = g; X.beginPath(); X.arc(0, 0, r, 0, 7); X.fill(); X.shadowColor = 'transparent';
    ell(0, 0, r * .8, r * .8, C.esp2); icon(ic, 0, 0, r * 1.05, C.crema, 9);
    if (shine > 0 && shine < 1) { X.save(); X.beginPath(); X.arc(0, 0, r, 0, 7); X.clip(); X.rotate(.6); X.fillStyle = 'rgba(255,255,255,.35)'; X.fillRect(lerp(-2 * r, 2 * r, shine) - 18, -2 * r, 36, 4 * r); X.restore(); }
    X.restore();
  }
  function badges(t) {
    fillAll(vgrad(0, H, ['#2E1B26', C.esp2, C.esp]));
    rays(540, 900, 20, t, 'rgba(232,178,126,.05)', -.15);
    glow(540, 700, 760, 'rgba(201,138,75,.3)');
    BADGES.forEach(([name, ic, x, y], i) => {
      const st = ws(30) - .1 + i * .09, q = seg(t, st, st + .35); if (q <= 0) return;
      const pop = spring(q, 2.6, 5);
      medal(x, y, 96, ic, t, pop, seg(t, st + .3, st + .75));
      name.split('\n').forEach((ln, j) => txt(ln, x, y + 142 + j * 34, { size: 28, w: 800, ls: 4, color: C.crema, alpha: eo(seg(t, st + .1, st + .3)) }));
      for (let j = 0; j < 6; j++) { const a = j / 6 * 7 + i, d = t - st; if (d > 0 && d < .6) sparkle(x + Math.cos(a) * (110 + d * 200), y + Math.sin(a) * (110 + d * 200), 18 * (1 - d / .6), C.crema); }
    });
    const eq = eo(seg(t, B.badge + .02, B.badge + .3));
    txt('EARN BADGES', 540, 260, { size: 44, w: 800, ls: 14, color: C.gold, alpha: eq });
  }

  // ---------- scene 6: the passport fills up ----------
  const STAMPS = [['FOG LINE', 'ESPRESSO', C.rose, 'circle'], ['HEARTH', '& HAYES', C.sage, 'rect'], ['KILN', 'COFFEE', C.blue, 'circle'], ['LUMEN', 'CAFÉ', C.plum, 'rect'],
    ['OAK & ASH', 'ROASTERS', C.caramel, 'circle'], ['BLUE DOOR', 'CAFÉ', C.blue, 'rect'], ['MORROW', 'COFFEE', C.rose, 'circle'], ['SIDEWALK', 'SOCIAL', C.sage, 'rect'],
    ['PAPER MOON', 'COFFEE', C.plum, 'circle'], ['NORTH', 'STAR', C.caramel, 'rect']];
  function passport(t) {
    fillAll(vgrad(0, H, ['#2A1810', C.esp]));
    glow(540, 900, 820, 'rgba(232,178,126,.22)');
    const bq = back(seg(t, B.pass, B.pass + .35));
    X.save(); X.translate(540, 900); X.scale(lerp(.6, 1, bq), lerp(.6, 1, bq)); X.rotate((1 - bq) * -.2 - .03);
    X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 80; X.shadowOffsetY = 40;
    X.fillStyle = '#4A2A1A'; rr(-500, -400, 1000, 800, 40); X.fill(); X.shadowColor = 'transparent';
    for (const side of [-1, 1]) {
      X.fillStyle = side < 0 ? '#F3E4CC' : '#F7EBD8'; rr(side < 0 ? -478 : 4, -378, 474, 756, 22); X.fill();
      X.save(); X.beginPath(); X.rect(side < 0 ? -478 : 4, -378, 474, 756); X.clip();
      X.strokeStyle = 'rgba(155,98,50,.1)'; X.lineWidth = 2;
      for (let i = 0; i < 18; i++) { X.beginPath(); for (let x = 0; x <= 474; x += 12) X.lineTo((side < 0 ? -478 : 4) + x, -360 + i * 44 + Math.sin(x / 40 + i) * 8); X.stroke(); }
      X.restore();
    }
    X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(-6, -378, 12, 756);
    txt('PASSPORT', -241, -320, { size: 34, w: 800, ls: 12, color: '#9A6232' });
    STAMPS.forEach(([a, b, col, shape], i) => {
      const st = ws(31) - .05 + i * .07, q = seg(t, st, st + .1); if (q <= 0) return;
      const left = i < 4, gi = left ? i : i - 4;
      const x = left ? -360 + (gi % 2) * 240 : 120 + (gi % 2) * 240, y = left ? -150 + Math.floor(gi / 2) * 250 : -250 + Math.floor(gi / 2) * 230;
      X.save(); X.globalAlpha = .88 * q; stampMark(x, y, lerp(1.8, .95, eo(q)), (rnd(i + 3) - .5) * .6, col, a, b, shape); X.restore();
    });
    X.restore();
    const n = Math.round(lerp(6, 24, eo(seg(t, ws(31), ws(33) + .2))));
    txt(`${n} cafés stamped`, 540, 1380, { size: 54, w: 800, color: C.crema, alpha: eo(seg(t, B.pass + .2, B.pass + .45)) });
  }

  // ---------- scene 7: call to action ----------
  function cta(t) {
    warmBg(t, 540, 760);
    const fq = seg(t, ws(35) - .04, ws(35) + .12), up = eio(seg(t, ws(36) - .15, ws(36) + .2));
    if (fq > 0) {
      X.save(); X.translate(540, lerp(640, 250, up)); const s = lerp(2.4, 1, eo(fq)) * lerp(1, .5, up); X.scale(s, s); X.globalAlpha = fq;
      const g = X.createLinearGradient(-300, -100, 300, 100), sh = ((t - ws(35)) * .9) % 1.6 - .3;
      g.addColorStop(0, C.caramel); g.addColorStop(clamp(sh - .1), C.gold); g.addColorStop(clamp(sh), '#FFF4E2'); g.addColorStop(clamp(sh + .1), C.gold); g.addColorStop(1, C.caramel);
      X.font = `900 280px ${SERIF}`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.letterSpacing = '6px';
      X.fillStyle = g; X.fillText('FREE', 0, 0); X.restore();
      txt('Optional one-time Premium. No subscription.', 540, lerp(840, 360, up), { size: 32, w: 600, color: C.latte, alpha: eo(seg(t, ws(35) + .2, ws(35) + .45)) * (1 - up) });
    }
    const iq = spring(seg(t, ws(36) - .05, ws(36) + .6), 2.4, 5);
    if (iq > 0) {
      X.save(); X.translate(540, lerp(-300, 560, iq)); X.rotate((1 - iq) * .5);
      X.shadowColor = 'rgba(0,0,0,.55)'; X.shadowBlur = 60; X.shadowOffsetY = 24; X.fillStyle = C.esp2; rr(-135, -135, 270, 270, 62); X.fill(); X.shadowColor = 'transparent';
      rr(-135, -135, 270, 270, 62); X.clip(); const ic = img('icon'); if (ic) X.drawImage(ic, -135, -135, 270, 270); X.restore();
      const tq = back(seg(t, ws(36) + .1, ws(36) + .38));
      X.save(); X.translate(540, 800); X.scale(tq, tq); txt('Bean Hunt', 0, 0, { size: 120, w: 900, serif: true, color: C.cream }); X.restore();
      const bq = eo(seg(t, ws(36) + .15, ws(36) + .4));
      X.save(); X.globalAlpha = bq; X.translate(0, (1 - bq) * 40);
      X.fillStyle = 'rgba(251,239,224,.1)'; rr(150, 910, 780, 100, 50); X.fill(); X.strokeStyle = 'rgba(232,178,126,.45)'; X.lineWidth = 3; rr(150, 910, 780, 100, 50); X.stroke();
      X.strokeStyle = C.gold; X.lineWidth = 7; X.beginPath(); X.arc(216, 955, 18, 0, 7); X.stroke(); X.beginPath(); X.moveTo(229, 969); X.lineTo(246, 986); X.stroke();
      const q = 'Bean Hunt', typed = q.slice(0, Math.round(q.length * seg(t, ws(37) - .05, we(38) - .1)));
      txt(typed, 276, 961, { size: 50, w: 700, align: 'left', color: C.cream });
      if (Math.floor(t * 3) % 2 === 0) { X.fillStyle = C.gold; X.fillRect(282 + measure(typed, { size: 50, w: 700 }), 933, 5, 56); }
      X.restore();
      const aq = back(seg(t, ws(37) + .05, ws(37) + .35));
      if (aq > 0) {
        X.save(); X.translate(540, 1115); X.scale(aq, aq);
        X.fillStyle = C.cream; rr(-270, -62, 540, 124, 62); X.fill();
        txt('Download on the', 40, -22, { size: 26, w: 600, color: C.ink });
        txt('App Store', 40, 18, { size: 50, w: 800, color: C.ink });
        stroked(() => { X.moveTo(-178, -30); X.lineTo(-178, 12); X.moveTo(-198, -6); X.lineTo(-178, 14); X.lineTo(-158, -6); X.moveTo(-204, 30); X.lineTo(-152, 30); }, C.ink, 7);
        X.restore();
      }
    }
  }

  const SCENES = () => [[0, hook], [B.intro, intro], [B.map, mapScene], [B.hunt, hunts], [B.stamp, stampScene], [B.badge, badges], [B.pass, passport], [B.cta, cta]];
  const TR = [null, { d: .42, k: 'circle', ox: 540, oy: 1500 }, { d: .38, k: 'circle', ox: 300, oy: 1150 }, { d: .36, k: 'diag' },
    { d: .34, k: 'up' }, { d: .36, k: 'circle', ox: 700, oy: 880 }, { d: .3, k: 'slide' }, { d: .4, k: 'circle', ox: 540, oy: 900 }];
  function wipe(tr, p) {
    X.beginPath();
    if (tr.k === 'circle') X.arc(tr.ox, tr.oy, p * 2400, 0, 7);
    else if (tr.k === 'diag') { const o = lerp(-1400, 1300, p); X.moveTo(-100 + o, -100); X.lineTo(W + 1500, -100); X.lineTo(W + 1500, H + 100); X.lineTo(-100 + o - 800, H + 100); }
    else if (tr.k === 'slide') X.rect(W * (1 - p), -100, W + 200, H + 200);
    else X.rect(-100, H * (1 - p), W + 200, H + 200);
  }
  function wipeEdge(tr, p) {
    if (p >= 1) return;
    X.save(); X.strokeStyle = C.gold; X.lineWidth = 36 * (1 - p);
    if (tr.k === 'circle') { X.beginPath(); X.arc(tr.ox, tr.oy, p * 2400, 0, 7); X.stroke(); }
    else if (tr.k === 'up') { X.beginPath(); X.moveTo(-100, H * (1 - p)); X.lineTo(W + 100, H * (1 - p)); X.stroke(); }
    X.restore();
  }

  // ---------- the host ----------
  function host(t) {
    if (t < B.intro) return null;
    const KF = [[B.intro, 540, 1420, 640], [B.map - .05, 540, 1420, 640], [B.map + .35, 215, 1380, 360], [B.hunt - .05, 215, 1380, 360],
      [B.hunt + .3, 900, 470, 250], [B.stamp - .05, 900, 470, 250], [B.stamp + .35, 175, 1390, 320], [B.badge - .05, 175, 1390, 320],
      [B.badge + .3, 540, 1390, 480], [B.pass - .05, 540, 1390, 480], [B.pass + .25, 540, 2600, 480], [B.cta + .6, 870, -600, 240], [B.cta + 1.1, 875, 690, 240]];
    let i = 0; while (i < KF.length - 1 && t >= KF[i + 1][0]) i++;
    const a = KF[i], b = KF[Math.min(i + 1, KF.length - 1)], q = i < KF.length - 1 ? eio(seg(t, a[0], b[0])) : 0;
    let x = lerp(a[1], b[1], q), y = lerp(a[2], b[2], q) - (a[1] !== b[1] ? 180 * Math.sin(Math.PI * q) : 0), s = lerp(a[3], b[3], q);
    const rise = spring(seg(t, B.intro, B.intro + .6), 2.6, 5.5);
    if (t < B.map) y = lerp(2600, 1420, rise);
    const mood = t < B.map ? 'excited' : t < B.hunt ? 'focus' : t < B.cta ? 'happy' : 'excited';
    const m = mouthAt(t);
    const landings = [B.intro + .3, B.map + .35, B.hunt + .3, B.stamp + .35, B.badge + .3, B.cta + 1.1, we(28) - .02, ws(30), ws(35)];
    let sq = 0; landings.forEach(l => sq += imp(t, l, 9, 26) * .7);
    const hop = bump(t, B.intro + .05, .3);
    let eye = 1; [B.intro + 1.1, B.map + 1.2, B.hunt + 1.4, B.stamp + .9, B.badge + .6, B.cta + 1.6].forEach(b2 => eye = Math.min(eye, 1 - bump(t, b2, .14)));
    return { x, y: y + Math.sin(t * 2.2) * s * .01, size: s, t, mood, mouth: m, eye,
      sx: 1 + sq * .1 - hop * .1, sy: 1 - sq * .12 + hop * .2 + Math.sin(t * 3) * .012,
      headDy: -m * 8, lean: Math.sin(t * 6.5) * .03 * Math.min(1, m * 3),
      wave: eo(seg(t, ws(5) - .2, ws(5))) * (1 - seg(t, B.map - .1, B.map + .1)) + eo(seg(t, B.cta + 1.1, B.cta + 1.3)) * (1 - seg(t, 14.6, 14.9)),
      mag: t > B.map && t < B.hunt ? eo(seg(t, B.map + .2, B.map + .45)) * (1 - seg(t, B.hunt - .2, B.hunt)) : 0,
      lookX: t > B.map && t < B.hunt ? .5 : t > B.hunt && t < B.stamp ? -.5 : t > B.stamp && t < B.badge ? .6 : 0,
      lookY: t > B.hunt && t < B.stamp ? .6 : t > B.badge && t < B.pass ? -.6 : 0,
      brow: t > B.badge && t < B.pass ? 1 : undefined,
      kick: bump(t, ws(30), .4) };
  }

  // ---------- captions (burned in, word by word) ----------
  function captions(t) {
    if (!WORDS.length || t < B.intro) return;
    let g = -1; WORDS.forEach(w => { if (t >= w.s - .02) g = w.g; });
    if (g < 1) return; // sentence 0 is the hook's kinetic type
    const wsg = WORDS.filter(w => w.g === g), last = wsg[wsg.length - 1], next = WORDS.find(w => w.g === g + 1);
    if (t > last.e + .45 && (!next || t < next.s)) return;
    X.save(); X.font = `900 70px ${SANS}`; X.letterSpacing = '1px';
    const sp = 24, lines = [[]]; let lw = 0;
    wsg.forEach(w => { const u = w.txt.toUpperCase(), m = X.measureText(u).width; if (lw + m > 880 && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push({ w, u, m }); lw += m + sp; });
    const lh = 84, y0 = 1500 - (lines.length - 1) * lh;
    lines.forEach((ln, li) => {
      const tot = ln.reduce((a, x) => a + x.m, 0) + sp * (ln.length - 1); let x = 540 - tot / 2;
      ln.forEach(({ w, u, m }) => {
        const q = seg(t, w.s - .02, w.s + .1);
        if (q > 0) {
          const active = t >= w.s && t < w.e + .08, kk = lerp(.55, 1, back(q)) * (active ? 1.06 : 1);
          X.save(); X.translate(x + m / 2, y0 + li * lh); X.scale(kk, kk);
          X.lineJoin = 'round'; X.lineWidth = 16; X.strokeStyle = C.esp; X.textAlign = 'center'; X.textBaseline = 'middle';
          X.shadowColor = 'rgba(0,0,0,.3)'; X.shadowBlur = 16; X.shadowOffsetY = 6; X.strokeText(u, 0, 0); X.shadowColor = 'transparent';
          X.fillStyle = active ? C.gold : C.cream; X.fillText(u, 0, 0); X.restore();
        }
        x += m + sp;
      });
    });
    X.restore();
  }

  // ---------- frame ----------
  function render(t, o = {}) {
    k = canvas.width / W;
    t = ((t % DUR) + DUR) % DUR;
    base(); X.clearRect(0, 0, W, H);
    const SHAKES = [[ws(0), 22], [we(28) - .02, 30], [ws(35), 22], [B.intro + .02, 14]];
    let sx = 0, sy = 0; for (const [s0, a] of SHAKES) { const e = imp(t, s0, 10, 60) * a; sx += e; sy += e * .6; }
    X.translate(sx, sy);
    const S = SCENES();
    let i = 0; while (i < S.length - 1 && t >= S[i + 1][0]) i++;
    const tr = TR[i], p = tr ? eio(seg(t, S[i][0], S[i][0] + tr.d)) : 1;
    if (tr && p < 1) { X.save(); S[i - 1][1](t); X.restore(); X.save(); wipe(tr, p); X.clip(); S[i][1](t); X.restore(); wipeEdge(tr, p); }
    else { X.save(); S[i][1](t); X.restore(); }
    const h = host(t); LENS = null;
    if (h) bean(h);
    if (h && t > B.map && t < B.hunt) beam(t);
    const fl = 1 - seg(t, B.intro, B.intro + .16); if (t >= B.intro && fl > 0) { X.save(); X.globalAlpha = fl * .55; fillAll('#FFF1DC'); X.restore(); }
    if (o.captions !== false) captions(t);
    // the last half second folds back into the hook so the loop is seamless
    const lp = eio(seg(t, B.end, DUR));
    if (lp > 0) { X.save(); X.globalAlpha = lp; hook(0); X.restore(); }
    base();
    const vg = X.createRadialGradient(540, 960, 720, 540, 960, 1320); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,2,.35)');
    X.fillStyle = vg; X.fillRect(0, 0, W, H);
  }
  return { render, ready, DUR, FPS, W, H, beats: B, words: WORDS };
}
root.BeanIntro = { create, W, H, DUR, FPS };
})(typeof window !== 'undefined' ? window : globalThis);

BeanIntro.ALIGN = {"characters":["S","t","o","p"," ","d","r","i","n","k","i","n","g"," ","s","a","d"," ","c","o","f","f","e","e","."," ","I","'","m"," ","B","e","a","n",","," ","a","n","d"," ","I"," ","s","n","i","f","f"," ","o","u","t"," ","t","h","e"," ","b","e","s","t"," ","c","a","f","é","s"," ","n","e","a","r"," ","y","o","u","."," ","L","a","p","t","o","p","-","f","r","i","e","n","d","l","y"," ","s","p","o","t","s",","," ","h","i","d","d","e","n"," ","g","e","m","s",","," ","o","p","e","n"," ","r","i","g","h","t"," ","n","o","w","."," ","S","t","a","m","p"," ","e","v","e","r","y"," ","c","u","p"," ","i","n"," ","a"," ","c","o","u","p","l","e"," ","t","a","p","s","."," ","E","a","r","n"," ","b","a","d","g","e","s","."," ","F","i","l","l"," ","y","o","u","r"," ","p","a","s","s","p","o","r","t","."," ","I","t","'","s"," ","f","r","e","e","."," ","S","e","a","r","c","h"," ","B","e","a","n"," ","H","u","n","t","!"],"character_start_times_seconds":[0.0,0.089,0.145,0.212,0.257,0.301,0.335,0.38,0.402,0.436,0.48,0.525,0.547,0.569,0.614,0.659,0.759,0.804,0.86,0.893,0.949,1.027,1.072,1.116,1.25,1.351,1.697,1.764,1.809,1.854,1.921,1.965,2.065,2.122,2.222,2.367,2.546,2.59,2.636,2.668,2.713,2.736,2.803,2.859,2.903,2.948,2.981,3.014,3.06,3.082,3.115,3.149,3.182,3.205,3.227,3.249,3.316,3.361,3.428,3.472,3.506,3.551,3.595,3.707,3.774,3.874,3.93,3.975,4.009,4.041,4.075,4.109,4.154,4.176,4.21,4.276,4.421,4.652,4.719,4.786,4.841,4.897,4.964,5.009,5.054,5.088,5.121,5.154,5.177,5.21,5.255,5.299,5.344,5.388,5.434,5.5,5.601,5.667,5.768,5.913,6.059,6.103,6.148,6.192,6.237,6.27,6.293,6.338,6.382,6.494,6.561,6.662,6.807,7.018,7.119,7.175,7.219,7.241,7.287,7.32,7.354,7.386,7.41,7.442,7.476,7.51,7.555,7.621,7.8,8.031,8.097,8.164,8.232,8.276,8.332,8.433,8.544,8.588,8.634,8.678,8.711,8.767,8.801,8.879,8.924,8.968,8.99,9.012,9.046,9.068,9.114,9.147,9.181,9.225,9.269,9.314,9.359,9.404,9.448,9.582,9.661,9.761,9.906,10.136,10.204,10.248,10.293,10.338,10.393,10.449,10.516,10.572,10.628,10.728,10.829,10.974,11.119,11.197,11.253,11.275,11.309,11.354,11.376,11.398,11.42,11.442,11.488,11.521,11.588,11.633,11.688,11.744,11.8,11.844,11.945,12.012,12.113,12.168,12.213,12.258,12.291,12.336,12.381,12.459,12.503,12.682,12.727,12.958,13.025,13.081,13.126,13.17,13.214,13.293,13.405,13.483,13.55,13.606,13.639,13.695,13.739,13.807,13.851,13.929],"character_end_times_seconds":[0.089,0.145,0.212,0.257,0.301,0.335,0.38,0.402,0.436,0.48,0.525,0.547,0.569,0.614,0.659,0.759,0.804,0.86,0.893,0.949,1.027,1.072,1.116,1.25,1.351,1.697,1.764,1.809,1.854,1.921,1.965,2.065,2.122,2.222,2.367,2.546,2.59,2.636,2.668,2.713,2.736,2.803,2.859,2.903,2.948,2.981,3.014,3.06,3.082,3.115,3.149,3.182,3.205,3.227,3.249,3.316,3.361,3.428,3.472,3.506,3.551,3.595,3.707,3.774,3.874,3.93,3.975,4.009,4.041,4.075,4.109,4.154,4.176,4.21,4.276,4.421,4.652,4.719,4.786,4.841,4.897,4.964,5.009,5.054,5.088,5.121,5.154,5.177,5.21,5.255,5.299,5.344,5.388,5.434,5.5,5.601,5.667,5.768,5.913,6.059,6.103,6.148,6.192,6.237,6.27,6.293,6.338,6.382,6.494,6.561,6.662,6.807,7.018,7.119,7.175,7.219,7.241,7.287,7.32,7.354,7.386,7.41,7.442,7.476,7.51,7.555,7.621,7.8,8.031,8.097,8.164,8.232,8.276,8.332,8.433,8.544,8.588,8.634,8.678,8.711,8.767,8.801,8.879,8.924,8.968,8.99,9.012,9.046,9.068,9.114,9.147,9.181,9.225,9.269,9.314,9.359,9.404,9.448,9.582,9.661,9.761,9.906,10.136,10.204,10.248,10.293,10.338,10.393,10.449,10.516,10.572,10.628,10.728,10.829,10.974,11.119,11.197,11.253,11.275,11.309,11.354,11.376,11.398,11.42,11.442,11.488,11.521,11.588,11.633,11.688,11.744,11.8,11.844,11.945,12.012,12.113,12.168,12.213,12.258,12.291,12.336,12.381,12.459,12.503,12.682,12.727,12.958,13.025,13.081,13.126,13.17,13.214,13.293,13.405,13.483,13.55,13.606,13.639,13.695,13.739,13.807,13.851,13.929,14.231]};
