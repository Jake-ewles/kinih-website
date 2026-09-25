/* Kinih member dashboard.
   Demo mode: the member and all their data live in this browser (localStorage "kinih_member").
   Coach replies are simulated through a small queue so they survive page reloads. */
(() => {
'use strict';
const LS = 'kinih_member', NEW = 'kinih_new';
const $ = (s, r = document) => r.querySelector(s);
const LOCALE = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-MA' };
const qs = new URLSearchParams(location.search);
let lang = 'en';
try { lang = localStorage.getItem('kinih_lang') || 'en'; } catch (e) {}
if (T[qs.get('lang')]) lang = qs.get('lang');
if (!T[lang]) lang = 'en';

/* ---------- helpers ---------- */
function t(k, v) {
  let s = T[lang][k];
  if (s == null) s = T.en[k];
  if (s == null) return k;
  if (v) Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); });
  return s;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const pad = n => (n < 10 ? '0' : '') + n;
const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = k => { const p = k.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
const tk = () => key(today());
const diffDays = k => Math.round((parse(k) - today()) / 864e5);
const fmt = (k, o) => new Intl.DateTimeFormat(LOCALE[lang], o).format(parse(k));
const dayName = (k, long) => fmt(k, { weekday: long ? 'long' : 'short' });
const shortDate = k => fmt(k, { day: 'numeric', month: 'short' });
const num = (n, d) => new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: d == null ? 1 : d }).format(n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const toMin = hm => { const p = hm.split(':'); return +p[0] * 60 + +p[1]; };
const byDate = (a, b) => (a.date + a.time < b.date + b.time ? -1 : 1);
function dayLabel(k) {
  const d = diffDays(k);
  if (d === 0) return t('d.today');
  if (d === 1) return t('d.tomorrow');
  if (d === -1) return t('d.yesterday');
  return fmt(k, { weekday: 'long', day: 'numeric', month: 'short' });
}
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
const roundKg = x => (x <= 0 ? 0 : x >= 20 ? Math.round(x / 2.5) * 2.5 : Math.round(x));

/* ---------- training library ---------- */
// id: [start kg, reps low, reps high, sets, rest seconds]
const EX = {
  bench: [50, 8, 10, 4, 90], row: [45, 8, 10, 4, 90], ohp: [30, 8, 10, 3, 90], pulldown: [45, 10, 12, 3, 75], curl: [10, 10, 12, 3, 60], pushdown: [20, 10, 12, 3, 60],
  squat: [60, 6, 8, 4, 120], rdl: [50, 8, 10, 3, 90], legpress: [100, 10, 12, 3, 90], lunge: [12, 10, 12, 3, 75], legcurl: [30, 10, 12, 3, 60], calf: [40, 12, 15, 3, 45],
  deadlift: [70, 5, 6, 3, 120], incline: [18, 8, 10, 3, 90], goblet: [20, 10, 12, 3, 60], pullup: [0, 5, 8, 3, 90], plank: [0, 30, 45, 3, 45],
  fly: [12, 12, 15, 3, 60], dips: [0, 8, 12, 3, 75], facepull: [15, 12, 15, 3, 60], hammer: [12, 10, 12, 3, 60],
  rower: [0, 250, 300, 4, 60], kbswing: [16, 15, 20, 4, 45], bike: [0, 60, 60, 4, 45]
};
const UNIT = { plank: 'u.sec', rower: 'u.m', bike: 'u.sec' };
const exDef = id => { const a = EX[id]; return { kg: a[0], lo: a[1], hi: a[2], sets: a[3], rest: a[4] }; };
const TYPES = {
  upper: ['bench', 'row', 'ohp', 'pulldown', 'curl', 'pushdown'],
  lower: ['squat', 'rdl', 'legpress', 'lunge', 'legcurl', 'calf'],
  full: ['deadlift', 'incline', 'goblet', 'pullup', 'plank'],
  circuit: ['rower', 'kbswing', 'goblet', 'plank', 'bike'],
  push: ['bench', 'incline', 'ohp', 'fly', 'pushdown', 'dips'],
  pull: ['deadlift', 'pulldown', 'row', 'facepull', 'curl', 'hammer'],
  legs: ['squat', 'rdl', 'legpress', 'lunge', 'legcurl', 'calf']
};
const TLOC = { upper: 'weights', push: 'weights', pull: 'weights', lower: 'floor', legs: 'floor', full: 'floor', circuit: 'cardio' };
const SELF_TYPES = ['upper', 'lower', 'full', 'circuit'], COACH_TYPES = ['push', 'pull', 'legs', 'circuit'];
const typesFor = () => (S.plan === 'self' ? SELF_TYPES : COACH_TYPES);
const duration = type => Math.round(TYPES[type].reduce((s, id) => { const d = exDef(id); return s + d.sets * (40 + d.rest); }, 0) / 60) + 8;
const COACHES = {
  karim: { name: 'Karim Ali', img: 'images/coach-1.png', spec: 'c1.tag' },
  hanao: { name: 'Hanao Ibhraim', img: 'images/coach-2.png', spec: 'c2.tag' },
  djelil: { name: 'Djelil Baba', img: 'images/coach-3.png', spec: 'c3.tag' }
};
const coachFor = goal => (goal === 'lose' ? 'karim' : goal === 'build' ? 'hanao' : 'djelil');
const coach = () => COACHES[S.coach];
const coachFirst = () => coach().name.split(' ')[0];
// name, kcal, protein, carbs, fat
const MEALS = {
  breakfast: [['m.msemen', 420, 14, 52, 16], ['m.omelette', 380, 28, 20, 20], ['m.oats', 400, 22, 55, 10]],
  lunch: [['m.tajine', 650, 45, 55, 24], ['m.rice', 610, 48, 70, 12], ['m.fish', 560, 46, 48, 16]],
  snack: [['m.yogurt', 250, 20, 30, 5], ['m.shake', 220, 30, 12, 4], ['m.dates', 280, 8, 40, 11]],
  dinner: [['m.harira', 450, 24, 55, 12], ['m.salad', 520, 42, 40, 18], ['m.eggs', 480, 30, 38, 22]]
};
const MEAL_HOUR = { breakfast: 8, lunch: 13, snack: 17, dinner: 20 };
const planName = p => t(p === 'self' ? 'pl1.n' : p === 'coach' ? 'pl2.n' : 'pl3.n');
const targets = () => (S.goal === 'lose' ? { kcal: 2000, p: 150, c: 190, f: 65, w: 2500 } : S.goal === 'build' ? { kcal: 2700, p: 170, c: 320, f: 80, w: 3000 } : { kcal: 2300, p: 140, c: 250, f: 75, w: 2500 });

/* ---------- state ---------- */
let S = null;
let view = 'home', schedWeek = 0, weekSel = 'this', range = 30, inboxTab = 'coach', liftEx = null, nutDay = 0, sheet = false;
let restIv = null, notifTimer = null, modalSubmit = null;
const uid = () => 'x' + (S.nid++);

function load() {
  try { const s = JSON.parse(localStorage.getItem(LS)); return s && s.v === 1 ? s : null; } catch (e) { return null; }
}
function save() {
  try { localStorage.setItem(LS, JSON.stringify(S)); return true; } catch (e) { toast(t('e.storage')); return false; }
}

function defaultTpl(plan, goal) {
  const a = plan === 'self' ? [[0, 'upper'], [2, 'lower'], [4, 'full']] : [[0, 'push'], [2, 'pull'], [4, 'legs']];
  if (goal === 'lose') a.push([5, 'circuit']);
  return a.map(x => ({ dow: x[0], type: x[1], time: x[0] === 5 ? '10:00' : '18:00' }));
}

function makeLog(sess, f, R) {
  const fac = S.goal === 'build' ? 0.75 + 0.35 * f : S.goal === 'lose' ? 0.85 + 0.12 * f : 0.78 + 0.22 * f;
  const sets = [];
  TYPES[sess.type].forEach(id => {
    const d = exDef(id), kg = roundKg(d.kg * fac), reps = d.lo + Math.floor(R() * (d.hi - d.lo + 1));
    for (let j = 0; j < d.sets; j++) sets.push({ ex: id, kg, reps: Math.max(d.lo, reps - (j > 1 ? 1 : 0)) });
  });
  return { id: uid(), date: sess.date, type: sess.type, sid: sess.id, dur: duration(sess.type) + Math.round(R() * 8 - 4), sets };
}

function seed(p) {
  const goal = p.goal || 'unsure', R = rng(7), td = today(), mon0 = monday(td), W = 26;
  S = { v: 1, demo: true, nid: 1, profile: p, plan: p.plan, goal, coach: coachFor(goal), settings: { notif: true, remind: 60 },
    tpl: defaultTpl(p.plan, goal), sessions: [], logs: [], weights: [], measures: [], photos: [], goals: [], msgs: [], appts: [],
    reqs: [], feedback: [], meals: [], water: {}, challenges: {}, queue: [], gen: [], start: '', active: null, dismissed: [] };
  const start = addDays(mon0, -7 * W), T0 = key(td), streakFrom = key(addDays(td, -12));
  S.start = key(start);
  for (let w = 0; w <= W; w++) {
    const mon = addDays(start, 7 * w);
    if (w < W) S.gen.push(key(mon));
    S.tpl.forEach(e => {
      const k = key(addDays(mon, e.dow));
      if (k < T0) S.sessions.push({ id: uid(), date: k, time: e.time, type: e.type, status: 'done' });
    });
  }
  S.sessions.sort(byDate);
  S.sessions.forEach(x => { if (x.date < streakFrom && R() < 0.1) x.status = 'planned'; });
  const old = S.sessions.filter(x => x.date < streakFrom);
  if (old.length) old[old.length - 1].status = 'planned';
  const cw = S.sessions.filter(x => x.date >= key(mon0));
  if (cw.length) cw[cw.length - 1].status = 'planned';
  S.sessions.forEach(x => { if (x.status === 'done') S.logs.push(makeLog(x, (parse(x.date) - start) / (td - start), R)); });

  const WT = { lose: [86, 79.4], build: [68, 72.1], unsure: [77, 75.2] }[goal];
  for (let d = new Date(start); d <= addDays(td, -8); d = addDays(d, 3)) {
    const f = (d - start) / (td - start);
    S.weights.push({ date: key(d), kg: Math.round((WT[0] + (WT[1] - WT[0]) * f + (R() - 0.5) * 0.6) * 10) / 10 });
  }
  const M = { lose: [[97, 90], [104, 100], [102, 98], [33, 33.5]], build: [[79, 80], [95, 99], [92, 93], [32, 34.5]], unsure: [[88, 85.5], [98, 97], [97, 96], [32, 32.5]] }[goal];
  for (let d = new Date(start); d <= addDays(td, -3); d = addDays(d, 14)) {
    const f = (d - start) / (td - start), v = i => Math.round((M[i][0] + (M[i][1] - M[i][0]) * f) * 2) / 2;
    S.measures.push({ date: key(d), waist: v(0), chest: v(1), hips: v(2), arm: v(3) });
  }

  const wAt = days => { const f = 1 - days / ((td - start) / 864e5); return Math.round((WT[0] + (WT[1] - WT[0]) * f) * 10) / 10; };
  const bench = best('bench');
  S.goals = [
    { id: uid(), type: 'weight', start: wAt(60), target: goal === 'lose' ? 76 : goal === 'build' ? 75 : 73.5 },
    { id: uid(), type: 'freq', target: S.tpl.length },
    { id: uid(), type: 'lift', ex: 'bench', start: best('bench', key(addDays(td, -56))) || bench, target: roundKg(bench + 5) },
    { id: uid(), type: 'count', target: S.tpl.length * 4 }
  ];

  const ago = n => key(addDays(td, -n));
  const m = (from, cat, date, time, k, v, read) => S.msgs.push({ id: uid(), from, cat, date, time, k, v, read: read !== false });
  m('coach', 'coach', ago(20), '09:12', 'sm.1', { name: p.first });
  m('me', 'coach', ago(20), '09:40', 'sm.2');
  m('coach', 'coach', ago(20), '10:05', 'sm.3');
  m('me', 'coach', ago(3), '21:10', 'sm.5');
  m('coach', 'coach', ago(3), '21:32', 'sm.6');
  m('coach', 'coach', T0, '07:30', 'sm.7', null, false);
  m('kinih', 'account', ago(1), '08:00', 'am.1', { id: p.id }, false);
  m('kinih', 'account', ago(9), '08:00', 'am.2', { date: shortDate(key(addDays(td, 21))) });
  S.appts = [
    { id: uid(), date: ago(7), time: '17:30', kind: 'checkin', status: 'done' },
    { id: uid(), date: key(addDays(td, 2)), time: '17:30', kind: p.plan === 'premium' ? 'pt' : 'checkin', status: 'booked' }
  ];
  if (p.plan === 'premium') S.appts.push({ id: uid(), date: key(addDays(td, 5)), time: '09:00', kind: 'pt', status: 'booked' });
  const nx = S.appts[1];
  m('kinih', 'appt', ago(1), '12:00', 'ap.ok', { date: shortDate(nx.date), time: nx.time }, false);
  S.reviews = [{ date: ago(14), k: 'rv.prev.' + goal }];
  S.logs.slice(-3).forEach((l, i) => S.feedback.push({ lid: l.id, date: l.date, k: ['fb.steady', 'fb.good', 'fb.form'][i] }));

  for (let i = 6; i >= 0; i--) {
    const k = ago(i), sc = goal === 'build' ? 1.25 : goal === 'lose' ? 0.95 : 1.05;
    Object.keys(MEALS).forEach((slot, j) => {
      if (i === 0 && MEAL_HOUR[slot] > new Date().getHours()) return;
      const x = MEALS[slot][Math.floor(R() * 3)];
      S.meals.push({ id: uid(), date: k, slot, k: x[0], kcal: Math.round(x[1] * sc), p: Math.round(x[2] * sc), c: Math.round(x[3] * sc), f: Math.round(x[4] * sc) });
    });
    S.water[k] = i === 0 ? Math.min(2500, 250 * Math.max(1, Math.floor(new Date().getHours() / 2.5))) : 1750 + Math.round(R() * 4) * 250;
  }
  S.challenges = { transform: { joined: ago(10) }, consistency: { joined: ago(21) } };
  ensureWeeks();
}

function blankStart() {
  // "Start fresh": keep the member and their routine, drop the sample history
  const p = S.profile, plan = S.plan, tpl = S.tpl, settings = S.settings, coachId = S.coach;
  S = { v: 1, demo: false, nid: 1, profile: p, plan, goal: p.goal || 'unsure', coach: coachId, settings, tpl, sessions: [], logs: [], weights: [], measures: [], photos: [],
    goals: [], msgs: [], appts: [], reqs: [], feedback: [], meals: [], water: {}, challenges: {}, queue: [], gen: [], start: tk(), active: null, dismissed: [], reviews: [] };
  if (plan !== 'self') S.msgs.push({ id: uid(), from: 'coach', cat: 'coach', date: tk(), time: '09:00', k: 'sm.1', v: { name: p.first }, read: false });
  S.msgs.push({ id: uid(), from: 'kinih', cat: 'account', date: tk(), time: '09:00', k: 'am.1', v: { id: p.id }, read: false });
  ensureWeeks();
}

function ensureWeeks() {
  const T0 = tk(), m0 = monday(today());
  [0, 1].forEach(o => {
    const mk = key(addDays(m0, 7 * o));
    if (S.gen.includes(mk)) return;
    S.gen.push(mk);
    S.tpl.forEach(e => {
      const k = key(addDays(parse(mk), e.dow));
      if (k >= T0) S.sessions.push({ id: uid(), date: k, time: e.time, type: e.type, status: 'planned' });
    });
  });
  S.sessions.sort(byDate);
}
function applyTpl() {
  const T0 = tk(), m0 = monday(today()), end = key(addDays(m0, 13));
  S.sessions = S.sessions.filter(s => !(s.status === 'planned' && s.date >= T0 && s.date <= end));
  S.gen = S.gen.filter(g => g < key(m0));
  ensureWeeks();
}

/* ---------- derived data ---------- */
const status = s => (s.status === 'planned' && s.date < tk() ? 'missed' : s.status);
const live = s => s.status !== 'cancelled';
const weekOf = off => { const m = addDays(monday(today()), 7 * off); return [key(m), key(addDays(m, 6))]; };
const sessIn = (a, b) => S.sessions.filter(s => live(s) && s.date >= a && s.date <= b).sort(byDate);
function todaySession() {
  const l = sessIn(tk(), tk());
  return l.find(s => s.status === 'planned') || l.find(s => s.status === 'done') || null;
}
function nextSessions(n) {
  const T0 = tk(), m = nowMin();
  return S.sessions.filter(s => s.status === 'planned' && (s.date > T0 || (s.date === T0 && toMin(s.time) >= m - 60))).sort(byDate).slice(0, n);
}
function weekStats(off) {
  const [a, b] = weekOf(off), l = sessIn(a, b);
  const done = l.filter(s => s.status === 'done').length, missed = l.filter(s => status(s) === 'missed').length;
  return { planned: l.length, done, missed, list: l, a, b };
}
function consistency(a, b) {
  const due = sessIn(a, b).filter(s => s.date <= tk() && (s.status !== 'planned' || s.date < tk()));
  return due.length ? Math.round(due.filter(s => s.status === 'done').length / due.length * 100) : null;
}
function streak() {
  const mon = key(monday(today())), miss = {};
  S.sessions.forEach(s => { if (status(s) === 'missed' && s.date < mon) miss[s.date] = 1; });
  let n = 0;
  for (let d = today(); key(d) >= S.start && !miss[key(d)]; d = addDays(d, -1)) n++;
  return n;
}
function best(ex, before) {
  let b = 0;
  S.logs.forEach(l => { if (before && l.date >= before) return; l.sets.forEach(s => { if (s.ex === ex) b = Math.max(b, EX[ex][0] ? s.kg : s.reps); }); });
  return b;
}
function lastSets(ex) {
  for (let i = S.logs.length - 1; i >= 0; i--) {
    const s = S.logs[i].sets.filter(x => x.ex === ex);
    if (s.length) return s;
  }
  return null;
}
function suggest(ex) {
  const d = exDef(ex), last = lastSets(ex);
  if (!last) return { kg: d.kg, reps: d.hi, lo: d.lo, hi: d.hi };
  const top = last[0], inc = top.kg >= 40 ? 2.5 : 1;
  return { kg: top.kg && top.reps >= d.hi ? top.kg + inc : top.kg, reps: top.reps >= d.hi ? d.lo : Math.min(d.hi, top.reps + 1), lo: d.lo, hi: d.hi };
}
const volume = l => l.sets.reduce((s, x) => s + x.kg * x.reps, 0);
const latestWeight = () => (S.weights.length ? S.weights[S.weights.length - 1] : null);
const doneIn = (a, b) => S.sessions.filter(s => s.status === 'done' && s.date >= a && s.date <= b).length;
function prsIn(a, b) {
  const out = [];
  Object.keys(EX).forEach(ex => {
    if (!EX[ex][0]) return;
    const before = best(ex, a);
    let top = 0, date = '';
    S.logs.forEach(l => { if (l.date < a || l.date > b) return; l.sets.forEach(s => { if (s.ex === ex && s.kg > top) { top = s.kg; date = l.date; } }); });
    if (before && top > before) out.push({ ex, kg: top, gain: top - before, date });
  });
  return out;
}
function goalProg(g) {
  let cur, p, txt;
  if (g.type === 'weight') {
    const w = latestWeight(); cur = w ? w.kg : g.start;
    p = g.start === g.target ? 1 : (g.start - cur) / (g.start - g.target);
    txt = num(cur) + ' / ' + num(g.target) + ' kg';
  } else if (g.type === 'freq') {
    cur = weekStats(0).done; p = cur / g.target; txt = t('goal.freqNow', { n: cur, t: g.target });
  } else if (g.type === 'lift') {
    cur = best(g.ex); p = g.target <= g.start ? (cur >= g.target ? 1 : 0) : (cur - g.start) / (g.target - g.start);
    txt = num(cur) + ' / ' + num(g.target) + ' kg';
  } else {
    const d = today(), a = key(new Date(d.getFullYear(), d.getMonth(), 1));
    cur = doneIn(a, tk()); p = cur / g.target; txt = t('goal.countNow', { n: cur, t: g.target });
  }
  return { p: clamp(p || 0, 0, 1), txt };
}
function goalTitle(g) {
  if (g.type === 'weight') return g.target < g.start ? t('goal.t.lose', { n: num(g.start - g.target) }) : t('goal.t.reach', { n: num(g.target) });
  if (g.type === 'freq') return t('goal.t.freq', { n: g.target });
  if (g.type === 'lift') return t('goal.t.lift', { ex: t('ex.' + g.ex), n: num(g.target) });
  return t('goal.t.count', { n: g.target });
}
function freeDays(n) {
  const out = [];
  for (let i = 0; i < 8 && out.length < n; i++) {
    const k = key(addDays(today(), i));
    if (!sessIn(k, k).length) out.push(k);
  }
  return out;
}
function missedThisWeek() {
  const [a] = weekOf(0), T0 = tk();
  return S.sessions.filter(s => s.status === 'planned' && s.date >= a && s.date < T0 && !S.dismissed.includes(s.id));
}
const unread = cat => S.msgs.filter(m => !m.read && m.from !== 'me' && (!cat || m.cat === cat)).length;
const nextAppt = () => S.appts.filter(a => a.status === 'booked' && a.date >= tk()).sort(byDate)[0];
const pendingReq = sid => S.reqs.find(r => r.sid === sid && r.status === 'pending');
const programWeek = () => Math.floor((today() - parse(S.start)) / (7 * 864e5)) % 8 + 1;
function nutritionDay(k) {
  const l = S.meals.filter(m => m.date === k);
  return { kcal: l.reduce((s, m) => s + m.kcal, 0), p: l.reduce((s, m) => s + m.p, 0), c: l.reduce((s, m) => s + m.c, 0), f: l.reduce((s, m) => s + m.f, 0), n: l.length };
}
function nutritionScore() {
  const tg = targets(), sc = [];
  for (let i = 1; i <= 7; i++) {
    const n = nutritionDay(key(addDays(today(), -i)));
    if (!n.n) continue;
    sc.push((Math.min(n.kcal / tg.kcal, tg.kcal / n.kcal) + Math.min(1, n.p / tg.p)) / 2);
  }
  return sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length * 100) : null;
}

