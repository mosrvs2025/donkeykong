// Level layout for "The Lumen Seed". All gameplay coordinates are (s, y):
// s = distance along the route, y = height. Everything here is data; world.js renders it.
export const PATH_POINTS = [
  [-80, 0], [0, 0], [80, -6], [150, 12], [215, -18], [262, -80], [300, -140], [370, -168], [440, -150], [505, -175],
  [548, -240], [600, -292], [680, -305], [752, -272], [805, -212], [868, -180], [945, -196], [1015, -240], [1065, -305],
  [1135, -350], [1215, -342], [1280, -300], [1335, -240], [1410, -210], [1490, -226], [1560, -270], [1620, -330], [1660, -400],
];

export const O = 80; // path offset so level s=0 sits at the second control point

export function buildLevel() {
  const L = {
    solids: [], slopes: [], water: [], vines: [], bouncers: [], glims: [], shards: [], cages: [], enemies: [],
    grapples: [], updrafts: [], checkpoints: [], portals: [], blooms: [], totems: [], carts: [], chases: [],
    altar: null, cams: [], themes: [], banners: [], signs: [], hints: [],
    shrines: [], waystones: [], doors: [], echoes: [], trials: [], critters: [], blooms2: [], mossback: null, notices: [], bonds: [], finaleBlights: [], arenas: {}, currents: [], storms: [], bounds: [], blocks: [], hollows: [], spikes: [],
  };
  let id = 0;
  const solid = (s0, s1, y0, y1, mat = 'stone', extra = {}) => { const o = { id: id++, s0: s0 + O, s1: s1 + O, y0, y1, mat, ...extra }; L.solids.push(o); return o; };
  const ground = (s0, s1, y, mat = 'grass') => solid(s0, s1, y - 40, y, mat, { ground: true });
  const plat = (s0, s1, y, mat = 'wood', th = 1, extra = {}) => solid(s0, s1, y - th, y, mat, extra);
  const oneway = (s0, s1, y, mat = 'leaf') => solid(s0, s1, y - 0.5, y, mat, { oneway: true });
  const mplat = (s0, s1, y, ds, dy, period, mat = 'ruin', phase = 0) => solid(s0, s1, y - 0.8, y, mat, { move: { ds, dy, period, phase } });
  const collapse = (s0, s1, y, n, mat = 'plank') => { const w = (s1 - s0) / n; for (let i = 0; i < n; i++) solid(s0 + i * w + 0.08, s0 + (i + 1) * w - 0.08, y - 0.45, y, mat, { collapse: true }); };
  const slope = (s0, s1, ya, yb, mat = 'grass', extra = {}) => L.slopes.push({ s0: s0 + O, s1: s1 + O, ya, yb, mat, ...extra });
  const water = (s0, s1, y0, y1) => L.water.push({ s0: s0 + O, s1: s1 + O, y0, y1 });
  const vine = (s, y, len) => L.vines.push({ s: s + O, y, len });
  const bouncer = (s, y, power = 24, kind = 'flower') => L.bouncers.push({ s: s + O, y, power, kind });
  const glim = (s, y) => L.glims.push({ s: s + O, y });
  const line = (s0, s1, y0, y1, n) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); glim(s0 + (s1 - s0) * t, y0 + (y1 - y0) * t); } };
  const arc = (s0, s1, y, h, n) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); glim(s0 + (s1 - s0) * t, y + Math.sin(t * Math.PI) * h); } };
  const ring = (s, y, r, n) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; glim(s + Math.cos(a) * r, y + Math.sin(a) * r); } };
  const shard = (s, y, idx, star = false) => L.shards.push({ s: s + O, y, idx, star });
  const cage = (kind, s, y) => L.cages.push({ kind, s: s + O, y });
  const enemy = (kind, s, y, range = 6, extra = {}) => L.enemies.push({ kind, s: s + O, y, range, ...extra });
  const grapple = (s, y) => L.grapples.push({ s: s + O, y });
  const updraft = (s0, s1, y0, y1) => L.updrafts.push({ s0: s0 + O, s1: s1 + O, y0, y1 });
  const checkpoint = (s, y) => L.checkpoints.push({ s: s + O, y });
  const portal = (s, y, ts, ty, kind) => L.portals.push({ s: s + O, y, ts: ts + O, ty, kind });
  const cam = (s0, s1, o) => L.cams.push({ s0: s0 + O, s1: s1 + O, ...o });
  const theme = (s0, t, name, sub) => { L.themes.push({ s: s0 + O, t }); if (name) L.banners.push({ s: s0 + O, name, sub }); };
  // hints fire inside an s-range AND a height band (default: the main route), so a tip for the ruins
  // never pops up while flying the Skyward Isles high above the same spot
  const hint = (s0, s1, text, cond, y0 = -60, y1 = 100) => L.hints.push({ s0: s0 + O, s1: s1 + O, text, cond, y0, y1 });

  // ───────────────────── A. THE ROOTWILD (jungle floor) ─────────────────────
  theme(-80, 0, 'The Rootwild', 'where the old roads sleep');
  cam(-40, 24, { dist: 24, height: 7, yaw: -0.28, fov: 48, look: 6 });
  ground(-60, 40, 0);
  hint(2, 18, 'Hold <b>Space</b> longer to jump higher', 'jump');
  line(10, 30, 1.2, 1.2, 6);
  ground(40, 70, 1.6);
  enemy('snapjaw', 56, 1.6, 8);
  hint(40, 60, 'Bounce on critters — or <b>Shift</b> to roll through them');
  ground(76, 225, 0);
  arc(69, 77, 2.2, 3, 5);
  bouncer(90, 0, 24);
  oneway(86, 100, 8);
  line(88, 98, 9, 9, 5);
  enemy('snapjaw', 106, 0, 7);
  enemy('spikeback', 118, 0, 5);
  hint(112, 124, 'Spikebacks can\'t be stomped. Jump over!');
  cage('beast', 132, 0);
  // Hollow mesa: cracked wall hides a relic room (needs the Horned Beast)
  solid(160, 190, 2.4, 3.3, 'stone');
  solid(160, 161.4, 0, 2.4, 'stone', { crack: 'beast' });
  solid(188.6, 190, 0, 2.4, 'stone');
  line(154, 159, 1, 1, 3);
  line(163, 176, 1.1, 1.1, 7);
  shard(182, 1.3, 0);
  line(165, 185, 4.6, 4.6, 6);
  checkpoint(196, 0);
  enemy('buzzmoth', 206, 3.2, 3);
  enemy('snapjaw', 214, 0, 6);
  // vine swing over the first chasm
  vine(233, 10.5, 7.4); vine(244, 11, 7.4); vine(255, 10.5, 7.4);
  hint(222, 234, 'Jump into vines to grab · press Space to let go');
  arc(226, 238, 5.5, 2.5, 5); arc(238, 249, 5.5, 2.5, 5); arc(249, 260, 5.5, 2.5, 5);
  solid(260, 300, -40, 3, 'bark');
  // climb the great tree
  cam(255, 305, { dist: 19, height: 6, fov: 52 });
  bouncer(272, 3, 26);
  oneway(277, 286, 5.8); oneway(288, 296, 8.5); oneway(277, 286, 11.2); oneway(288, 296, 13.9);
  line(272, 272, 6, 6, 1); line(272, 272, 9, 9, 1); glim(282, 12.4); glim(292, 15);

  // ───────────────────── B. CANOPY OF HANDS ─────────────────────
  theme(262, 1, 'Canopy of Hands', 'a thousand-year-old grove');
  cam(305, 440, { dist: 19, height: 2.5, fov: 50 });
  plat(296, 322, 16.6, 'bark', 1.4);
  enemy('snapjaw', 312, 16.6, 7);
  collapse(322, 344, 16.6, 9);
  line(324, 342, 18, 18, 7);
  hint(320, 330, 'The bridge won\'t hold. Keep moving!');
  plat(344, 374, 16.6, 'bark', 1.4);
  cage('frog', 356, 16.6);
  // secret high route: frog tongue grapples up to a hidden branch + sky portal
  grapple(378, 25); grapple(387, 30.5); grapple(396, 36);
  line(374, 378, 20, 23, 3);
  oneway(398, 422, 35.4, 'leaf');
  shard(410, 36.8, 1);
  portal(418, 37, 413, 201, 'sky');
  cam(398, 424, { dist: 24, height: 3, fov: 50, yMin: 30, yMax: 60 });
  // main route
  plat(380, 392, 15, 'bark', 1.2);
  enemy('snapjaw', 386, 15, 4);
  mplat(395, 400, 15.4, 0, 4, 3.6);
  mplat(403, 408, 17.4, 4, 0, 3.2);
  plat(414, 442, 18.6, 'bark', 1.4);
  cage('bird', 430, 18.6);
  checkpoint(420, 18.6);
  // bird gap: foot route across floating ruins, or soar up top
  cam(440, 520, { dist: 23, height: 5, fov: 52 });
  mplat(446, 451, 18.4, 5, 0, 3);
  mplat(461, 466, 17.4, 0, 3, 2.6, 'ruin', 1);
  collapse(472, 478, 18.2, 2, 'ruin');
  plat(484, 490, 16.2, 'ruin', 1); bouncer(485.3, 16.2, 22);
  plat(494, 500, 19.2, 'ruin', 1);
  mplat(505, 510, 18.4, 4, 0, 3, 'ruin', 0.5);
  enemy('buzzmoth', 460.5, 22.3, 0); enemy('buzzmoth', 470.6, 22.2, 0); enemy('buzzmoth', 466, 31, 1);
  line(457, 471, 29, 32, 5);
  updraft(450, 455, 17, 44); updraft(478, 483, 14, 44); updraft(500, 505, 14, 40);
  oneway(466, 478, 39, 'leaf');
  ring(472, 42.5, 2.2, 8);
  arc(452, 466, 36, 5, 7); arc(480, 500, 36, 6, 8);
  plat(516, 540, 17, 'bark', 1.4);
  slope(540, 580, 17, 2, 'grass');
  solid(540, 580, -40, 1.8, 'stone');
  line(545, 575, 16, 4, 8);

  // ───────────────────── C. WEEPING RUINS (river + waterfalls) ─────────────────────
  theme(560, 2, 'The Weeping Ruins', 'the river remembers');
  cam(580, 705, { dist: 18, height: 3.5, yaw: 0.14, fov: 52 });
  ground(580, 600, 2, 'ruin');
  checkpoint(586, 2);
  cage('fish', 595, 2);
  water(600, 705, -10, 0);
  ground(600, 705, -10, 'sand');
  hint(596, 610, 'Dive in! <b>↑↓</b> to swim · <b>Shift</b> to dash');
  const pillars = [[608, 614, 2.6], [620, 626, 3.2], [632, 638, 2.6], [644, 650, 3.4], [656, 662, 2.8], [668, 674, 3.4], [680, 686, 2.8], [692, 700, 3.2]];
  for (const [a, b, y] of pillars) plat(a, b, y, 'ruin', 1.1);
  enemy('buzzmoth', 629, 6, 1.5); enemy('buzzmoth', 653, 6.5, 1.5); enemy('snapjaw', 671, 3.4, 2);
  enemy('eel', 616, -5, 8); enemy('eel', 676, -6, 10);
  // sunken shrine: a barrier only the River Otter can burst
  solid(641, 662, -3.2, -2.2, 'ruin');
  solid(640, 641.5, -10, -3.2, 'ruin', { crack: 'swim' });
  solid(660.5, 662, -10, -3.2, 'ruin');
  line(626, 639, -6, -7.5, 5);
  line(644, 656, -8.5, -8.5, 6);
  shard(652, -8.3, 3);
  // cliff with a cave hidden behind the waterfall
  solid(700, 706, -40, 5.6, 'ruin');
  ground(706, 740, 0, 'ruin');
  solid(716, 740, 4, 11, 'cliff');
  oneway(707, 713, 8.3, 'ruin');
  solid(740, 792, -40, 11, 'cliff', { ground: true });
  line(718, 736, 1.1, 1.1, 8);
  shard(737, 1.4, 2);
  // signature mechanic #1: Echo Totem shifts the ruins
  cam(730, 850, { dist: 21, height: 5.5, fov: 52 });
  L.totems.push({ s: 752 + O, y: 11, group: 'e1' });
  hint(744, 766, 'Echo Totem — <b>slam</b> it (Shift in mid-air) to wake the ruins');
  solid(770, 775, 10.4, 11, 'glyph', { echo: { g: 'e1', dy: 2.6 } });
  solid(778, 783, 10.4, 11, 'glyph', { echo: { g: 'e1', dy: 5.2 } });
  solid(786, 791, 10.4, 11, 'glyph', { echo: { g: 'e1', dy: 7.8 } });
  solid(793, 812, -40, 21.4, 'cliff', { ground: true });
  checkpoint(798, 21.4);
  // signature mechanic #2: Lumen Bloom grows a bridge of light
  L.blooms.push({ s: 806 + O, y: 21.4, b0: 812 + O, b1: 848 + O, by: 21.4 });
  hint(800, 812, 'Lumen Bloom — touch it and run across the light!');
  line(814, 846, 23, 23, 9);
  plat(848, 858, 21.4, 'cliff', 3);
  slope(858, 900, 21.4, -5, 'cliff');
  solid(858, 900, -40, -6, 'cliff');
  cam(856, 902, { dist: 12, height: 2.5, yaw: -0.4, fov: 62, look: 6 });

  // ───────────────────── D. THE GLOWDEEP (cave) ─────────────────────
  theme(862, 3, 'The Glowdeep', 'something vast is breathing');
  cam(902, 1060, { dist: 14, height: 2.2, fov: 54 });
  ground(900, 962, -5, 'cave');
  solid(905, 965, 9, 40, 'cave');
  checkpoint(906, -5);
  cage('oru', 924, -5);
  hint(916, 932, 'An ancient Oru... it hums with inverted light');
  bouncer(944, -5, 22, 'shroom');
  enemy('spikeback', 936, -5, 3);
  line(940, 948, -1, 3, 4);
  // the great pit — foot route across pillars & shrooms
  solid(968, 972, -40, -3.5, 'cave'); bouncer(970, -3.5, 25, 'shroom');
  mplat(977, 982, -2.5, 6, 0, 3.4, 'crystal');
  solid(992, 997, -40, -1.5, 'cave');
  enemy('buzzmoth', 990.2, -0.9, 0);
  solid(1003, 1007, -40, -3.2, 'cave');
  ground(1012, 1060, -5, 'cave');
  // falling on purpose leads to a hidden grotto below
  ground(976, 1012, -22, 'cave');
  line(975, 978, -8, -18, 4);
  line(982, 1004, -21, -21, 9);
  enemy('snapjaw', 994, -22, 6);
  bouncer(1008, -22, 38, 'shroom');
  // ceiling with a hole: Oru's inverted gravity leads up into the Colossus
  solid(965, 990, 9, 12, 'cave');
  solid(1000, 1040, 9, 12, 'cave');
  solid(1040, 1062, 9, 40, 'cave');
  solid(960, 966, 12, 60, 'cave');
  solid(1040, 1046, 12, 60, 'cave');
  solid(960, 1046, 58, 64, 'cave');
  hint(955, 975, 'Riding Oru: <b>Shift</b> flips gravity', 'oru');
  line(990, 1000, 7, 7, 3);
  plat(1004, 1013, 35, 'crystal', 0.8);
  shard(1008.5, 37, 5, true);
  shard(1030, 55.5, 4);
  line(970, 1035, 56.5, 56.5, 14);
  ring(1022, 30, 3, 10);
  cam(962, 1044, { dist: 36, height: 0, fov: 55, yMin: 12.5, yMax: 60, lookY: 35 });

  // ───────────────────── E. SUNWRIGHT MINE (cart ride) ─────────────────────
  theme(1048, 4, 'Sunwright Mine', 'hold on tight');
  ground(1060, 1098, -5, 'mine');
  solid(1062, 1100, 9, 40, 'cave');
  checkpoint(1068, -5);
  enemy('snapjaw', 1078, -5, 5);
  L.carts.push({ s: 1090 + O, y: -5, endS: 1360 + O });
  hint(1082, 1094, 'Hop in the cart! Space to jump the gaps');
  const trk = (a, b, ya, yb) => slope(a, b, ya, yb, 'rail', { rail: true });
  trk(1098, 1130, -5, -5);
  trk(1130, 1170, -5, -18);
  trk(1170, 1190, -18, -15);
  trk(1204, 1235, -16, -24);
  trk(1235, 1245, -24, -20);
  trk(1262, 1292, -22, -22);
  trk(1292, 1302, -22, -18);
  trk(1320, 1360, -20, -20);
  arc(1190, 1204, -14, 5, 6); arc(1245, 1262, -19, 6, 7); arc(1302, 1320, -17, 6, 7);
  line(1135, 1165, -3, -15, 6); line(1265, 1290, -20, -20, 6);
  enemy('snapjaw', 1275, -22, 0.1);
  cam(1098, 1362, { dist: 9.5, height: 2.4, yaw: -0.62, fov: 70, look: 10, cart: true });

  // ───────────────────── F. HEART OF THE SEED (collapsing temple escape) ─────────────────────
  theme(1356, 5, 'Heart of the Seed', 'RUN');
  ground(1360, 1400, -20, 'temple');
  checkpoint(1366, -20);
  L.chases.push({ s0: 1374 + O, start: 1350 + O, end: 1500 + O, speed: 9.4 });
  cam(1368, 1502, { dist: 13, height: 3, yaw: 0.55, fov: 60, look: 2, chase: true });
  ground(1405, 1420, -18.6, 'temple');
  collapse(1420, 1436, -18.6, 5, 'temple');
  ground(1436, 1460, -18.6, 'temple');
  enemy('snapjaw', 1446, -18.6, 5);
  solid(1462, 1470, -40, -16.4, 'temple');
  solid(1475, 1500, -40, -16.4, 'temple');
  enemy('spikeback', 1488, -16.4, 3);
  line(1402, 1404, -17, -17, 1); arc(1459, 1476, -15, 3, 6);
  ground(1507, 1560, -16.4, 'temple');
  arc(1500, 1507, -14.5, 2.5, 4);
  L.altar = { s: 1538 + O, y: -16.4 };
  cam(1502, 1560, { dist: 17, height: 4.5, fov: 50 });

  // ───────────────────── BONUS: Sky Shrine ─────────────────────
  plat(404, 414, 201, 'cloud', 1.5); plat(418, 425, 203.5, 'cloud', 1.5); plat(429, 436, 206, 'cloud', 1.5); plat(440, 452, 204, 'cloud', 1.5);
  ring(416, 208, 3, 10); ring(433, 211, 3, 10); arc(404, 452, 203, 9, 16);
  bouncer(432, 206, 26);
  portal(450, 205.6, 425, 20.6, 'return');
  cam(390, 470, { dist: 26, height: 4, fov: 52, yMin: 150, yMax: 260 });


  // ═════════════════════ ROUND TWO: the world beneath the world ═════════════════════
  const moss = (s0, s1, y0, y1) => solid(s0, s1, y0, y1, 'moss', { moss: true });
  const ghost = (s0, s1, y, g) => solid(s0, s1, y - 0.6, y, 'ghost', { ghost: g });
  const shrine = (s, y, ability) => L.shrines.push({ s: s + O, y, ability });
  const waystone = (s, y, name) => L.waystones.push({ s: s + O, y, name });
  const echo = (s, y, idx) => L.echoes.push({ s: s + O, y, idx });
  const dawn = (s, y, d, size) => L.blooms2.push({ s: s + O, y, d, size });
  const notice = (s, y, kind, text) => L.notices.push({ s: s + O, y, kind, text });

  // Sunwright waystones: fast travel once lit
  waystone(14, 0, 'The Rootwild'); waystone(424, 18.6, 'Canopy of Hands'); waystone(583, 2, 'The Weeping Ruins');
  waystone(902, -5, 'The Glowdeep'); waystone(1064, -5, 'Sunwright Mine'); waystone(1362, -20, 'Heart of the Seed');
  // Awakening shrines
  shrine(201, 0, 'leap');   // Rootwild, before the vine chasm
  shrine(590, 2, 'song');   // Weeping Ruins riverbank
  shrine(913, -5, 'grip');  // Glowdeep
  // A sealed Sunwright door right at the start. It hums. You can't open it... yet.
  L.doors.push({ s: 27 + O, y: 0, ts: 54 + O, ty: -149.9 });
  hint(20, 34, 'A sealed door hums a melody you almost remember…', 'nosong');
  // A root wrapped in glowing moss — too sheer to climb, for now
  moss(101, 103, 3.4, 22);
  oneway(103, 119, 22, 'leaf');
  echo(112, 22, 0);
  line(104, 118, 23.5, 23.5, 5);
  // The sleeping Mossback lies at the bottom of the vine chasm
  L.mossback = { s: 234 + O, y: -7.2, toS: 251 + O, toY: 1.0, half: 6.5 };
  line(226, 231, -1, -5, 4);
  // Ghostwood: faint outlines above the canopy — only the Lumen Song makes them real
  ghost(297, 303, 19.9, 'g1'); ghost(306, 312, 23.2, 'g1'); ghost(297, 303, 26.5, 'g1'); ghost(306, 312, 29.8, 'g1');
  oneway(313, 334, 33.1, 'leaf');
  portal(331, 33.2, 296, 300.1, 'grove');
  line(314, 328, 34.5, 34.5, 5);
  // Wind Trial I — through the rings over the bird gap without touching ground, on foot
  L.trials.push({ id: 0, rings: [[445.2, 22.9], [452, 25.8], [456.5, 26.6], [464.9, 27.8], [468.6, 25.8], [474.8, 28.1], [480.1, 24.3], [486.8, 22.3]].map(([a, b]) => [a + O, b]), time: 6.5, reward: 'scarf' });
  // waterfall cave glyph
  echo(729, 0, 1);
  // Wind Trial II — across the Glowdeep pit
  L.trials.push({ id: 1, rings: [[962.7, -3], [966.4, -0.7], [972.4, 5.8], [976.9, 7.8], [983.7, 5.8], [988.2, 4.7], [994.4, 4.7], [999.6, 2.5]].map(([a, b]) => [a + O, b]), time: 6, reward: 'trail' });
  // Rootgrip lets you climb out of the low grotto
  moss(1011.2, 1012, -22, -5.2);
  // Colossus chamber glyph (on the slab above the ceiling)
  echo(978, 12, 5);
  // Temple: a mossy pillar before the altar leads to the last glyph
  moss(1512, 1514, -12.8, 6);
  oneway(1514, 1530, 6, 'temple');
  echo(1523, 6, 7);
  // critters that dash into secret places
  L.critters.push({ s: 148 + O, y: 0, toS: 161 + O }, { s: 700 + O, y: 5.6, toS: 722 + O, drop: 0 });
  // companion noticing
  notice(160, 1, 'beast', 'Grumbo snorts at the cracked stone. Something is behind it.');
  notice(378, 25, 'frog', 'Boing stares straight up, throat pulsing…');
  notice(641, -6, 'fish', 'Nuu chirps at the sealed stone under the water.');
  notice(995, 9, 'oru', 'Oru’s rings tilt toward the ceiling.');
  notice(472, 39, 'bird', 'Sola eyes the warm air high above.');
  notice(234, -6, 'beast', 'Grumbo peers down into the chasm and whuffs softly.');
  // dawnblooms: giant flowers that open as Kiri approaches
  for (const [a, y, d, sz] of [[6, 0, -5, 1.2], [34, 0, -6, 1.6], [84, 0, -5, 1.1], [120, 0, -7, 1.8], [190, 0, -5, 1.3], [300, 16.6, -4, 1], [440, 18.6, -4, 1.2], [583, 2, -5, 1.5], [720, 11, -7, 2], [800, 21.4, -5, 1.2], [1370, -20, -5, 1.4], [1540, -16.4, -6, 2]]) dawn(a, y, d, sz);

  // ───────────────────── HIDDEN WORLD: The Starwell ─────────────────────
  plat(50, 62, -150, 'glyph', 2);
  const stones = [[66, 70, -150], [74, 78, -148.8], [82, 86, -147.6], [90, 94, -148.8], [98, 102, -150]];
  for (const [a, b, y] of stones) plat(a, b, y, 'glyph', 0.8);
  plat(106, 124, -150, 'glyph', 2);
  water(40, 130, -172, -151);
  ground(40, 130, -172, 'cave');
  arc(62, 66, -149, 2, 3); arc(70, 74, -148, 2.5, 3); arc(78, 82, -147, 2.5, 3); arc(86, 90, -147, 2.5, 3); arc(94, 98, -148, 2.5, 3);
  ring(114, -144, 2.5, 10);
  echo(113, -150, 2);
  portal(121, -149.4, 30, 0.1, 'return');
  cam(30, 140, { dist: 22, height: 3, fov: 52, yMin: -190, yMax: -120 });
  // ───────────────────── HIDDEN WORLD: The Dreaming Grove ─────────────────────
  plat(288, 302, 300, 'grass', 2);
  plat(304, 310, 298.6, 'grass', 1); bouncer(307, 298.6, 28, 'flower');
  oneway(312, 326, 307.6, 'leaf');
  ring(319, 311.6, 2.2, 8);
  plat(329, 336, 305.5, 'grass', 1.2);
  plat(339, 350, 307, 'grass', 2);
  echo(342, 307, 4);
  portal(348, 307.6, 323, 33.2, 'return');
  line(290, 300, 301.5, 301.5, 5); arc(326, 339, 306, 3, 6);
  cam(270, 370, { dist: 20, height: 3.5, fov: 52, yMin: 250, yMax: 360 });
  // Trial echo glyphs appear when trials are won (idx 3 & 6), placed by the trial system

  // ═════════════════════ ROUND THREE: bonds, Hollowjaw, and the Colossus ═════════════════════
  const bond = (s, y, kind) => L.bonds.push({ s: s + O, y, kind });
  // Grumbo's bond: a cracked wall just behind where Kiri wakes up
  solid(-24, -22.6, 0, 3.2, 'stone', { crack: 'beast' });
  solid(-46, -22.6, 3.2, 4.4, 'stone');
  solid(-47.4, -46, 0, 3.2, 'stone');
  line(-6, -20, 1, 1, 5);
  bond(-36, 0, 'beast');
  notice(-20, 1, 'beast', 'Grumbo snorts at the wall behind where Kiri woke. He remembers something.');
  // Boing's bond: hookblooms above the ghostwood, only a tongue can reach the perch
  grapple(317, 26); grapple(322, 34.5);
  oneway(328, 338, 41, 'leaf');
  bond(333, 41, 'frog');
  notice(316, 30, 'frog', 'Boing’s throat puffs. Hookblooms, high above the ghostwood!');
  // Sola's bond: the cloud perch above the bird gap
  bond(472, 39, 'bird');
  // Nuu's bond: sealed at the bottom of the Starwell lake
  solid(99, 100.5, -172, -165, 'glyph', { crack: 'swim' });
  solid(100.5, 113, -165, -164, 'glyph');
  solid(113, 114.5, -172, -165, 'glyph');
  bond(107, -172, 'fish');
  notice(95, -160, 'fish', 'Nuu dives and circles — there is a seal on the lakebed.');
  // Oru's bond: on the mine ceiling, where no one looks
  bond(1086, 6.4, 'oru');
  notice(1070, 0, 'oru', 'Oru hums at the mine ceiling.');
  // Hollowjaw lives in the Glowdeep pit
  L.hollowjaw = { s0: 958 + O, s1: 1014 + O, base: -26, peak: 6, period: 5.2 };
  cam(955, 1016, { dist: 19, height: 2, fov: 56, yMax: 12 });

  // ───────────────────── FINALE: the Colossus climb (appears when the Seed is taken) ─────────────────────
  const F = { finale: true };
  const fplat = (s0, s1, y, mat = 'colossus', th = 1.2) => solid(s0, s1, y - th, y, mat, F);
  const fone = (s0, s1, y) => solid(s0, s1, y - 0.5, y, 'colossus', { ...F, oneway: true });
  const fmoss = (s0, s1, y0, y1) => solid(s0, s1, y0, y1, 'moss', { ...F, moss: true });
  const blight = (s0, s1, y0, y1) => { const b = solid(s0, s1, y0, y1, 'blight', { ...F, crack: 'song' }); L.finaleBlights.push(b); };
  L.palm = { s: 1547 + O, y: -16.4, toY: 14, half: 5 };
  // the forearm
  fmoss(1553, 1555, 14, 30);
  fplat(1555, 1575, 30);
  blight(1561, 1563, 30, 38);
  bouncer(1572, 30, 25, 'shroom'); L.bouncers[L.bouncers.length - 1].finale = true;
  fone(1558, 1568, 39.5);
  // ghostwood to the shoulder
  solid(1548, 1557, 39.9, 40.5, 'ghost', { ghost: 'g2', finale: true });
  fplat(1538, 1548, 40.5);
  fmoss(1536, 1538, 40.5, 58);
  fplat(1522, 1538, 58);
  blight(1528, 1530, 58, 65);
  // the swinging hand sweeps across the shoulder lane (y 58–61)
  L.hand = { s0: 1490 + O, s1: 1545 + O, y: 58, period: 6.5 };
  fplat(1514, 1520, 61.3); fone(1523, 1529, 64.6); fone(1514, 1520, 67.9);
  fplat(1526, 1548, 71);
  // the face
  fmoss(1548, 1550, 71, 90);
  fplat(1550, 1566, 90);
  blight(1556, 1558, 90, 97);
  bouncer(1563, 90, 32, 'shroom'); L.bouncers[L.bouncers.length - 1].finale = true;
  fplat(1536, 1560, 104, 'colossus', 2);
  L.crown = { s: 1548 + O, y: 104 };
  L.finaleCps = [[1548, 14], [1563, 39.5], [1530, 58.1], [1538, 71], [1553, 90]].map(([a, b]) => ({ s: a + O, y: b }));
  // Boing's gift: hookblooms that skip the shoulder (only if Kiri and Boing are bonded)
  L.grapples.push({ s: 1553 + O, y: 48, bondOnly: 'frog' }, { s: 1545 + O, y: 57, bondOnly: 'frog' }, { s: 1537 + O, y: 66, bondOnly: 'frog' });
  cam(1500, 1580, { dist: 26, height: 3, fov: 55, yMin: 5, yMax: 130 });

  // ═════════════════════ ROUND FOUR: levels, boss arenas, and two new worlds ═════════════════════
  // Boss arenas float in their own pocket of the world (y ≈ 450), one per area.
  const arena = (id, sc, mat, wall, extra = {}) => {
    const y = 450;
    ground(sc - 32, sc + 32, y, mat);
    solid(sc - 35, sc - 32, y, y + 40, wall); solid(sc + 32, sc + 35, y, y + 40, wall);
    L.arenas[id] = { id, s: sc + O, y, w: 32, ...extra };
    cam(sc - 40, sc + 40, { dist: 24, height: 4, fov: 54, yMin: 420, yMax: 520 });
    return y;
  };
  arena('bramble', 264, 'grass', 'bark');
  arena('skyreaver', 535, 'bark', 'bark');
  const wy = arena('warden', 852, 'ruin', 'ruin');
  bouncer(852, wy, 23);
  const cy = arena('crawler', 1362, 'mine', 'cave');
  solid(1328, 1396, cy + 15, cy + 22, 'cave');

  // ───────────────────── THE SUNKEN SANCTUM (underwater world) ─────────────────────
  const U = -420;
  water(290, 772, -445, -333);
  ground(288, 774, U, 'sand');
  solid(288, 774, -334, -296, 'cave');
  solid(284, 290, -445, -296, 'cave'); solid(770, 776, -445, -296, 'cave');
  solid(320, 326, U, -404, 'cliff'); solid(346, 351, U, -398, 'cliff'); solid(360, 367, -352, -334, 'cliff');
  arc(300, 340, -392, 10, 9); line(340, 375, -372, -372, 7);
  enemy('eel', 338, -388, 9); enemy('jelly', 356, -378, 5); enemy('jelly', 370, -392, 6);
  checkpoint(302, U);
  solid(380, 382, U, -334, 'ruin', { crack: 'swim' });
  hint(372, 380, 'Tide Form — <b>Shift</b> to dash and burst the seal', null, -480, -250);
  // the current tunnel
  solid(400, 482, -392, -334, 'cliff'); solid(400, 482, U, -406, 'cliff');
  L.currents.push({ s0: 398 + O, s1: 484 + O, y0: -407, y1: -391, vs: 9, vy: 0 });
  line(402, 480, -399, -399, 14);
  enemy('jelly', 440, -399, 4);
  checkpoint(490, U);
  // the drowned temple
  for (const [a, h] of [[500, 18], [520, 26], [548, 22], [575, 30], [590, 16]]) solid(a, a + 3, U, U + h, 'ruin');
  solid(530, 545, -365, -362, 'ruin'); solid(556, 570, -380, -377, 'ruin');
  ring(538, -375, 3.5, 10); arc(548, 575, -372, 8, 8);
  enemy('eel', 560, -350, 12); enemy('jelly', 510, -370, 7); enemy('jelly', 585, -360, 8);
  L.currents.push({ s0: 596 + O, s1: 604 + O, y0: U, y1: -336, vs: 0, vy: 8 });
  // jellyfish garden
  for (const [a, b, r] of [[612, -380, 8], [626, -360, 10], [640, -392, 7], [654, -368, 9], [668, -384, 8], [680, -356, 7]]) enemy('jelly', a, b, r);
  line(610, 685, -372, -372, 12);
  checkpoint(688, U);
  L.arenas.angler = { id: 'angler', s: 730 + O, y: U, w: 36, water: true, gate: 694 + O };
  L.bounds.push({ id: 'angler', s0: 692 + O, s1: 694 + O, y0: -445, y1: -296 });
  cam(285, 780, { dist: 21, height: 2, fov: 56, yMin: -460, yMax: -300 });

  // ───────────────────── SKYWARD ISLES (flight world) ─────────────────────
  const Y = 800;
  const isle = (a, b, y) => plat(a, b, y, 'cloud', 2.5);
  isle(196, 214, Y); isle(240, 250, Y + 10); isle(282, 292, Y - 6); isle(330, 338, Y + 20); isle(378, 396, Y + 4);
  isle(440, 448, Y + 30); isle(500, 516, Y); isle(560, 568, Y + 16); isle(618, 636, Y + 4); isle(690, 700, Y + 24); isle(750, 766, Y + 8);
  checkpoint(386, Y + 4); checkpoint(627, Y + 4);
  for (const [a, b, c, d, vs, vy] of [[300, 362, Y - 12, Y + 30, 10, 0], [460, 540, Y + 2, Y + 50, 9, 2.5], [640, 700, Y - 10, Y + 12, 11, 0], [770, 810, Y - 10, Y + 40, 0, 6]])
    L.currents.push({ s0: a + O, s1: b + O, y0: c, y1: d, vs, vy, wind: true });
  for (const [a, b, r] of [[265, Y + 8, 3], [312, Y + 30, 3.5], [352, Y - 4, 3], [420, Y + 20, 4], [470, Y + 55, 3], [548, Y + 36, 4], [590, Y - 2, 3.5], [660, Y + 30, 4], [720, Y + 6, 3], [735, Y + 40, 3.5]])
    L.storms.push({ s: a + O, y: b, r });
  for (const [a, b] of [[258, Y + 20], [300, Y + 12], [345, Y + 25], [410, Y + 12], [465, Y + 40], [520, Y + 20], [575, Y + 30], [650, Y + 12], [705, Y + 36]]) enemy('buzzmoth', a, b, 2);
  ring(230, Y + 25, 3, 8); arc(250, 330, Y + 15, 18, 14); ring(420, Y + 40, 3.5, 10); arc(500, 620, Y + 20, 25, 18); ring(600, Y + 60, 3, 8); arc(640, 760, Y + 15, 20, 16);
  L.arenas.heron = { id: 'heron', s: 858 + O, y: Y + 10, w: 40, sky: true, gate: 818 + O };
  L.bounds.push({ id: 'heron', s0: 815 + O, s1: 818 + O, y0: 740, y1: 900 }, { id: 'heron', s0: 900 + O, s1: 903 + O, y0: 740, y1: 900 });
  cam(190, 910, { dist: 26, height: 3, fov: 56, yMin: 740, yMax: 900 });

  // ═════════════════════ ROUND SEVEN: Lumen Blocks, thorn thickets and Root Hollows ═════════════════════
  const block = (s, y, item) => { const o = solid(s - 0.75, s + 0.75, y, y + 1.5, 'glyph', { block: item }); L.blocks.push(o); };
  const thorn = (s0, s1, y0, y1) => solid(s0, s1, y0, y1, 'thorn', { crack: 'fire' });
  const hollow = (s, y, game, name) => L.hollows.push({ s: s + O, y, game, name });
  // Rootwild: an Ember Bloom right at the start, and a thicket guarding a hollow
  block(27, 3.9, 'glims'); block(31, 3.9, 'ember'); block(35, 3.9, 'glims');
  block(136, 2.6, 'glims');
  plat(140, 150, 5, 'stone', 1);
  thorn(140, 141.4, 5, 8.6); thorn(148.6, 150, 5, 8.6);
  hollow(145, 5, 'glimstorm', 'Glimstorm');
  hint(126, 136, 'Brambles… something fiery could clear them.');
  // Canopy: a Frost Lily, and a hollow by the waystone
  block(306, 20.3, 'frost'); block(309, 20.3, 'glims');
  hollow(432, 18.6, 'skydrop', 'Sky Drop');
  // Ruins: a Bubble Wisp before the river, Echo Stones on the cliff
  block(588, 6.1, 'bubble');
  hollow(762, 11, 'echo', 'Echo Stones');
  block(760, 15.2, 'glims'); block(744, 15.2, 'frost');
  // Glowdeep & Mine: more fire for dark places, and a second Glimstorm hollow at night
  block(904, -1.1, 'ember');
  block(1072, -1.2, 'ember'); block(1075, -1.2, 'glims');
  hollow(1030, -5, 'glimstorm', 'Glimstorm at Night');

  L.start = { s: 4 + O, y: 0 };
  L.endS = 1560 + O;

  // ═════════════════════ THE THORNWELL: a deep, branching descent (Ori / Metroid style) ═════════════════════
  // Lives far below the Rootwild (y ≈ -600 … -740). Wall-cling shafts, thorn-lined walls, a hidden alcove.
  // spikes(box): touching the box hurts. dir is which way the thorns point (for the visuals).
  const spikes = (s0, s1, y0, y1, dir) => L.spikes.push({ s0: s0 + O, s1: s1 + O, y0, y1, dir });
  cam(26, 216, { dist: 18, height: 2.2, fov: 54, look: 2.5, yMin: -800, yMax: -560 });
  solid(22, 30, -790, -560, 'cave');                       // west wall
  solid(22, 104, -572, -562, 'cave');                      // ceiling of the upper hall
  // chamber 1: the mouth of the well
  solid(30, 60, -640, -600, 'cliff');
  checkpoint(40, -600);
  hint(31, 58, 'Hold toward a wall to <b>cling</b> · jump to kick off · keep holding toward it to climb', null, -800, -520);
  line(34, 56, -598.8, -598.8, 7);
  // shaft 1 (thorns on the west face: cling to the east wall)
  solid(65, 69, -640, -588, 'cave');
  spikes(60, 60.45, -632, -612, 'right');
  line(62.5, 62.5, -604, -634, 6);
  // chamber 2: the root hall
  solid(60, 96, -690, -640, 'cliff');
  checkpoint(74, -640);
  enemy('snapjaw', 80, -640, 5);
  spikes(84, 88, -640, -639.35, 'up'); arc(83, 89, -638.6, 3, 5);
  solid(90, 96, -640, -634, 'cliff');                       // a low step: kick off the far wall to hop it
  // the east wall has a hidden alcove high up: climb the bare wall with tight kicks
  solid(100, 104, -690, -616, 'cave'); solid(100, 104, -608, -572, 'cave');
  line(98.6, 98.6, -630, -618, 4);
  // shaft 2: two thorn shelves force you to switch walls on the way down
  solid(96, 98.2, -656, -654, 'cave'); spikes(96, 98.2, -654, -653.35, 'up');
  spikes(99.55, 100, -672, -660, 'left');
  solid(97.8, 100, -676, -674, 'cave'); spikes(97.8, 100, -674, -673.35, 'up');
  line(99, 99, -644, -652, 3); line(97, 97, -678, -686, 3);
  // chamber 3: the thorn tunnel
  solid(56, 90, -740, -690, 'cave'); solid(90, 150, -740, -700, 'cliff');
  solid(104, 160, -690, -572, 'cave');
  checkpoint(104, -700);
  solid(110, 126, -694, -690, 'cave'); spikes(110, 126, -694.65, -694, 'down');
  spikes(116, 120, -700, -699.35, 'up'); line(112, 124, -698.6, -698.6, 6);
  enemy('spikeback', 136, -700, 5); enemy('buzzmoth', 143, -696, 2);
  // the drop into the heart hollow
  solid(156, 160, -728, -690, 'cave');
  line(153, 153, -702, -736, 6);
  // chamber 4: the chimney out
  solid(150, 214, -780, -740, 'cliff'); solid(160, 214, -700, -572, 'cave');
  checkpoint(166, -740);
  line(168, 186, -738.8, -738.8, 6);
  solid(188, 192, -740, -722, 'cliff');
  solid(196, 214, -740, -719, 'cliff');
  spikes(192, 192.45, -736, -728, 'right');
  spikes(195.55, 196, -726, -720, 'left');
  line(194, 194, -737, -724, 4);
  line(200, 210, -717.8, -717.8, 5);
  return L;
}