/* ---------- charts (single series, accent on dark surface) ---------- */
function lineChart(pts, o) {
  o = o || {};
  if (pts.length < 2) return `<p class="muted small">${t('ch.empty')}</p>`;
  const W = 640, H = 210, P = { l: 44, r: 16, t: 14, b: 28 };
  const ys = pts.map(p => p.y).concat(o.ref != null ? [o.ref] : []);
  let mn = Math.min(...ys), mx = Math.max(...ys);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pd = (mx - mn) * 0.15; mn -= pd; mx += pd;
  const x0 = parse(pts[0].k).getTime(), x1 = parse(pts[pts.length - 1].k).getTime() || x0 + 1;
  const X = k => P.l + (W - P.l - P.r) * ((parse(k) - x0) / ((x1 - x0) || 1));
  const Y = v => P.t + (H - P.t - P.b) * (1 - (v - mn) / (mx - mn));
  let g = '';
  for (let i = 0; i <= 3; i++) {
    const v = mn + (mx - mn) * i / 3, y = Y(v);
    g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/><text x="${P.l - 8}" y="${y + 4}" class="ax" text-anchor="end">${num(v, v > 100 ? 0 : 1)}</text>`;
  }
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p.k).toFixed(1) + ',' + Y(p.y).toFixed(1)).join('');
  const area = d + `L${X(pts[pts.length - 1].k).toFixed(1)},${H - P.b}L${X(pts[0].k).toFixed(1)},${H - P.b}Z`;
  const lbl = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]];
  const xl = lbl.map((p, i) => `<text x="${X(p.k)}" y="${H - 8}" class="ax" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${shortDate(p.k)}</text>`).join('');
  const ref = o.ref != null ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" class="refl"/><text x="${W - P.r}" y="${Y(o.ref) - 6}" class="ax" text-anchor="end">${esc(o.refLabel || '')}</text>` : '';
  const step = (W - P.l - P.r) / Math.max(1, pts.length - 1);
  const hits = pts.map(p => `<rect class="hit" x="${X(p.k) - step / 2}" y="${P.t}" width="${step}" height="${H - P.t - P.b}" data-tip="${esc(shortDate(p.k) + ' · ' + num(p.y) + ' ' + (o.unit || ''))}"/>`).join('');
  const last = pts[pts.length - 1];
  return `<div class="chart" dir="ltr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${g}${ref}<path d="${area}" class="area"/><path d="${d}" class="line"/>${xl}<circle cx="${X(last.k)}" cy="${Y(last.y)}" r="5" class="dot"/>${hits}</svg></div>`;
}
function barChart(bars, o) {
  o = o || {};
  if (!bars.length) return `<p class="muted small">${t('ch.empty')}</p>`;
  const W = 640, H = 190, P = { l: 44, r: 16, t: 14, b: 28 };
  const mx = Math.max(1, ...bars.map(b => b.v), o.ref || 0) * 1.1, base = H - P.b;
  const bw = (W - P.l - P.r) / bars.length, w = Math.max(4, Math.min(38, bw - 6)), r = Math.min(4, w / 2);
  const Y = v => P.t + (H - P.t - P.b) * (1 - v / mx);
  let g = '';
  for (let i = 0; i <= 2; i++) { const v = mx * i / 2, y = Y(v); g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/><text x="${P.l - 8}" y="${y + 4}" class="ax" text-anchor="end">${num(v, 0)}</text>`; }
  const every = Math.ceil(bars.length / 8);
  const body = bars.map((b, i) => {
    const x = P.l + bw * i + (bw - w) / 2, y = Y(b.v), h = base - y;
    const path = h <= 0 ? '' : h < r ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="bar${b.hl ? ' hl' : ''}"/>` :
      `<path class="bar${b.hl ? ' hl' : ''}" d="M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z"/>`;
    const lab = i % every === 0 || i === bars.length - 1 ? `<text x="${x + w / 2}" y="${H - 8}" class="ax" text-anchor="middle">${esc(b.l)}</text>` : '';
    return path + lab + `<rect class="hit" x="${P.l + bw * i}" y="${P.t}" width="${bw}" height="${base - P.t}" data-tip="${esc(b.tip || b.l + ' · ' + num(b.v))}"/>`;
  }).join('');
  const ref = o.ref ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" class="refl"/>` : '';
  return `<div class="chart" dir="ltr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${g}${body}${ref}</svg></div>`;
}
const bar = (p, cls) => `<div class="pbar ${cls || ''}"><span style="width:${Math.round(clamp(p, 0, 1) * 100)}%"></span></div>`;

/* ---------- building blocks ---------- */
const card = (title, body, cls, extra) => `<section class="card ${cls || ''}">${title ? `<div class="card-h"><h3>${title}</h3>${extra || ''}</div>` : ''}${body}</section>`;
const tile = (v, l, icon) => `<div class="tile">${icon ? `<i class="fa-solid ${icon}"></i>` : ''}<b>${v}</b><span>${l}</span></div>`;
const btn = (label, act, data, cls) => `<button class="dbtn ${cls || ''}" data-act="${act}" ${Object.keys(data || {}).map(k => `data-${k}="${esc(data[k])}"`).join(' ')}>${label}</button>`;
const wName = type => t('w.' + type);
const canEdit = () => S.plan !== 'coach';

function todayCard(s) {
  if (!s) {
    const n = nextSessions(1)[0];
    return card('', `<div class="today rest"><div class="eyebrow">${t('td.label')}</div><h2 class="display">${t('td.rest')}</h2>
      <p class="muted">${t('td.restP')}</p>
      ${n ? `<p class="next-line"><i class="fa-regular fa-clock"></i>${t('td.next', { day: dayLabel(n.date), time: n.time, w: wName(n.type) })}</p>` : ''}
      <div class="row-btns">${n ? btn(t('td.anyway'), 'startType', { type: n.type }, 'alt') : ''}${btn(t('nav.d.schedule'), 'nav', { v: S.plan === 'coach' ? 'program' : 'schedule' }, 'alt')}</div></div>`, 'd-hero');
  }
  const done = s.status === 'done', ex = TYPES[s.type].length;
  const byCoach = S.plan !== 'self' ? `<span class="chip"><i class="fa-solid fa-user-tie"></i>${t('td.byCoach', { c: coach().name })}</span>` : '';
  return card('', `<div class="today"><div class="eyebrow">${t('td.label')} · ${dayLabel(s.date)}</div>
    <h2 class="display">${wName(s.type)}</h2>${byCoach}
    <div class="meta">
      <span><i class="fa-regular fa-clock"></i><b>${s.time}</b></span>
      <span><i class="fa-solid fa-location-dot"></i>${t('loc.' + TLOC[s.type])}</span>
      <span><i class="fa-solid fa-hourglass-half"></i>${t('u.min', { n: duration(s.type) })}</span>
      <span><i class="fa-solid fa-list-check"></i>${t('td.ex', { n: ex })}</span>
    </div>
    <p class="goal-line"><i class="fa-solid fa-bullseye"></i>${t('wg.' + s.type)}</p>
    ${done ? `<div class="done-line"><i class="fa-solid fa-circle-check"></i>${t('td.done')}</div>` : `<button class="dbtn big" data-act="start" data-id="${s.id}"><i class="fa-solid fa-play"></i>${t('td.start')}</button>`}
  </div>`, 'd-hero');
}

function reminderBanner() {
  if (!S.settings.notif) return '';
  const s = todaySession();
  let txt = '', act = '';
  if (s && s.status === 'planned') {
    const d = toMin(s.time) - nowMin();
    if (d > 0 && d <= S.settings.remind) txt = t('rem.soon', { n: d });
    else if (d < -15) { txt = t('rem.notYet'); act = btn(t('td.start'), 'start', { id: s.id }, 'sm'); }
  } else if (!s) {
    const tm = key(addDays(today(), 1)), n = sessIn(tm, tm)[0];
    if (n) txt = t('rem.tomorrow', { time: n.time, w: wName(n.type) });
  }
  return txt ? `<div class="banner"><i class="fa-regular fa-bell"></i><span>${txt}</span>${act}</div>` : '';
}

function missedCards() {
  return missedThisWeek().map(s => {
    const day = dayName(s.date, true), free = freeDays(2);
    let body, btns = '';
    if (S.plan === 'coach') {
      body = `<b>${t('miss.coach', { day })}</b><p>${t('miss.coachQ')}</p>`;
      btns = btn(`<i class="fa-solid fa-paper-plane"></i>${t('miss.notify')}`, 'notify', { id: s.id }) + btn(t('miss.request'), 'req', { id: s.id }, 'alt');
    } else if (S.plan === 'premium') {
      body = `<b>${t('miss.prem', { day })}</b><p>${t('miss.premQ')}</p>`;
      btns = free.map(k => btn(t('miss.moveTo', { day: dayName(k, true) }), 'moveTo', { id: s.id, date: k })).join('') + btn(t('miss.skip'), 'skipS', { id: s.id }, 'alt');
    } else {
      body = `<b>${t('miss.self', { day })}</b><p>${free[0] ? t('miss.selfQ', { day: dayName(free[0], true) }) : ''}</p>`;
      btns = (free[0] ? btn(t('miss.move'), 'moveTo', { id: s.id, date: free[0] }) : '') + btn(t('miss.skip'), 'skipS', { id: s.id }, 'alt');
    }
    return `<div class="miss"><i class="fa-regular fa-calendar-xmark"></i><div>${body}<div class="row-btns">${btns}</div></div></div>`;
  }).join('');
}

function stayCard() {
  const w = weekStats(0), st = streak();
  let msg;
  if (w.planned && w.done >= w.planned) msg = t('stay.all');
  else if (w.planned - w.done === 1) msg = t('stay.one');
  else msg = t('stay.keep');
  return card(t('stay.h'), `<div class="streak"><span class="flame">🔥</span><div><b>${t('stay.streak', { n: st })}</b><small>${t('stay.streakNote')}</small></div></div>
    <p>${t('stay.week', { d: w.done, n: w.planned })}</p>${bar(w.planned ? w.done / w.planned : 0)}<p class="muted small">${msg}</p>`);
}

function weekStrip() {
  const [a] = weekOf(0), T0 = tk();
  let h = '';
  for (let i = 0; i < 7; i++) {
    const k = key(addDays(parse(a), i)), s = sessIn(k, k)[0], st = s ? status(s) : 'rest';
    const ic = { done: 'fa-check', planned: 'fa-dumbbell', missed: 'fa-exclamation', skipped: 'fa-forward', rest: 'fa-moon' }[st];
    h += `<button class="day ${st} ${k === T0 ? 'now' : ''}" data-act="nav" data-v="${S.plan === 'coach' ? 'program' : 'schedule'}" data-tip="${esc(s ? wName(s.type) + ' · ' + s.time : t('td.rest'))}"><small>${dayName(k)}</small><b>${parse(k).getDate()}</b><i class="fa-solid ${ic}"></i></button>`;
  }
  return card(t('wk.strip'), `<div class="strip">${h}</div>`);
}

function nextUpCard() {
  const l = nextSessions(3);
  return card(t('next.h'), l.length ? `<ul class="list">${l.map(s => `<li><div><b>${wName(s.type)}</b><small>${dayLabel(s.date)} · ${s.time} · ${t('u.min', { n: duration(s.type) })}</small></div><span class="tag">${t('loc.' + TLOC[s.type])}</span></li>`).join('')}</ul>` : `<p class="muted">${t('next.none')}</p>`);
}

function goalsMini() {
  return card(t('nav.d.goals'), S.goals.length ? S.goals.slice(0, 3).map(g => { const p = goalProg(g); return `<div class="goal-mini"><div><b>${goalTitle(g)}</b><small>${p.txt}</small></div>${bar(p.p)}</div>`; }).join('') : `<p class="muted">${t('goal.none')}</p>`,
    '', btn(t('all'), 'nav', { v: 'goals' }, 'link'));
}

function coachCard(big) {
  const c = coach(), a = nextAppt(), last = S.msgs.filter(m => m.from === 'coach').slice(-1)[0];
  return card(t('coach.h'), `<div class="coach-id">
      <img src="${c.img}" alt="${esc(c.name)}"><div><b class="display">${t('coach.name', { c: c.name })}</b><small>${t(c.spec)}</small>
      <small class="prog"><i class="fa-solid fa-clipboard-list"></i>${t('coach.prog', { p: t('prog.' + S.plan), w: programWeek() })}</small></div>
    </div>
    ${last ? `<blockquote>“${msgText(last)}”</blockquote>` : ''}
    ${a ? `<p class="next-line"><i class="fa-regular fa-calendar"></i>${t('coach.nextAppt', { day: dayLabel(a.date), time: a.time })}</p>` : ''}
    <div class="row-btns">${btn(`<i class="fa-regular fa-comment"></i>${t('coach.msg')}${unread('coach') ? ` <em class="badge">${unread('coach')}</em>` : ''}`, 'nav', { v: S.plan === 'premium' ? 'inbox' : 'messages' })}${big ? '' : btn(t('coach.view'), 'nav', { v: 'coach' }, 'alt')}</div>`, 'coach-card');
}

function feedbackCard(n) {
  const l = S.feedback.slice(-(n || 1)).reverse();
  return card(t('fb.h'), l.length ? l.map(f => `<div class="fb"><small>${dayLabel(f.date)} · ${wName((S.logs.find(x => x.id === f.lid) || {}).type || 'full')}</small><p>“${t(f.k, f.v)}”</p></div>`).join('') : `<p class="muted">${t('fb.none')}</p>`);
}

function apptCard() {
  const a = nextAppt();
  return card(t('appt.h'), a ? `<div class="appt"><b>${t('appt.' + a.kind)}</b><p>${dayLabel(a.date)} · ${a.time}</p><small><i class="fa-solid fa-location-dot"></i>${t('loc.private')}</small></div>
    <div class="row-btns">${btn(t('appt.res'), 'apptRes', { id: a.id }, 'alt')}${btn(t('appt.cancel'), 'apptCancel', { id: a.id }, 'alt')}</div>` :
    `<p class="muted">${t('appt.none')}</p>${btn(t('appt.book'), 'apptBook')}`);
}

/* ---------- views ---------- */
const V = {};

V.home = () => {
  if (S.plan === 'premium') return V.overview();
  const s = todaySession();
  let h = reminderBanner() + missedCards();
  if (S.plan === 'coach') {
    h += `<div class="grid2">${todayCard(s)}${coachCard()}</div><div class="grid3">${stayCard()}${feedbackCard()}${apptCard()}</div>`;
  } else {
    h += `<div class="grid2">${todayCard(s)}${stayCard()}</div>`;
  }
  h += weekStrip() + `<div class="grid2">${nextUpCard()}${S.plan === 'self' ? goalsMini() : card(t('rv.h'), reviewBody(true))}</div>`;
  return h;
};

V.overview = () => {
  const s = todaySession(), w = weekStats(0), c = consistency(...weekOf(0)), n = nutritionScore();
  const gp = S.goals.length ? Math.round(S.goals.reduce((a, g) => a + goalProg(g).p, 0) / S.goals.length * 100) : 0;
  const prs = prsIn(weekOf(0)[0], tk()).length;
  const tiles = `<div class="tiles">${tile(w.done + '/' + w.planned, t('ov.training'), 'fa-dumbbell')}${tile(c == null ? '–' : c + '%', t('ov.consistency'), 'fa-calendar-check')}${tile(gp + '%', t('ov.goals'), 'fa-bullseye')}${tile(n == null ? '–' : n + '%', t('ov.nutrition'), 'fa-bowl-food')}${tile('+' + prs, t('ov.prs'), 'fa-medal')}</div>`;
  const inbox = S.msgs.filter(m => !m.read && m.from !== 'me').slice(-3).reverse();
  const inboxCard = card(t('inbox.priority'), inbox.length ? `<ul class="list">${inbox.map(m => `<li class="unread"><div><b>${t('inbox.' + m.cat)}</b><small>${msgText(m)}</small></div>${btn(t('open'), 'openInbox', { cat: m.cat }, 'sm alt')}</li>`).join('')}</ul>` : `<p class="muted">${t('inbox.clear')}</p>`);
  return reminderBanner() + missedCards() +
    `<div class="grid2">${todayCard(s)}${card(t('ov.week'), tiles)}</div>
     <div class="grid2">${card(t('rec.h'), recommendations())}${inboxCard}</div>
     <div class="grid3">${coachCard()}${recoveryCard()}${card(t('ach.h'), achievements(true), '', btn(t('all'), 'nav', { v: 'challenges' }, 'link'))}</div>` + weekStrip();
};

function recommendations() {
  const out = [], w = weekStats(0), tm = key(addDays(today(), 1));
  const due = w.list.filter(s => s.date < tk() || s.status === 'done');
  if (due.length && due.every(s => s.status === 'done')) out.push(['fa-circle-check', t('rec.allDone')]);
  const vol = off => { const [a, b] = weekOf(off); return S.logs.filter(l => l.date >= a && l.date <= b).reduce((s, l) => s + volume(l), 0); };
  const v0 = vol(0), v1 = vol(-1);
  if (v1 && v0 > v1) out.push(['fa-arrow-trend-up', t('rec.volume', { n: Math.round((v0 / v1 - 1) * 100) })]);
  if (!sessIn(tm, tm).length) out.push(['fa-moon', t('rec.rest')]);
  const lw = latestWeight(), days = lw ? -diffDays(lw.date) : 99;
  if (days >= 7) out.push(['fa-weight-scale', t('rec.weigh', { n: days }), btn(t('prog.logW'), 'logW', {}, 'sm')]);
  const nt = nutritionDay(tk()), tg = targets();
  if (new Date().getHours() >= 16 && nt.p < tg.p * 0.5) out.push(['fa-drumstick-bite', t('rec.protein', { n: tg.p - nt.p })]);
  const a = nextAppt();
  if (a && diffDays(a.date) <= 2) out.push(['fa-calendar', t('rec.appt', { day: dayLabel(a.date), time: a.time })]);
  if (!out.length) out.push(['fa-thumbs-up', t('rec.steady')]);
  return `<ul class="recs">${out.map(r => `<li><i class="fa-solid ${r[0]}"></i><span>${r[1]}</span>${r[2] || ''}</li>`).join('')}</ul>`;
}

function recoveryCard() {
  const w = weekStats(0), rest = 7 - new Set(w.list.map(s => s.date)).size;
  let next = null;
  for (let i = 0; i < 7; i++) { const k = key(addDays(today(), i)); if (!sessIn(k, k).length) { next = k; break; } }
  return card(t('recov.h'), `<div class="tiles two">${tile(rest, t('recov.days'), 'fa-moon')}${tile(next ? dayName(next) : '–', t('recov.next'), 'fa-bed')}</div><p class="muted small">${t('recov.note')}</p>`);
}

V.schedule = () => {
  const [a] = weekOf(schedWeek), T0 = tk();
  let rows = '';
  for (let i = 0; i < 7; i++) {
    const k = key(addDays(parse(a), i)), l = sessIn(k, k);
    rows += `<div class="day-row ${k === T0 ? 'is-today' : ''}"><div class="day-l"><b>${dayName(k, true)}</b><small>${shortDate(k)}</small></div>
      <div class="day-s">${l.length ? l.map(sessRow).join('') : `<div class="sess rest"><span><i class="fa-solid fa-moon"></i>${t('td.rest')}</span>${k >= T0 && canEdit() ? btn('<i class="fa-solid fa-plus"></i>' + t('sch.add'), 'addW', { date: k }, 'sm alt') : ''}</div>`}</div></div>`;
  }
  const tabs = `<div class="seg">${btn(t('sch.this'), 'schedWeek', { o: 0 }, schedWeek === 0 ? 'on' : '')}${btn(t('sch.next'), 'schedWeek', { o: 1 }, schedWeek === 1 ? 'on' : '')}</div>`;
  return missedCards() + card(t('sch.h'), `<div class="days">${rows}</div>`, '', tabs + (canEdit() ? btn('<i class="fa-solid fa-plus"></i>' + t('sch.addW'), 'addW', {}, 'sm') : '')) +
    (canEdit() ? card(t('sch.routine'), routineForm()) : '');
};

function sessRow(s) {
  const st = status(s), T0 = tk(), rq = pendingReq(s.id);
  let acts = '';
  if (st === 'planned' && s.date >= T0) {
    acts = canEdit() ? btn(t('sch.move'), 'move', { id: s.id }, 'sm alt') + btn(t('sch.time'), 'move', { id: s.id, only: 'time' }, 'sm alt') + btn(t('sch.cancel'), 'cancelS', { id: s.id }, 'sm alt')
      : rq ? `<span class="chip warn"><i class="fa-regular fa-hourglass"></i>${t('req.pending')}</span>` : btn(t('req.btn'), 'req', { id: s.id }, 'sm alt');
    if (s.date === T0) acts = btn('<i class="fa-solid fa-play"></i>' + t('td.start'), 'start', { id: s.id }, 'sm') + acts;
  } else if (st === 'missed' && canEdit()) acts = btn(t('sch.move'), 'move', { id: s.id }, 'sm alt');
  return `<div class="sess ${st}"><div><b>${wName(s.type)}</b><small>${s.time} · ${t('loc.' + TLOC[s.type])} · ${t('u.min', { n: duration(s.type) })}</small></div>
    <span class="st st-${st}">${t('st.' + st)}</span><div class="acts">${acts}</div></div>`;
}

function routineForm() {
  const m = monday(today()), types = typesFor();
  let rows = '';
  for (let i = 0; i < 7; i++) {
    const e = S.tpl.find(x => x.dow === i);
    rows += `<div class="r-row"><b>${dayName(key(addDays(m, i)), true)}</b>
      <select name="type${i}"><option value="">${t('td.rest')}</option>${types.map(ty => `<option value="${ty}" ${e && e.type === ty ? 'selected' : ''}>${wName(ty)}</option>`).join('')}</select>
      <input type="time" name="time${i}" value="${e ? e.time : '18:00'}" min="04:00" max="22:00"></div>`;
  }
  return `<p class="muted small">${t('sch.routineP')}</p><form data-form="tpl" class="routine">${rows}<button class="dbtn">${t('sch.saveR')}</button></form>`;
}

V.program = () => {
  const m = monday(today()), rq = S.reqs.slice().reverse().slice(0, 4);
  const days = S.tpl.slice().sort((a, b) => a.dow - b.dow).map(e => {
    const ex = TYPES[e.type].map(id => { const d = exDef(id), sg = suggest(id), u = UNIT[id] ? t(UNIT[id]) : t('u.reps');
      return `<tr><td><b>${t('ex.' + id)}</b><small>${t('ci.' + id)}</small></td><td>${d.sets} × ${d.lo === d.hi ? d.lo : d.lo + '–' + d.hi} ${u}</td><td>${d.rest}s</td><td>${sg.kg ? num(sg.kg) + ' kg' : t('u.bw')}</td></tr>`; }).join('');
    return `<details class="pday" ${e.dow === (today().getDay() + 6) % 7 ? 'open' : ''}><summary><b>${dayName(key(addDays(m, e.dow)), true)}</b><span>${wName(e.type)} · ${e.time}</span><i class="fa-solid fa-chevron-down"></i></summary>
      <div class="table-wrap"><table class="ptable"><thead><tr><th>${t('pg.ex')}</th><th>${t('pg.sets')}</th><th>${t('pg.rest')}</th><th>${t('pg.target')}</th></tr></thead><tbody>${ex}</tbody></table></div></details>`;
  }).join('');
  const [a, b] = weekOf(0), prog = card(t('pg.h', { p: t('prog.' + S.plan) }), `<p class="muted">${t('pg.sub', { c: coach().name, w: programWeek() })}</p>${days}`);
  if (S.plan === 'premium') return prog;
  return missedCards() + prog +
    `<div class="grid2">${card(t('sch.this'), `<div class="days">${sessIn(a, b).map(sessRow).join('') || `<p class="muted">${t('next.none')}</p>`}</div>`, '', btn(t('req.btn'), 'req', {}, 'sm'))}
    ${card(t('req.h'), rq.length ? `<ul class="list">${rq.map(r => `<li><div><b>${t('req.item', { day: dayName(r.date, true), time: r.time })}</b><small>${esc(r.note || '')}</small></div><span class="st st-${r.status}">${t('req.' + r.status)}</span></li>`).join('')}</ul>` : `<p class="muted">${t('req.none')}</p>`)}</div>`;
};

V.progress = () => {
  const prem = S.plan === 'premium', days = prem ? range : 90;
  const from = key(addDays(today(), -days)), T0 = tk();
  const w30 = consistency(key(addDays(today(), -30)), T0), wk = weekStats(0);
  const ranges = prem ? `<div class="seg">${[7, 30, 90, 180, 365].map(r => btn(t('rg.' + r), 'range', { r }, range === r ? 'on' : '')).join('')}</div>` : '';
  const tiles = `<div class="tiles">${tile(doneIn(from, T0), t('pr.done'), 'fa-dumbbell')}${tile(wk.done + '/' + wk.planned, t('pr.week'), 'fa-calendar-week')}${tile((w30 == null ? '–' : w30 + '%'), t('pr.month'), 'fa-calendar-check')}${tile(streak(), t('pr.streak'), 'fa-fire')}${tile(prsIn(from, T0).length, t('pr.prs'), 'fa-medal')}</div>`;
  const wts = S.weights.filter(x => x.date >= from).map(x => ({ k: x.date, y: x.kg }));
  const wGoal = S.goals.find(g => g.type === 'weight');
  const exs = [...new Set(S.logs.flatMap(l => l.sets.filter(s => EX[s.ex][0]).map(s => s.ex)))];
  if (!liftEx || !exs.includes(liftEx)) liftEx = exs.includes('bench') ? 'bench' : exs[0];
  const lift = liftEx ? S.logs.filter(l => l.date >= from).map(l => { const s = l.sets.filter(x => x.ex === liftEx); return s.length ? { k: l.date, y: Math.max(...s.map(x => x.kg)) } : null; }).filter(Boolean) : [];
  const weeksN = Math.max(8, Math.ceil(days / 7)), wb = [];
  for (let i = Math.min(weeksN, 52) - 1; i >= 0; i--) {
    const [a, b] = weekOf(-i);
    const vol = S.logs.filter(l => l.date >= a && l.date <= b).reduce((s, l) => s + volume(l), 0);
    wb.push({ l: shortDate(a), v: doneIn(a, b), vol, tip: t('ch.weekOf', { d: shortDate(a) }) + ' · ' + doneIn(a, b), hl: i === 0 });
  }
  const sel = liftEx ? `<select data-chg="liftEx">${exs.map(e => `<option value="${e}" ${e === liftEx ? 'selected' : ''}>${t('ex.' + e)}</option>`).join('')}</select>` : '';
  const m = S.measures[S.measures.length - 1];
  const meas = m ? `<div class="tiles four">${['waist', 'chest', 'hips', 'arm'].map(f => tile(num(m[f]) + ' cm', t('ms.' + f))).join('')}</div><p class="muted small">${t('ms.last', { d: shortDate(m.date) })}</p>` : `<p class="muted">${t('ms.none')}</p>`;
  const prs = Object.keys(EX).filter(e => EX[e][0] && best(e)).map(e => { let d = ''; const b = best(e); S.logs.forEach(l => l.sets.forEach(s => { if (s.ex === e && s.kg === b && !d) d = l.date; })); return { e, b, d }; }).sort((x, y) => y.d < x.d ? -1 : 1).slice(0, 6);
  let h = card('', ranges + tiles, 'flat') +
    `<div class="grid2">${card(t('pr.weight'), lineChart(wts, { unit: 'kg', ref: wGoal ? wGoal.target : null, refLabel: t('pr.goal'), label: t('pr.weight') }), '', btn(t('prog.logW'), 'logW', {}, 'sm'))}
    ${card(t('pr.strength'), lineChart(lift, { unit: 'kg', label: t('pr.strength') }), '', sel)}</div>
    <div class="grid2">${card(t('pr.freq'), barChart(wb.slice(-(prem ? Math.min(52, weeksN) : 12)).map(b => ({ l: b.l, v: b.v, tip: b.tip, hl: b.hl })), { label: t('pr.freq') }))}
    ${card(t('pr.meas'), meas, '', btn(t('ms.add'), 'addMeas', {}, 'sm'))}</div>`;
  if (prem) {
    const mo = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(today().getFullYear(), today().getMonth() - i, 1), a = key(d), b = key(new Date(d.getFullYear(), d.getMonth() + 1, 0)); const c = consistency(a, b); mo.push({ l: fmt(a, { month: 'short' }), v: c || 0, tip: fmt(a, { month: 'long' }) + ' · ' + (c == null ? '–' : c + '%'), hl: i === 0 }); }
    h += `<div class="grid2">${card(t('pr.volume'), barChart(wb.slice(-Math.min(52, weeksN)).map(b => ({ l: b.l, v: Math.round(b.vol), tip: t('ch.weekOf', { d: b.l }) + ' · ' + num(b.vol, 0) + ' kg', hl: b.hl })), { label: t('pr.volume') }))}
      ${card(t('pr.monthly'), barChart(mo, { label: t('pr.monthly') }))}</div>
      ${card(t('pr.goalsH'), S.goals.map(g => { const p = goalProg(g); return `<div class="goal-mini"><div><b>${goalTitle(g)}</b><small>${p.txt} · ${Math.round(p.p * 100)}%</small></div>${bar(p.p)}</div>`; }).join('') || `<p class="muted">${t('goal.none')}</p>`)}`;
  }
  return h + card(t('pr.records'), prs.length ? `<ul class="list">${prs.map(p => `<li><div><b>${t('ex.' + p.e)}</b><small>${shortDate(p.d)}</small></div><span class="tag big">${num(p.b)} kg</span></li>`).join('')}</ul>` : `<p class="muted">${t('ch.empty')}</p>`);
};

V.goals = () => card(t('goal.h'), S.goals.length ? S.goals.map(g => { const p = goalProg(g); return `<div class="goal"><div class="goal-top"><div><b>${goalTitle(g)}</b><small>${p.txt}</small></div><span class="pct">${Math.round(p.p * 100)}%</span>${btn('<i class="fa-regular fa-trash-can"></i>', 'goalDel', { id: g.id }, 'icon')}</div>${bar(p.p, p.p >= 1 ? 'ok' : '')}${p.p >= 1 ? `<small class="okt"><i class="fa-solid fa-trophy"></i>${t('goal.reached')}</small>` : ''}</div>`; }).join('') : `<p class="muted">${t('goal.none')}</p>`,
  '', btn('<i class="fa-solid fa-plus"></i>' + t('goal.add'), 'goalAdd', {}, 'sm'));

V.week = () => {
  const off = weekSel === 'this' ? 0 : -1, w = weekStats(off), c = consistency(w.a, w.b > tk() ? tk() : w.b);
  const gains = prsIn(w.a, w.b), done = S.goals.filter(g => goalProg(g).p >= 1), missed = w.list.filter(s => status(s) === 'missed' || s.status === 'skipped');
  const [na, nb] = weekOf(off + 1);
  const tabs = `<div class="seg">${btn(t('wr.this'), 'weekSel', { w: 'this' }, weekSel === 'this' ? 'on' : '')}${btn(t('wr.last'), 'weekSel', { w: 'last' }, weekSel === 'last' ? 'on' : '')}</div>`;
  const allDone = w.planned && w.done >= w.planned;
  const coachFb = S.plan !== 'self' ? `<div class="fb big"><img src="${coach().img}" alt=""><div><small>${t('coach.name', { c: coach().name })}</small><p>“${t(allDone ? 'wr.fb.all' : w.done ? 'wr.fb.some' : 'wr.fb.none', { name: S.profile.first })}”</p></div></div>` : '';
  const upd = S.plan !== 'self' ? `<span class="chip"><i class="fa-solid fa-pen"></i>${t('wr.updated', { c: coachFirst() })}</span>` : '';
  return card(t('wr.h'), `<div class="tiles">${tile(w.done + ' / ' + w.planned, t('wr.workouts'), 'fa-dumbbell')}${tile(c == null ? '–' : c + '%', t('ov.consistency'), 'fa-calendar-check')}${tile(gains.length ? '+' + num(gains[0].gain) + ' kg' : '–', gains.length ? t('ex.' + gains[0].ex) : t('wr.strength'), 'fa-arrow-trend-up')}${tile(streak(), t('pr.streak'), 'fa-fire')}</div>
    <p class="wr-msg">${allDone ? t('wr.great') : w.done ? t('wr.good', { n: w.done }) : t('wr.fresh')}</p>${coachFb}
    <div class="grid3 inner">
      <div><h4>${t('wr.gains')}</h4>${gains.length ? `<ul class="plain">${gains.map(g => `<li>+${num(g.gain)} kg · ${t('ex.' + g.ex)}</li>`).join('')}</ul>` : `<p class="muted small">${t('wr.noGains')}</p>`}</div>
      <div><h4>${t('wr.goals')}</h4>${done.length ? `<ul class="plain">${done.map(g => `<li><i class="fa-solid fa-trophy"></i> ${goalTitle(g)}</li>`).join('')}</ul>` : `<p class="muted small">${t('wr.noGoals')}</p>`}</div>
      <div><h4>${t('wr.missed')}</h4>${missed.length ? `<ul class="plain">${missed.map(s => `<li>${dayName(s.date, true)} · ${wName(s.type)}</li>`).join('')}</ul>` : `<p class="muted small">${t('wr.noMissed')}</p>`}</div>
    </div>`, '', tabs) +
    card(t('wr.next'), `${upd}<div class="days">${sessIn(na, nb).map(sessRow).join('') || `<p class="muted">${t('next.none')}</p>`}</div>`, '', canEdit() ? btn('<i class="fa-solid fa-plus"></i>' + t('sch.addW'), 'addW', { date: na }, 'sm') : btn(t('req.btn'), 'req', {}, 'sm'));
};

function reviewBody(short) {
  const obj = t('obj.' + S.goal), prev = (S.reviews || []).slice(-1)[0];
  const lw = latestWeight(), w0 = S.weights[0], c30 = consistency(key(addDays(today(), -30)), tk());
  const main = S.goal === 'build' || S.plan === 'self' ? 'bench' : 'squat', b0 = best(main, key(addDays(today(), -56))), b1 = best(main);
  const cur = `<div class="tiles three">${tile(lw && w0 ? (lw.kg - w0.kg > 0 ? '+' : '') + num(lw.kg - w0.kg) + ' kg' : '–', t('rv.weight'))}${tile(b0 && b1 ? '+' + num(b1 - b0) + ' kg' : '–', t('ex.' + main))}${tile(c30 == null ? '–' : c30 + '%', t('pr.month'))}</div>`;
  if (short) return `<div class="obj"><small>${t('rv.obj')}</small><b>${obj}</b></div><p class="muted">“${t('rv.rec.' + S.goal)}”</p>${cur}`;
  return `<div class="obj"><small>${t('rv.obj')}</small><b>${obj}</b></div>
    <div class="fb"><small>${t('rv.recH', { c: coachFirst() })}</small><p>“${t('rv.rec.' + S.goal)}”</p></div>
    <h4>${t('rv.current')}</h4>${cur}
    ${prev ? `<div class="fb prev"><small>${t('rv.prev', { d: shortDate(prev.date) })}</small><p>“${t(prev.k)}”</p></div>` : ''}
    <p class="muted small">${t('rv.nextObj')}: <b>${t('obj.next.' + S.goal)}</b></p>`;
}

V.coach = () => {
  const up = S.appts.filter(a => a.status === 'booked' && a.date >= tk()).sort(byDate), past = S.appts.filter(a => a.status === 'done').slice(-2);
  const appts = `<ul class="list">${up.map(a => `<li><div><b>${t('appt.' + a.kind)}</b><small>${dayLabel(a.date)} · ${a.time} · ${t('loc.private')}</small></div><div class="acts">${btn(t('appt.res'), 'apptRes', { id: a.id }, 'sm alt')}${btn(t('appt.cancel'), 'apptCancel', { id: a.id }, 'sm alt')}</div></li>`).join('')}
    ${past.map(a => `<li class="past"><div><b>${t('appt.' + a.kind)}</b><small>${shortDate(a.date)} · ${a.time}</small></div><span class="st st-done">${t('st.done')}</span></li>`).join('')}</ul>`;
  let h = `<div class="grid2">${coachCard(true)}${card(t('appt.h'), (up.length ? '' : `<p class="muted">${t('appt.none')}</p>`) + appts, '', btn('<i class="fa-solid fa-plus"></i>' + t('appt.book'), 'apptBook', {}, 'sm'))}</div>
    <div class="grid2">${card(t('rv.h'), reviewBody())}${feedbackCard(4)}</div>`;
  if (S.plan === 'premium') h += V.program();
  return h;
};

function msgText(m) { return m.text != null ? esc(m.text) : t(m.k, m.v); }
function thread(cat) {
  const l = S.msgs.filter(m => m.cat === cat);
  let last = '';
  const body = l.map(m => {
    const d = m.date !== last ? `<div class="msg-day">${dayLabel(m.date)}</div>` : ''; last = m.date;
    return d + `<div class="bub ${m.from === 'me' ? 'me' : 'them'}${m.read ? '' : ' new'}">${m.from === 'coach' ? `<small>${coach().name}</small>` : m.from === 'kinih' ? '<small>KINIH</small>' : ''}${msgText(m)}<time>${m.time}</time></div>`;
  }).join('') + (cat === 'coach' && S.queue.some(q => q.kind !== 'appt') ? `<div class="bub them typing"><span></span><span></span><span></span></div>` : '');
  return `<div class="thread" id="thread">${body || `<p class="muted">${t('msg.empty')}</p>`}</div>`;
}
function composer() {
  return `<div class="quick">${btn(t('msg.ask'), 'msgQ')}${btn(t('msg.update'), 'msgProg')}</div>
    <form data-form="msg" class="composer"><input name="text" id="msgIn" autocomplete="off" placeholder="${esc(t('msg.ph', { c: coachFirst() }))}" required><button class="dbtn" aria-label="${esc(t('msg.send'))}"><i class="fa-solid fa-paper-plane"></i></button></form>`;
}
V.messages = () => {
  markRead('coach');
  return `<div class="grid2 wide-l">${card(t('msg.h', { c: coach().name }), thread('coach') + composer(), 'chat')}${coachCard(true)}</div>`;
};
V.inbox = () => {
  const cats = ['coach', 'appt', 'account'];
  const tabs = `<div class="seg">${cats.map(c => btn(t('inbox.' + c) + (unread(c) ? ` <em class="badge">${unread(c)}</em>` : ''), 'inboxTab', { c }, inboxTab === c ? 'on' : '')).join('')}</div>`;
  const out = card(t('nav.d.inbox'), thread(inboxTab) + (inboxTab === 'coach' ? composer() : ''), 'chat', tabs);
  markRead(inboxTab);
  return `<div class="grid2 wide-l">${out}${inboxTab === 'coach' ? coachCard(true) : apptCard()}</div>`;
};
function markRead(cat) {
  let ch = false;
  S.msgs.forEach(m => { if (m.cat === cat && !m.read) { m.read = true; ch = true; } });
  if (ch) { save(); setTimeout(updateBadges, 0); }
}

V.nutrition = () => {
  const k = key(addDays(today(), -nutDay)), n = nutritionDay(k), tg = targets(), water = S.water[k] || 0;
  const nav = `<div class="seg">${btn('<i class="fa-solid fa-chevron-left"></i>', 'nutDay', { d: 1 }, 'icon')}<span class="seg-l">${dayLabel(k)}</span>${btn('<i class="fa-solid fa-chevron-right"></i>', 'nutDay', { d: -1 }, 'icon' + (nutDay ? '' : ' off'))}</div>`;
  const macro = (f, l) => `<div class="macro"><div><b>${l}</b><small>${n[f]} / ${tg[f]} g</small></div>${bar(n[f] / tg[f])}</div>`;
  const meals = S.meals.filter(m => m.date === k).sort((a, b) => MEAL_HOUR[a.slot] - MEAL_HOUR[b.slot]);
  const week = [];
  for (let i = 6; i >= 0; i--) { const d = key(addDays(today(), -i)), x = nutritionDay(d); week.push({ l: dayName(d), v: x.kcal, p: x.p, tip: dayName(d, true) + ' · ' + num(x.kcal, 0) + ' kcal', hl: i === nutDay }); }
  return card('', `<div class="nut-top"><div class="kcal"><small>${t('nut.kcal')}</small><b>${num(n.kcal, 0)}</b><span>/ ${num(tg.kcal, 0)} kcal</span>${bar(n.kcal / tg.kcal)}<small class="muted">${n.kcal <= tg.kcal ? t('nut.left', { n: num(tg.kcal - n.kcal, 0) }) : t('nut.over', { n: num(n.kcal - tg.kcal, 0) })}</small></div>
      <div class="macros">${macro('p', t('nut.p'))}${macro('c', t('nut.c'))}${macro('f', t('nut.f'))}</div>
      <div class="water"><small>${t('nut.water')}</small><b>${num(water / 1000)} L</b><span>/ ${num(tg.w / 1000)} L</span>
        <div class="glasses">${Array.from({ length: tg.w / 250 }, (_, i) => `<i class="fa-solid fa-glass-water ${i < water / 250 ? 'on' : ''}"></i>`).join('')}</div>
        <div class="row-btns">${btn('−', 'water', { d: -250 }, 'sm alt')}${btn('+ 250 ml', 'water', { d: 250 }, 'sm')}</div></div></div>`, '', nav) +
    `<div class="grid2">${card(t('nut.meals'), meals.length ? `<ul class="list">${meals.map(m => `<li><div><b>${m.name != null ? esc(m.name) : t(m.k)}</b><small>${t('slot.' + m.slot)} · ${m.kcal} kcal · P ${m.p} g · C ${m.c} g · F ${m.f} g</small></div><div class="acts">${btn('<i class="fa-regular fa-pen-to-square"></i>', 'mealEdit', { id: m.id }, 'icon')}${btn('<i class="fa-regular fa-trash-can"></i>', 'mealDel', { id: m.id }, 'icon')}</div></li>`).join('')}</ul>` : `<p class="muted">${t('nut.none')}</p>`, '', btn('<i class="fa-solid fa-plus"></i>' + t('nut.log'), 'mealAdd', { date: k }, 'sm'))}
      ${card(t('nut.week'), barChart(week, { ref: tg.kcal, label: t('nut.week') }) + `<p class="muted small">${t('nut.weekNote', { n: num(tg.kcal, 0) })}</p>` + barChart(week.map(w => ({ l: w.l, v: w.p, tip: w.tip.split(' · ')[0] + ' · ' + w.p + ' g', hl: w.hl })), { ref: tg.p, label: t('nut.p') }) + `<p class="muted small">${t('nut.pNote', { n: tg.p })}</p>`)}</div>`;
};

V.body = () => {
  const w0 = S.weights[0], lw = latestWeight(), g = S.goals.find(x => x.type === 'weight');
  const m0 = S.measures[0], m1 = S.measures[S.measures.length - 1];
  const col = (h, w, waist, cls) => `<div class="tp ${cls || ''}"><small>${h}</small><b>${w != null ? num(w) + ' kg' : '–'}</b><span>${t('ms.waist')}: ${waist != null ? num(waist) + ' cm' : '–'}</span></div>`;
  const items = [];
  S.weights.forEach(x => items.push({ date: x.date, w: x.kg }));
  S.measures.forEach(x => { const it = items.find(i => i.date === x.date); if (it) it.m = x; else items.push({ date: x.date, m: x }); });
  S.photos.forEach(p => { const it = items.find(i => i.date === p.date); if (it) it.ph = p; else items.push({ date: p.date, ph: p }); });
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  const photos = S.photos.length ? `<div class="ph-cmp">${[S.photos[0], S.photos[S.photos.length - 1]].filter((p, i, a) => i === 0 || p !== a[0]).map((p, i) => `<figure><img src="${p.src}" alt=""><figcaption>${i ? t('tr.now') : t('tr.start')} · ${shortDate(p.date)}</figcaption></figure>`).join('')}</div>` : `<p class="muted small">${t('tr.noPhoto')}</p>`;
  return card(t('tr.h'), `<div class="tps">${col(t('tr.start') + (w0 ? ' · ' + shortDate(w0.date) : ''), w0 && w0.kg, m0 && m0.waist)}<i class="fa-solid fa-arrow-right-long"></i>${col(t('tr.now') + (lw ? ' · ' + shortDate(lw.date) : ''), lw && lw.kg, m1 && m1.waist, 'now')}<i class="fa-solid fa-arrow-right-long"></i>${col(t('tr.goal'), g ? g.target : null, null, 'goal')}</div>`, '', btn('<i class="fa-solid fa-plus"></i>' + t('tr.add'), 'addMeas', { full: 1 }, 'sm')) +
    `<div class="grid2">${card(t('pr.weight'), lineChart(S.weights.map(x => ({ k: x.date, y: x.kg })), { unit: 'kg', ref: g ? g.target : null, refLabel: t('pr.goal') }))}${card(t('tr.photos'), photos)}</div>` +
    card(t('tr.timeline'), `<ol class="timeline">${items.slice(0, 14).map(i => `<li><time>${shortDate(i.date)}</time><div>${i.w != null ? `<b>${num(i.w)} kg</b>` : ''}${i.m ? `<small>${t('ms.waist')} ${num(i.m.waist)} · ${t('ms.chest')} ${num(i.m.chest)} · ${t('ms.hips')} ${num(i.m.hips)} · ${t('ms.arm')} ${num(i.m.arm)} cm</small>` : ''}${i.ph ? `<img src="${i.ph.src}" alt="">` : ''}</div></li>`).join('')}</ol>`);
};

const CHALLENGES = {
  transform: { icon: 'fa-fire', days: 30, members: 142 },
  strength: { icon: 'fa-dumbbell', days: 42, members: 87 },
  consistency: { icon: 'fa-calendar-check', days: 28, members: 203 }
};
function chProgress(id, j) {
  const end = key(addDays(parse(j.joined), CHALLENGES[id].days - 1));
  if (id === 'transform') { const n = doneIn(j.joined, end); return { p: n / 16, txt: t('chl.t.p', { n }) }; }
  if (id === 'strength') { const b0 = best('bench', j.joined) || 1, b1 = best('bench'); const g = (b1 / b0 - 1) * 100; return { p: g / 5, txt: t('chl.s.p', { n: num(Math.max(0, g)) }) }; }
  let n = 0;
  for (let i = 0; i < 4; i++) { const a = key(addDays(monday(parse(j.joined)), 7 * i)); if (a > tk()) break; const w = sessIn(a, key(addDays(parse(a), 6))); const need = w.length; if (need && w.filter(s => s.status === 'done').length >= need) n++; else if (key(addDays(parse(a), 6)) < tk()) break; }
  return { p: n / 4, txt: t('chl.c.p', { n }) };
}
function achievements(mini) {
  const total = S.logs.length, prAny = Object.keys(EX).some(e => EX[e][0] && prsIn(S.start, tk()).length);
  const list = [
    ['fa-flag-checkered', 'ach.first', total >= 1], ['fa-dumbbell', 'ach.ten', total >= 10], ['fa-star', 'ach.fifty', total >= 50],
    ['fa-medal', 'ach.pr', prAny], ['fa-fire', 'ach.streak', streak() >= 14], ['fa-trophy', 'ach.challenge', Object.keys(S.challenges).some(id => chProgress(id, S.challenges[id]).p >= 1)]
  ];
  return `<div class="ach ${mini ? 'mini' : ''}">${list.map(a => `<div class="badge-a ${a[2] ? 'on' : ''}" data-tip="${esc(t(a[1]) + (a[2] ? '' : ' · ' + t('ach.locked')))}"><i class="fa-solid ${a[0]}"></i>${mini ? '' : `<small>${t(a[1])}</small>`}</div>`).join('')}</div>`;
}
V.challenges = () => `<div class="grid3">${Object.keys(CHALLENGES).map(id => {
  const c = CHALLENGES[id], j = S.challenges[id], pr = j ? chProgress(id, j) : null;
  return card('', `<div class="chl"><i class="fa-solid ${c.icon}"></i><h3 class="display">${t('chl.' + id)}</h3><p class="muted">${t('chl.' + id + '.d')}</p>
    <small class="muted"><i class="fa-solid fa-users"></i> ${t('chl.members', { n: c.members + (j ? 1 : 0) })} · ${t('chl.days', { n: c.days })}</small>
    ${pr ? `<div class="chl-p"><b>${Math.round(clamp(pr.p, 0, 1) * 100)}%</b><span>${pr.txt}</span></div>${bar(pr.p, pr.p >= 1 ? 'ok' : '')}<small class="muted">${t('chl.joined', { d: shortDate(j.joined) })}</small>${btn(t('chl.leave'), 'chLeave', { id }, 'alt sm')}` : btn(t('chl.join'), 'chJoin', { id })}</div>`);
}).join('')}</div>` + card(t('ach.h'), achievements()) + `<p class="muted small center">${t('chl.note')}</p>`;

V.settings = () => {
  const p = S.profile;
  return `<div class="grid2">${card(t('set.profile'), `<ul class="kv">
      <li><span>${t('set.name')}</span><b>${esc(p.first + ' ' + p.last)}</b></li><li><span>${t('set.id')}</span><b dir="ltr">${esc(p.id)}</b></li>
      <li><span>${t('j.f.email')}</span><b dir="ltr">${esc(p.email)}</b></li><li><span>${t('j.f.phone')}</span><b dir="ltr">${esc(p.phone)}</b></li>
      <li><span>${t('set.plan')}</span><b>${planName(S.plan)}</b></li>${S.plan !== 'self' ? `<li><span>${t('set.coach')}</span><b>${coach().name}</b></li>` : ''}
    </ul><p class="muted small">${t('set.pay')}</p>`)}
    ${card(t('set.rem'), `<label class="switch"><input type="checkbox" data-chg="notif" ${S.settings.notif ? 'checked' : ''}><span></span>${t('set.remOn')}</label>
      <label class="fld">${t('set.remWhen')}<select data-chg="remind">${[15, 30, 60, 120].map(m => `<option value="${m}" ${S.settings.remind === m ? 'selected' : ''}>${t('set.r' + m)}</option>`).join('')}</select></label>
      <p class="muted small">${t('set.remNote')}</p>`)}</div>
    <div class="grid2">${card(t('set.lang'), `<div class="seg">${['en', 'fr', 'ar'].map(l => btn(l.toUpperCase(), 'lang', { l }, lang === l ? 'on' : '')).join('')}</div>`)}
    ${card(t('set.demo'), `<p class="muted small">${t('set.demoP')}</p><div class="row-btns">${btn(t('set.fresh'), 'fresh', {}, 'alt')}${btn(t('set.logout'), 'logout', {}, 'alt')}</div>`)}</div>`;
};

/* ---------- shell ---------- */
const NAV = {
  self: ['home', 'schedule', 'progress', 'goals', 'week', 'settings'],
  coach: ['home', 'program', 'coach', 'messages', 'progress', 'week', 'settings'],
  premium: ['home', 'schedule', 'progress', 'nutrition', 'body', 'coach', 'inbox', 'challenges', 'week', 'settings']
};
const ICON = { home: 'fa-house', schedule: 'fa-calendar-days', program: 'fa-clipboard-list', progress: 'fa-chart-line', goals: 'fa-bullseye', week: 'fa-calendar-check', settings: 'fa-gear', coach: 'fa-user-tie', messages: 'fa-comments', inbox: 'fa-inbox', nutrition: 'fa-bowl-food', body: 'fa-person', challenges: 'fa-trophy' };
const bellN = () => (S.plan === 'premium' ? unread() : unread('coach'));
const badgeFor = v => (v === 'messages' ? unread('coach') : v === 'inbox' ? unread() : 0);
const navItem = (v, cls) => `<button class="${cls} ${view === v ? 'on' : ''}" data-act="nav" data-v="${v}"><i class="fa-solid ${ICON[v]}"></i><span>${t('nav.d.' + v)}</span>${badgeFor(v) ? `<em class="badge" data-badge="${v}">${badgeFor(v)}</em>` : ''}</button>`;

function greeting() {
  const h = new Date().getHours();
  return t(h < 12 ? 'hi.m' : h < 18 ? 'hi.a' : 'hi.e', { name: esc(S.profile.first) });
}

function render() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t('dash.title');
  const app = $('#app');
  if (!S) { app.innerHTML = welcome(); return; }
  ensureWeeks();
  const items = NAV[S.plan];
  if (!items.includes(view)) view = 'home';
  const tabs = items.slice(0, 4), more = items.slice(4);
  const bell = S.plan === 'self' ? '' : `<button class="bell" data-act="nav" data-v="${S.plan === 'premium' ? 'inbox' : 'messages'}" aria-label="${esc(t('nav.d.messages'))}"><i class="fa-regular fa-bell"></i>${bellN() ? `<em class="badge">${bellN()}</em>` : ''}</button>`;
  app.innerHTML = `
  <aside class="side">
    <a href="index.html" class="brand"><span class="brand-dot"></span>KINIH</a>
    <nav>${items.map(v => navItem(v, 'nav-i')).join('')}</nav>
    <div class="side-user"><b>${esc(S.profile.first + ' ' + S.profile.last)}</b><span class="plan-b p-${S.plan}">${planName(S.plan)}</span></div>
  </aside>
  <div class="main">
    ${S.demo ? `<div class="demo"><span><i class="fa-solid fa-flask"></i>${t('demo.bar')}</span><span class="demo-r">${t('demo.view')}<span class="seg sm">${['self', 'coach', 'premium'].map(p => btn(planName(p), 'plan', { p }, S.plan === p ? 'on' : '')).join('')}</span></span></div>` : ''}
    <header class="top">
      <div><small class="muted">${fmt(tk(), { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1 class="display">${view === 'home' ? greeting() : t('nav.d.' + view)}</h1></div>
      <div class="top-r"><div class="lang">${['en', 'fr', 'ar'].map(l => `<button data-act="lang" data-l="${l}" class="${lang === l ? 'active' : ''}">${l.toUpperCase()}</button>`).join('')}</div>${bell}</div>
    </header>
    <main class="view">${V[view]()}</main>
  </div>
  <nav class="tabbar">${tabs.map(v => navItem(v, 'tab')).join('')}<button class="tab ${more.includes(view) ? 'on' : ''}" data-act="more"><i class="fa-solid fa-ellipsis"></i><span>${t('more')}</span>${more.some(badgeFor) ? '<em class="badge dot"></em>' : ''}</button></nav>
  <div class="sheet ${sheet ? 'open' : ''}" data-act="sheetClose"><div class="sheet-in">${more.map(v => navItem(v, 'nav-i')).join('')}</div></div>`;
  const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight;
  scheduleNotif();
}
function updateBadges() {
  document.querySelectorAll('[data-badge]').forEach(b => { const n = badgeFor(b.dataset.badge); if (n) b.textContent = n; else b.remove(); });
  const bl = $('.bell .badge'); if (bl && !bellN()) bl.remove(); else if (bl) bl.textContent = bellN();
}

function welcome() {
  return `<div class="welcome"><a href="index.html" class="brand"><span class="brand-dot"></span>KINIH</a>
    <div class="welcome-in"><div class="label">${t('wl.label')}</div><h1 class="display">${t('wl.h')}</h1><p>${t('wl.p')}</p>
    <a href="membership.html#join" class="dbtn big">${t('wl.create')} <i class="fa-solid fa-arrow-right"></i></a>
    <div class="or">${t('wl.demo')}</div>
    <div class="row-btns center">${['self', 'coach', 'premium'].map(p => btn(planName(p), 'demo', { p }, 'alt')).join('')}</div>
    <div class="lang">${['en', 'fr', 'ar'].map(l => `<button data-act="lang" data-l="${l}" class="${lang === l ? 'active' : ''}">${l.toUpperCase()}</button>`).join('')}</div></div></div>`;
}

/* ---------- workout player ---------- */
function startWorkout(sid, type) {
  if (S.active && !confirm(t('wk.replace'))) { renderWk(); return; }
  const s = sid ? S.sessions.find(x => x.id === sid) : null;
  type = s ? s.type : type;
  S.active = { sid: s ? s.id : null, type, t0: Date.now(), restEnd: 0, restFor: '',
    items: TYPES[type].map(ex => { const d = exDef(ex), g = suggest(ex); return { ex, skipped: false, sets: Array.from({ length: d.sets }, () => ({ kg: g.kg, reps: g.reps, done: false })) }; }) };
  save(); renderWk();
}
function renderWk() {
  const w = S.active, el = $('#wk');
  if (!w) { el.innerHTML = ''; el.classList.remove('open'); document.body.classList.remove('lock'); clearInterval(restIv); return; }
  el.classList.add('open'); document.body.classList.add('lock');
  const cur = w.items.findIndex(i => !i.skipped && i.sets.some(s => !s.done));
  const items = w.items.map((it, i) => {
    const d = exDef(it.ex), last = lastSets(it.ex), g = suggest(it.ex), u = UNIT[it.ex] ? t(UNIT[it.ex]) : t('u.reps');
    const setsDone = it.sets.filter(s => s.done).length;
    const lastTxt = last ? `${last[0].kg ? num(last[0].kg) + ' kg × ' : ''}${last[0].reps} ${u}` : t('wk.first');
    const sugTxt = `${g.kg ? num(g.kg) + ' kg × ' : ''}${g.lo === g.hi ? g.lo : g.lo + '–' + g.hi} ${u}`;
    return `<div class="wk-ex ${it.skipped ? 'skipped' : ''} ${i === cur ? 'cur' : ''} ${!it.skipped && setsDone === it.sets.length ? 'complete' : ''}">
      <div class="wk-exh"><div><b>${t('ex.' + it.ex)}</b><small>${S.plan !== 'self' ? t('ci.' + it.ex) : t('wk.restFor', { n: d.rest })}</small></div><span class="tag">${setsDone}/${it.sets.length}</span></div>
      ${it.skipped ? `<p class="muted small">${t('wk.skipped')}</p>${btn(t('wk.undo'), 'wkUnskip', { i }, 'sm alt')}` : `
      <div class="wk-hint"><span><small>${t('wk.last')}</small>${lastTxt}</span><span><small>${t('wk.sug')}</small>${sugTxt}</span></div>
      <div class="sets"><div class="set h"><span>#</span><span>kg</span><span>${u}</span><span></span></div>
      ${it.sets.map((s, j) => `<div class="set ${s.done ? 'done' : ''}"><span>${j + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg}" data-chg="wkset" data-i="${i}" data-j="${j}" data-f="kg" aria-label="kg">
        <input type="number" inputmode="numeric" step="1" min="0" value="${s.reps}" data-chg="wkset" data-i="${i}" data-j="${j}" data-f="reps" aria-label="${esc(u)}">
        <button class="chk" data-act="wkDone" data-i="${i}" data-j="${j}" aria-label="${esc(t('wk.doneSet'))}"><i class="fa-solid fa-check"></i></button></div>`).join('')}</div>
      <div class="row-btns">${btn('<i class="fa-solid fa-plus"></i>' + t('wk.addSet'), 'wkAddSet', { i }, 'sm alt')}${btn('<i class="fa-solid fa-forward"></i>' + t('wk.skip'), 'wkSkip', { i }, 'sm alt')}</div>`}
    </div>`;
  }).join('');
  const others = Object.keys(EX).filter(e => !w.items.some(i => i.ex === e));
  el.innerHTML = `<div class="wk-in">
    <header class="wk-top"><button class="icon-b" data-act="wkClose" aria-label="${esc(t('wk.min'))}"><i class="fa-solid fa-chevron-down"></i></button>
      <div><small>${t('wk.now')}</small><b class="display">${wName(w.type)}</b></div><span class="elapsed" id="elapsed">00:00</span>
      <button class="dbtn sm" data-act="wkFinish">${t('wk.finish')}</button></header>
    <div class="wk-body">${items}
      <div class="wk-add"><select data-chg="wkAddEx"><option value="">+ ${t('wk.addEx')}</option>${others.map(e => `<option value="${e}">${t('ex.' + e)}</option>`).join('')}</select></div>
      <button class="dbtn big" data-act="wkFinish"><i class="fa-solid fa-flag-checkered"></i>${t('wk.finish')}</button>
      <button class="dbtn alt" data-act="wkDiscard">${t('wk.discard')}</button>
    </div>
    <div class="restbar ${w.restEnd > Date.now() ? 'on' : ''}" id="rest"><div><small>${t('wk.rest')}</small><b id="restT">0:00</b></div>
      ${btn('−15s', 'wkRest', { d: -15 }, 'sm alt')}${btn('+15s', 'wkRest', { d: 15 }, 'sm alt')}${btn(t('wk.skipRest'), 'wkRestSkip', {}, 'sm')}</div>
  </div>`;
  clearInterval(restIv);
  restIv = setInterval(tickWk, 500); tickWk();
}
function tickWk() {
  const w = S.active; if (!w) return;
  const e = Math.floor((Date.now() - w.t0) / 1000), el = $('#elapsed');
  if (el) el.textContent = (e >= 3600 ? Math.floor(e / 3600) + ':' : '') + pad(Math.floor(e / 60) % 60) + ':' + pad(e % 60);
  const r = $('#rest'), left = Math.ceil((w.restEnd - Date.now()) / 1000);
  if (!r) return;
  if (left > 0) { r.classList.add('on'); $('#restT').textContent = Math.floor(left / 60) + ':' + pad(left % 60); }
  else if (r.classList.contains('on')) { r.classList.remove('on'); w.restEnd = 0; toast(t('wk.restOver')); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
}
function finishWorkout() {
  const w = S.active, sets = [];
  w.items.forEach(it => { if (!it.skipped) it.sets.forEach(s => { if (s.done) sets.push({ ex: it.ex, kg: +s.kg || 0, reps: +s.reps || 0 }); }); });
  if (!sets.length) { if (confirm(t('wk.none'))) { S.active = null; save(); renderWk(); } return; }
  const date = tk(), prs = [];
  [...new Set(sets.map(s => s.ex))].forEach(ex => { const b = best(ex), top = Math.max(...sets.filter(s => s.ex === ex).map(s => EX[ex][0] ? s.kg : s.reps)); if (b && top > b && EX[ex][0]) prs.push({ ex, kg: top, gain: top - b }); });
  let s = w.sid ? S.sessions.find(x => x.id === w.sid) : null;
  if (!s) { s = { id: uid(), date, time: pad(new Date(w.t0).getHours()) + ':' + pad(new Date(w.t0).getMinutes()), type: w.type, status: 'done' }; S.sessions.push(s); S.sessions.sort(byDate); }
  s.status = 'done';
  const dur = Math.max(1, Math.round((Date.now() - w.t0) / 60000));
  const log = { id: uid(), date, type: w.type, sid: s.id, dur, sets };
  S.logs.push(log); S.active = null;
  if (S.plan !== 'self') S.queue.push({ due: Date.now() + 5000, kind: 'feedback', lid: log.id, pr: prs[0] || null });
  save(); renderWk(); render();
  const vol = volume(log);
  openModal(t('sum.h'), `<div class="sum"><i class="fa-solid fa-circle-check"></i><h3 class="display">${wName(w.type)}</h3>
    <div class="tiles three">${tile(t('u.min', { n: dur }), t('sum.dur'))}${tile(sets.length, t('sum.sets'))}${tile(num(vol, 0) + ' kg', t('sum.vol'))}</div>
    ${prs.length ? `<div class="prs">${prs.map(p => `<div><i class="fa-solid fa-medal"></i>${t('sum.pr', { ex: t('ex.' + p.ex), kg: num(p.kg), g: num(p.gain) })}</div>`).join('')}</div>` : ''}
    <p class="muted">${S.plan !== 'self' ? t('sum.coach', { c: coachFirst() }) : t('sum.self')}</p></div>`, null, t('ok'));
}

/* ---------- simulated coach ---------- */
function coachMsg(k, v, cat) {
  const d = new Date();
  S.msgs.push({ id: uid(), from: cat === 'coach' || !cat ? 'coach' : 'kinih', cat: cat || 'coach', date: tk(), time: pad(d.getHours()) + ':' + pad(d.getMinutes()), k, v, read: false });
}
function tickQueue() {
  if (!S || !S.queue || !S.queue.length) return;
  const now = Date.now(), due = S.queue.filter(q => q.due <= now);
  if (!due.length) return;
  S.queue = S.queue.filter(q => q.due > now);
  due.forEach(q => {
    if (q.kind === 'reply') coachMsg(q.k, q.v);
    if (q.kind === 'approve') {
      const r = S.reqs.find(x => x.id === q.rid); if (!r) return;
      const s = S.sessions.find(x => x.id === r.sid);
      const ok = toMin(r.time) >= toMin('06:00') && toMin(r.time) <= toMin('21:00');
      if (!ok) r.time = '18:00';
      r.status = ok ? 'approved' : 'modified';
      if (s) { s.date = r.date; s.time = r.time; s.movedBy = 'coach'; }
      else S.sessions.push({ id: uid(), date: r.date, time: r.time, type: r.type || S.tpl[0].type, status: 'planned' });
      S.sessions.sort(byDate);
      coachMsg(ok ? 'cr.approve' : 'cr.modify', { day: dayName(r.date, true), time: r.time });
    }
    if (q.kind === 'feedback') {
      const l = S.logs.find(x => x.id === q.lid); if (!l) return;
      const f = q.pr ? { k: 'fb.pr', v: { ex: t('ex.' + q.pr.ex), g: num(q.pr.gain) } } : { k: 'fb.good' };
      S.feedback.push({ lid: l.id, date: l.date, k: f.k, v: f.v });
      coachMsg(f.k, f.v);
    }
    if (q.kind === 'appt') coachMsg(q.k, q.v, 'appt');
  });

  save();
  toast(t('toast.coach', { c: coachFirst() }));
  if (!S.active) render();
}

function scheduleNotif() {
  clearTimeout(notifTimer);
  if (!S.settings.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
  const s = todaySession(); if (!s || s.status !== 'planned') return;
  const ms = (toMin(s.time) - S.settings.remind - nowMin()) * 60000 - new Date().getSeconds() * 1000;
  if (ms > 0 && ms < 864e5) notifTimer = setTimeout(() => { try { new Notification('KINIH', { body: t('rem.soon', { n: S.settings.remind }), icon: 'images/hero-equipment.png' }); } catch (e) {} }, ms);
}

/* ---------- modal, toast, tooltip ---------- */
function openModal(title, body, onSubmit, okLabel) {
  modalSubmit = onSubmit;
  $('#modal').innerHTML = `<div class="m-back" data-act="mClose"></div><form class="m-box" data-form="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="m-h"><h3>${title}</h3><button type="button" class="icon-b" data-act="mClose" aria-label="${esc(t('close'))}"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="m-b">${body}</div><div class="m-f">${onSubmit ? `<button type="button" class="dbtn alt" data-act="mClose">${t('cancel')}</button>` : ''}<button class="dbtn">${okLabel || t('save')}</button></div></form>`;
  $('#modal').classList.add('open');
  const f = $('#modal input:not([type=hidden]), #modal select'); if (f) setTimeout(() => f.focus(), 50);
}
function closeModal() { $('#modal').classList.remove('open'); $('#modal').innerHTML = ''; modalSubmit = null; }
let toastT;
function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }
const fld = (label, input) => `<label class="fld">${label}${input}</label>`;
const dayOptions = (sel, n) => { let o = ''; for (let i = 0; i < (n || 8); i++) { const k = key(addDays(today(), i)); o += `<option value="${k}" ${k === sel ? 'selected' : ''}>${dayLabel(k)}</option>`; } return o; };

/* ---------- actions ---------- */
const A = {};
A.nav = d => { view = d.v; sheet = false; render(); window.scrollTo(0, 0); };
A.more = () => { sheet = !sheet; render(); };
A.sheetClose = (d, el, e) => { if (e.target === el) { sheet = false; render(); } };
A.lang = d => { lang = d.l; try { localStorage.setItem('kinih_lang', lang); } catch (e) {} render(); if (S && S.active) renderWk(); };
A.demo = d => {
  const R = Math.random, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'KNH-'; for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(R() * chars.length));
  seed({ id, first: 'Salma', last: 'Benali', email: 'salma@example.com', phone: '06 12 34 56 78', plan: d.p, goal: d.p === 'coach' ? 'lose' : 'build', wa: true });
  save(); view = 'home'; render();
};
A.plan = d => { S.plan = d.p; S.tpl = defaultTpl(d.p, S.goal); applyTpl(); save(); view = 'home'; render(); toast(t('toast.plan', { p: planName(d.p) })); };
A.start = d => startWorkout(d.id);
A.startType = d => startWorkout(null, d.type);
A.schedWeek = d => { schedWeek = +d.o; render(); };
A.weekSel = d => { weekSel = d.w; render(); };
A.range = d => { range = +d.r; render(); };
A.inboxTab = d => { inboxTab = d.c; render(); };
A.openInbox = d => { inboxTab = d.cat; view = 'inbox'; render(); };
A.nutDay = d => { nutDay = clamp(nutDay + +d.d, 0, 6); render(); };
A.moveTo = d => { const s = S.sessions.find(x => x.id === d.id); s.date = d.date; if (d.date === tk() && toMin(s.time) < nowMin()) s.time = pad(Math.min(21, new Date().getHours() + 1)) + ':00'; S.sessions.sort(byDate); save(); render(); toast(t('toast.moved', { day: dayName(d.date, true), time: s.time })); };
A.skipS = d => { const s = S.sessions.find(x => x.id === d.id); s.status = 'skipped'; save(); render(); toast(t('toast.skipped')); };
A.cancelS = d => { if (!confirm(t('sch.cancelQ'))) return; S.sessions.find(x => x.id === d.id).status = 'cancelled'; save(); render(); };
A.notify = d => {
  const s = S.sessions.find(x => x.id === d.id);
  S.dismissed.push(s.id);
  S.msgs.push({ id: uid(), from: 'me', cat: 'coach', date: tk(), time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()), k: 'miss.auto', v: { day: dayName(s.date, true), w: wName(s.type) }, read: true });
  S.queue.push({ due: Date.now() + 4000, kind: 'reply', k: 'cr.missed', v: { name: S.profile.first } });
  save(); render(); toast(t('toast.notified', { c: coachFirst() }));
};
A.move = d => {
  const s = S.sessions.find(x => x.id === d.id), timeOnly = d.only === 'time';
  openModal(timeOnly ? t('sch.time') : t('sch.moveH', { w: wName(s.type) }),
    (timeOnly ? '' : fld(t('f.day'), `<select name="date">${dayOptions(s.date >= tk() ? s.date : tk())}</select>`)) + fld(t('f.time'), `<input type="time" name="time" value="${s.time}" min="04:00" max="22:00" required>`),
    f => { if (!timeOnly) s.date = f.date.value; s.time = f.time.value; S.sessions.sort(byDate); save(); render(); toast(t('toast.moved', { day: dayName(s.date, true), time: s.time })); });
};
A.addW = d => openModal(t('sch.addW'), fld(t('f.day'), `<select name="date">${dayOptions(d.date && d.date >= tk() ? d.date : tk(), 14)}</select>`) +
  fld(t('f.type'), `<select name="type">${typesFor().map(ty => `<option value="${ty}">${wName(ty)}</option>`).join('')}</select>`) + fld(t('f.time'), `<input type="time" name="time" value="18:00" min="04:00" max="22:00" required>`),
  f => { S.sessions.push({ id: uid(), date: f.date.value, time: f.time.value, type: f.type.value, status: 'planned' }); S.sessions.sort(byDate); save(); render(); toast(t('toast.added')); });
A.req = d => {
  const s = d.id ? S.sessions.find(x => x.id === d.id) : null;
  const opts = S.sessions.filter(x => x.status === 'planned' && x.date >= key(addDays(today(), -6))).sort(byDate);
  openModal(t('req.h2'), `<p class="muted small">${t('req.p', { c: coachFirst() })}</p>` +
    (s ? `<input type="hidden" name="sid" value="${s.id}"><p><b>${wName(s.type)}</b> · ${dayLabel(s.date)} · ${s.time}</p>` : fld(t('req.which'), `<select name="sid">${opts.map(x => `<option value="${x.id}">${dayLabel(x.date)} · ${wName(x.type)} · ${x.time}</option>`).join('')}</select>`)) +
    fld(t('req.new'), `<select name="date">${dayOptions(key(addDays(today(), 1)))}</select>`) + fld(t('f.time'), `<input type="time" name="time" value="10:00" required>`) +
    fld(t('req.note'), `<input name="note" placeholder="${esc(t('req.notePh'))}">`),
    f => {
      const r = { id: uid(), sid: f.sid.value, date: f.date.value, time: f.time.value, note: f.note.value.trim(), status: 'pending' };
      const ss = S.sessions.find(x => x.id === r.sid); if (ss) S.dismissed.push(ss.id);
      S.reqs.push(r);
      S.msgs.push({ id: uid(), from: 'me', cat: 'coach', date: tk(), time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()), k: 'req.msg', v: { w: ss ? wName(ss.type) : '', day: dayName(r.date, true), time: r.time, note: r.note ? ' ' + r.note : '' }, read: true });
      S.queue.push({ due: Date.now() + 6000, kind: 'approve', rid: r.id });
      save(); render(); toast(t('toast.req', { c: coachFirst() }));
    }, t('req.send'));
};
A.logW = () => { const w = latestWeight(); openModal(t('prog.logW'), fld(t('f.weight'), `<input type="number" name="kg" step="0.1" min="30" max="250" value="${w ? w.kg : ''}" required>`), f => { S.weights = S.weights.filter(x => x.date !== tk()); S.weights.push({ date: tk(), kg: +f.kg.value }); save(); render(); toast(t('toast.saved')); }); };
A.addMeas = d => {
  const m = S.measures[S.measures.length - 1] || {}, full = !!d.full, w = latestWeight();
  openModal(full ? t('tr.add') : t('ms.add'), (full ? fld(t('f.weight'), `<input type="number" name="kg" step="0.1" min="30" max="250" value="${w ? w.kg : ''}">`) : '') +
    `<div class="f2">${['waist', 'chest', 'hips', 'arm'].map(f => fld(t('ms.' + f) + ' (cm)', `<input type="number" name="${f}" step="0.5" min="10" max="200" value="${m[f] || ''}">`)).join('')}</div>` +
    (full ? fld(t('tr.photo'), `<input type="file" name="photo" accept="image/*">`) + `<p class="muted small">${t('tr.photoNote')}</p>` : ''),
    async f => {
      const k = tk();
      if (full && f.kg.value) { S.weights = S.weights.filter(x => x.date !== k); S.weights.push({ date: k, kg: +f.kg.value }); }
      if (f.waist.value || f.chest.value) { S.measures = S.measures.filter(x => x.date !== k); S.measures.push({ date: k, waist: +f.waist.value || m.waist, chest: +f.chest.value || m.chest, hips: +f.hips.value || m.hips, arm: +f.arm.value || m.arm }); }
      if (full && f.photo.files[0]) { const src = await shrink(f.photo.files[0]); S.photos = S.photos.filter(x => x.date !== k); S.photos.push({ date: k, src }); }
      if (save()) toast(t('toast.saved')); render();
    });
};
function shrink(file) {
  return new Promise(res => {
    const img = new Image(), r = new FileReader();
    r.onload = () => { img.onload = () => { const s = Math.min(1, 420 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.72)); }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}
A.goalAdd = () => {
  const lift = Object.keys(EX).filter(e => EX[e][0]);
  openModal(t('goal.add'), fld(t('goal.type'), `<select name="type" data-chg="goalType">${['weight', 'freq', 'lift', 'count'].map(g => `<option value="${g}">${t('goal.ty.' + g)}</option>`).join('')}</select>`) +
    `<div class="g-ex" hidden>${fld(t('goal.ex'), `<select name="ex">${lift.map(e => `<option value="${e}">${t('ex.' + e)}</option>`).join('')}</select>`)}</div>` +
    fld(t('goal.target'), `<input type="number" name="target" step="0.5" min="1" required>`) + `<p class="muted small" id="gHint">${t('goal.h.weight')}</p>`,
    f => {
      const ty = f.type.value, tg = +f.target.value, g = { id: uid(), type: ty, target: tg };
      if (ty === 'weight') { const w = latestWeight(); g.start = w ? w.kg : tg; }
      if (ty === 'lift') { g.ex = f.ex.value; g.start = best(g.ex); }
      S.goals.push(g); save(); render(); toast(t('toast.goal'));
    });
};
A.goalDel = d => { if (!confirm(t('goal.delQ'))) return; S.goals = S.goals.filter(g => g.id !== d.id); save(); render(); };
function apptModal(a) {
  const kinds = S.plan === 'premium' ? ['pt', 'checkin'] : ['checkin'];
  openModal(a ? t('appt.res') : t('appt.book'), (a ? '' : fld(t('appt.kind'), `<select name="kind">${kinds.map(k => `<option value="${k}">${t('appt.' + k)}</option>`).join('')}</select>`)) +
    fld(t('f.day'), `<select name="date">${dayOptions(a ? a.date : key(addDays(today(), 1)), 14)}</select>`) +
    fld(t('f.time'), `<select name="time">${['07:00', '09:00', '12:00', '17:30', '19:00', '20:30'].map(x => `<option ${a && a.time === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`) + `<p class="muted small"><i class="fa-solid fa-location-dot"></i> ${t('loc.private')}</p>`,
    f => {
      if (a) { a.date = f.date.value; a.time = f.time.value; } else { a = { id: uid(), date: f.date.value, time: f.time.value, kind: f.kind.value, status: 'booked' }; S.appts.push(a); }
      S.queue.push({ due: Date.now() + 2500, kind: 'appt', k: 'ap.ok', v: { date: shortDate(a.date), time: a.time } });
      save(); render(); toast(t('toast.appt'));
    }, a ? t('appt.res') : t('appt.book'));
}
A.apptBook = () => apptModal(null);
A.apptRes = d => apptModal(S.appts.find(a => a.id === d.id));
A.apptCancel = d => { if (!confirm(t('appt.cancelQ'))) return; const a = S.appts.find(x => x.id === d.id); a.status = 'cancelled'; S.msgs.push({ id: uid(), from: 'kinih', cat: 'appt', date: tk(), time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()), k: 'ap.cancel', v: { date: shortDate(a.date), time: a.time }, read: true }); save(); render(); };
A.msgQ = () => { const i = $('#msgIn'); i.value = t('msg.qPrefix'); i.focus(); };
A.msgProg = () => {
  const w = weekStats(0), lw = latestWeight();
  sendMsg(t('msg.progAuto', { d: w.done, n: w.planned, w: lw ? num(lw.kg) + ' kg' : '–', s: streak() }), 'cr.prog');
};
function sendMsg(text, replyKey) {
  const d = new Date();
  S.msgs.push({ id: uid(), from: 'me', cat: 'coach', date: tk(), time: pad(d.getHours()) + ':' + pad(d.getMinutes()), text, read: true });
  S.queue.push({ due: Date.now() + 3500, kind: 'reply', k: replyKey || ('cr.' + (1 + Math.floor(Math.random() * 4))), v: { name: S.profile.first } });
  save(); render();
}
function mealModal(m, date) {
  openModal(m ? t('nut.edit') : t('nut.log'), fld(t('nut.name'), `<input name="name" required maxlength="60" value="${m ? esc(m.name != null ? m.name : t(m.k)) : ''}">`) +
    fld(t('nut.slot'), `<select name="slot">${Object.keys(MEALS).map(s => `<option value="${s}" ${m && m.slot === s ? 'selected' : ''}>${t('slot.' + s)}</option>`).join('')}</select>`) +
    `<div class="f2">${fld('kcal', `<input type="number" name="kcal" min="0" max="5000" required value="${m ? m.kcal : ''}">`)}${fld(t('nut.p') + ' (g)', `<input type="number" name="p" min="0" max="500" value="${m ? m.p : ''}">`)}${fld(t('nut.c') + ' (g)', `<input type="number" name="c" min="0" max="800" value="${m ? m.c : ''}">`)}${fld(t('nut.f') + ' (g)', `<input type="number" name="f" min="0" max="400" value="${m ? m.f : ''}">`)}</div>`,
    f => {
      const x = m || { id: uid(), date };
      Object.assign(x, { name: f.name.value.trim(), slot: f.slot.value, kcal: +f.kcal.value, p: +f.p.value || 0, c: +f.c.value || 0, f: +f.f.value || 0 });
      delete x.k;
      if (!m) S.meals.push(x);
      save(); render(); toast(t('toast.saved'));
    });
}
A.mealAdd = d => mealModal(null, d.date);
A.mealEdit = d => mealModal(S.meals.find(m => m.id === d.id));
A.mealDel = d => { if (!confirm(t('nut.delQ'))) return; S.meals = S.meals.filter(m => m.id !== d.id); save(); render(); };
A.water = d => { const k = key(addDays(today(), -nutDay)); S.water[k] = clamp((S.water[k] || 0) + +d.d, 0, 6000); save(); render(); };
A.chJoin = d => { S.challenges[d.id] = { joined: tk() }; save(); render(); toast(t('toast.joined')); };
A.chLeave = d => { if (!confirm(t('chl.leaveQ'))) return; delete S.challenges[d.id]; save(); render(); };
A.fresh = () => { if (!confirm(t('set.freshQ'))) return; blankStart(); save(); view = 'home'; render(); };
A.logout = () => { if (!confirm(t('set.logoutQ'))) return; try { localStorage.removeItem(LS); } catch (e) {} S = null; location.href = 'membership.html'; };
A.mClose = () => closeModal();
A.wkDone = d => {
  const it = S.active.items[d.i], s = it.sets[d.j];
  s.done = !s.done;
  if (s.done) S.active.restEnd = Date.now() + exDef(it.ex).rest * 1000;
  save(); renderWk();
};
A.wkAddSet = d => { const it = S.active.items[d.i], l = it.sets[it.sets.length - 1]; it.sets.push({ kg: l.kg, reps: l.reps, done: false }); save(); renderWk(); };
A.wkSkip = d => { S.active.items[d.i].skipped = true; save(); renderWk(); };
A.wkUnskip = d => { S.active.items[d.i].skipped = false; save(); renderWk(); };
A.wkRest = d => { const w = S.active; w.restEnd = Math.max(Date.now(), w.restEnd) + +d.d * 1000; save(); tickWk(); };
A.wkRestSkip = () => { S.active.restEnd = 0; save(); $('#rest').classList.remove('on'); };
A.wkClose = () => { $('#wk').classList.remove('open'); document.body.classList.remove('lock'); clearInterval(restIv); render(); };
A.wkFinish = () => finishWorkout();
A.wkDiscard = () => { if (!confirm(t('wk.discardQ'))) return; S.active = null; save(); renderWk(); render(); };
A.resume = () => renderWk();

const CHG = {
  liftEx: el => { liftEx = el.value; render(); },
  notif: el => {
    S.settings.notif = el.checked; save();
    if (el.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(scheduleNotif);
    scheduleNotif();
  },
  remind: el => { S.settings.remind = +el.value; save(); scheduleNotif(); },
  wkset: el => { S.active.items[el.dataset.i].sets[el.dataset.j][el.dataset.f] = +el.value; save(); },
  wkAddEx: el => { if (!el.value) return; const g = suggest(el.value); S.active.items.push({ ex: el.value, skipped: false, sets: Array.from({ length: exDef(el.value).sets }, () => ({ kg: g.kg, reps: g.reps, done: false })) }); save(); renderWk(); },
  goalType: el => { $('.g-ex').hidden = el.value !== 'lift'; $('#gHint').textContent = t('goal.h.' + el.value); }
};
const FORM = {
  modal: async f => { if (modalSubmit) { const fn = modalSubmit; await fn(f); } closeModal(); },
  msg: f => { const v = f.text.value.trim(); if (v) sendMsg(v); },
  tpl: f => {
    const tpl = [];
    for (let i = 0; i < 7; i++) if (f['type' + i].value) tpl.push({ dow: i, type: f['type' + i].value, time: f['time' + i].value || '18:00' });
    S.tpl = tpl; applyTpl(); save(); render(); toast(t('toast.routine'));
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !A[el.dataset.act]) return;
  if (el.dataset.act === 'sheetClose' && e.target !== el) return;
  e.preventDefault();
  A[el.dataset.act](el.dataset, el, e);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el); });
document.addEventListener('submit', e => { const f = e.target; if (FORM[f.dataset.form]) { e.preventDefault(); FORM[f.dataset.form](f); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

const tip = $('#tip');
const showTip = (el, x, y) => { tip.textContent = el.dataset.tip; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on'); };
document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); });
document.addEventListener('mousemove', e => { if (tip.classList.contains('on')) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; } });
document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) tip.classList.remove('on'); });
document.addEventListener('touchstart', e => { const el = e.target.closest('[data-tip]'); if (el && el.tagName === 'rect') { const p = e.touches[0]; showTip(el, p.clientX, p.clientY); clearTimeout(tip._t); tip._t = setTimeout(() => tip.classList.remove('on'), 1800); } }, { passive: true });

/* ---------- boot ---------- */
S = load();
try {
  const n = JSON.parse(localStorage.getItem(NEW) || 'null');
  if (n) { seed(n); localStorage.removeItem(NEW); save(); }
} catch (e) {}
// ?demo=self|coach|premium opens a demo account straight away (handy link to share with the client)
if (NAV[qs.get('demo')] && (!S || S.demo)) A.demo({ p: qs.get('demo') });
if (ICON[qs.get('view')]) view = qs.get('view');
if (S && S.active) setTimeout(renderWk, 0);
render();
setInterval(() => { tickQueue(); }, 1000);
setInterval(() => { if (S && !S.active && !$('#modal').classList.contains('open') && document.activeElement.tagName !== 'INPUT') render(); }, 60000);
})();
