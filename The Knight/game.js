const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const asset = (folder, animation, frame) => `${folder}/${animation} (${frame}).png`;
const frames = (folder, animation, count) => Array.from({ length: count }, (_, index) => asset(folder, animation, index + 1));
const images = new Map();
const loadFrames = (folder, animation, count) => frames(folder, animation, count).map((src) => {
  if (!images.has(src)) { const image = new Image(); image.src = src; images.set(src, image); }
  return src;
});
const sprites = {
  knight: { Idle: loadFrames('Theknight', 'Idle', 10), Walk: loadFrames('Theknight', 'Walk', 10), Run: loadFrames('Theknight', 'Run', 10), Jump: loadFrames('Theknight', 'Jump', 10), Attack: loadFrames('Theknight', 'Attack', 10), JumpAttack: loadFrames('Theknight', 'JumpAttack', 10) },
  boss: { Idle: loadFrames('boss', 'Idle', 10), Run: loadFrames('boss', 'Run', 8), Dead: loadFrames('boss', 'Dead', 10) },
  enemy: { Idle: loadFrames('enemies/female', 'Idle', 15), Walk: loadFrames('enemies/female', 'Walk', 10), Attack: loadFrames('enemies/female', 'Attack', 8) },
  girl: { Idle: loadFrames('cutegirl', 'Idle', 16) }
};

const levelData = [
  { name: 'THE FIRST STEP', objective: 'Reach the eastern gate', hint: 'A / D to move  ·  SPACE to jump  ·  J to strike', sky: ['#273e40', '#75806f'], ground: '#283235', exit: 1160 },
  { name: 'THE OLD KEEP', objective: 'Cross the broken courtyard', hint: 'Mind the traps  ·  The checkpoint restores your courage', sky: ['#1b2932', '#756b61'], ground: '#252d31', exit: 1180 },
  { name: 'THE IRON THRONE', objective: 'Defeat the enemies guarding the throne and rescue the captive', hint: 'The final chamber is heavily guarded. Clear the path to the captive.', sky: ['#211e29', '#765c50'], ground: '#29262c', exit: 2700 }
];

const chapter3Encounters = [
  { id: 'entry-guards', label: 'FIRST GUARD GROUP', start: 260, checkpointX: 430, waves: [[{ x: 330, platform: 'c3-ground-a', hp: 2 }, { x: 540, platform: 'c3-ground-a', hp: 2 }, { x: 730, platform: 'c3-ground-b', hp: 2 }]] },
  { id: 'broken-hall', label: 'BROKEN HALL GUARDS', start: 900, checkpointX: 920, waves: [[{ x: 970, platform: 'c3-ground-c', hp: 2 }, { x: 1110, platform: 'c3-high-a', hp: 2 }, { x: 1290, platform: 'c3-high-b', hp: 2 }], [{ x: 1040, platform: 'c3-ground-c', hp: 2 }, { x: 1370, platform: 'c3-ground-c', hp: 2 }]] },
  { id: 'central-hall', label: 'CENTRAL HALL GUARDS', start: 1450, checkpointX: 1510, waves: [[{ x: 1510, platform: 'c3-ground-d', hp: 2 }, { x: 1660, platform: 'c3-high-c', hp: 2 }, { x: 1830, platform: 'c3-high-d', hp: 2 }], [{ x: 1580, platform: 'c3-ground-d', hp: 2 }, { x: 1770, platform: 'c3-ground-d', hp: 2 }]] },
  { id: 'throne-guards', label: 'THRONE GUARD FORMATION', start: 1900, checkpointX: 2040, waves: [[{ x: 1940, platform: 'c3-ground-d', hp: 2 }, { x: 2040, platform: 'c3-high-c', hp: 2 }, { x: 2160, platform: 'c3-throne-floor', hp: 3 }, { x: 2280, platform: 'c3-throne-floor', hp: 3 }]] }
];

const keys = new Set();
let spacePressed = false;
let level = 0;
let score = 0;
const maxHealth = 100;
let health = maxHealth;
let potions = 3;
let paused = false;
let won = false;
let lastTime = 0;
let cameraX = 0;
let cameraY = 0;
let toast = '';
let toastTimer = 0;

const player = { x: 90, y: 520, w: 58, h: 86, vx: 0, vy: 0, facing: 1, grounded: false, onLadder: false, doubleJumpAvailable: true, currentPlatformId: null, currentFloor: 1, attacking: 0, invuln: 0, animTime: 0 };
const world = { width: 1400, height: 720, platforms: [], traps: [], enemies: [], ladders: [], movingPlatforms: [], teleports: [], checkpoints: [], boss: null, girl: null, checkpoint: false, tower: false, towerFloor: 1 };

const towerFloors = [
  { label: 'ENTRY HALL', route: 'Find the upper passage', ladderX: 1080, platforms: [[0, 0, 400], [470, 0, 250], [800, -90, 300], [1080, -160, 140]] },
  { label: 'WATCH GALLERY', route: 'Pass the first patrol', ladderX: 190, platforms: [[0, 0, 300], [380, 0, 230], [690, -105, 220], [990, -40, 180]] },
  { label: 'SPIRE WORKS', route: 'Cross the spike gap', ladderX: 1050, platforms: [[0, 0, 250], [320, -100, 190], [650, -20, 150], [910, -135, 300]] },
  { label: 'BROKEN LIFT', route: 'Wait for the moving lift', ladderX: 260, checkpointX: 28, platforms: [[0, 0, 340], [720, -30, 210], [1010, -120, 170]] },
  { label: 'PRISON TURN', route: 'Choose the safe route', ladderX: 1060, platforms: [[0, 0, 230], [300, -70, 160], [560, -130, 170], [850, -30, 310]] },
  { label: 'BELL CHAMBER', route: 'Hold your ground', ladderX: 1060, platforms: [[0, 0, 270], [350, -70, 180], [650, -100, 180], [940, 0, 240]] },
  { label: 'ASH WALK', route: 'Thread the narrow platforms', ladderX: 210, platforms: [[0, 0, 260], [300, -90, 130], [500, -190, 130], [740, -70, 145], [980, -150, 190]] },
  { label: 'RAVEN PASS', route: 'Pick your way past the sentries', ladderX: 180, platforms: [[0, 0, 300], [400, -150, 170], [700, -60, 160], [960, -180, 220]] },
  { label: 'LAST RAMPART', route: 'One careful climb remains', ladderX: 1050, platforms: [[0, 0, 200], [280, -80, 150], [540, -170, 130], [780, -70, 150], [1020, -200, 180]] },
  { label: 'THE CROWN', route: 'Defeat the solo Warden', ladderX: 600, platforms: [[0, 0, 1280]] }
];

function resetPlayer(x = 90, y = 520, floor = 1) {
  player.x = x; player.y = y; player.vx = 0; player.vy = 0; player.facing = 1; player.grounded = false; player.onLadder = false; player.doubleJumpAvailable = true; player.currentPlatformId = null; player.currentFloor = floor; player.attacking = 0; player.invuln = 0; player.animTime = 0;
}
function towerBaseY(floor) { return 650 - (floor - 1) * 600; }
function addTowerPlatform(floor, x, relativeY, width, type = 'stone') {
  const id = `f${floor}-p${world.platforms.length}`;
  world.platforms.push({ id, floor, x, y: towerBaseY(floor) + relativeY, w: width, h: 24, type });
  return id;
}
function addTowerEnemy(floor, platformId, x, patrolMin, patrolMax, hp = 2) {
  const platform = world.platforms.find((item) => item.id === platformId);
  if (!platform) return;
  world.enemies.push({ x, y: platform.y - 76, w: 58, h: 76, hp, maxHp: hp, vx: 0, facing: -1, state: 'PATROL', stateTime: 0, patrolMin, patrolMax, platformId, floor, attackHit: false, attackCooldown: 0, animTime: 0, alive: true });
}
function buildTower() {
  world.tower = true; world.width = 1280; world.height = 6650; world.platforms = []; world.traps = []; world.enemies = []; world.ladders = []; world.movingPlatforms = []; world.teleports = []; world.checkpoints = []; world.boss = null; world.girl = null;
  towerFloors.forEach((floorData, index) => {
    const floor = index + 1;
    floorData.platforms.forEach(([x, relativeY, width]) => addTowerPlatform(floor, x, relativeY, width));
    const ladderHeight = floor === 3 ? 686 : 530;
    if (floor < 10 && ![3, 6, 8, 9].includes(floor)) world.ladders.push({ floor, x: floorData.ladderX, y: towerBaseY(floor) - ladderHeight, w: 54, h: ladderHeight, targetY: towerBaseY(floor + 1) - 86 });
    if (floor % 2 === 0) world.checkpoints.push({ floor, x: floorData.checkpointX ?? floorData.ladderX, y: towerBaseY(floor) - 35 });
    const floorPlatforms = world.platforms.filter((platform) => platform.floor === floor);
    if (floor > 1 && floor < 10) addTowerEnemy(floor, floorPlatforms[Math.min(1, floorPlatforms.length - 1)].id, floorPlatforms[Math.min(1, floorPlatforms.length - 1)].x + 52, floorPlatforms[Math.min(1, floorPlatforms.length - 1)].x + 20, floorPlatforms[Math.min(1, floorPlatforms.length - 1)].x + floorPlatforms[Math.min(1, floorPlatforms.length - 1)].w - 70, floor >= 6 ? 3 : 2);
    if ([6, 8, 9].includes(floor)) { const platform = floorPlatforms[floorPlatforms.length - 1]; addTowerEnemy(floor, platform.id, platform.x + 55, platform.x + 20, platform.x + platform.w - 70, 2); }
  });
  world.teleports.push({ floor: 3, x: 1050, y: towerBaseY(3) - 165, radius: 32, targetX: towerFloors[3].ladderX, targetY: towerBaseY(4) - 86, targetFloor: 4, targetOnLadder: true });
  world.teleports.push({ floor: 6, x: 100, y: towerBaseY(6) - 43, radius: 32, targetX: towerFloors[6].ladderX, targetY: towerBaseY(7) - 86, targetFloor: 7, targetOnLadder: true });
  world.teleports.push({ floor: 8, x: 1080, y: towerBaseY(8) - 215, radius: 32, targetX: 1080, targetY: towerBaseY(9) - 286, targetFloor: 9, targetOnLadder: false });
  world.teleports.push({ floor: 9, x: 100, y: towerBaseY(9) - 43, radius: 32, targetX: 850, targetY: towerBaseY(10) - 86, targetFloor: 10, targetOnLadder: false });
  world.movingPlatforms.push({ id: 'f4-lift', floor: 4, x: 445, y: towerBaseY(4) - 60, w: 170, h: 22, minY: towerBaseY(4) - 60, maxY: towerBaseY(4) + 90, phase: 0 });
  const addTrap = (floor, x, relativeY, w, type, options = {}) => world.traps.push({ floor, x, y: towerBaseY(floor) + relativeY, w, h: options.h || 22, type, ...options });
  addTrap(3, 250, -6, 125, 'spikes'); addTrap(3, 520, -106, 100, 'spikes');
  addTrap(7, 40, -6, 70, 'spikes'); addTrap(7, 410, -96, 82, 'spikes'); addTrap(7, 665, -196, 80, 'falling', { reset: 0 });
  addTrap(9, 200, -6, 78, 'spikes'); addTrap(9, 505, -176, 70, 'timed', { cycle: 2.2, phase: 1.1 }); addTrap(9, 785, -76, 75, 'spikes');
  world.boss = { x: 865, y: towerBaseY(10) - 150, w: 110, h: 150, hp: 12, maxHp: 12, vx: 0, facing: -1, state: 'PATROL', stateTime: 0, patrolMin: 28, patrolMax: world.width - 28 - 110, platformId: `f10-p${world.platforms.length - 1}`, floor: 10, attackHit: false, attackTimer: 1.5, animTime: 0, alive: true };
  resetPlayer(70, towerBaseY(1) - 86, 1); player.grounded = true; world.checkpoint = false; world.checkpointFloor = 1; cameraX = 0; cameraY = towerBaseY(1) - 180; updateHud();
}
function spawnTowerExitLadder() {
  if (world.ladders.some((ladder) => ladder.exit)) return;
  const chamberPlatformY = towerBaseY(10) - 90;
  const targetY = chamberPlatformY - 530;
  world.ladders.push({ floor: 10, x: 600, y: targetY, w: 54, h: 530, targetY, exit: true });
  toastMessage('THE WARDEN FALLS - CLIMB TO CHAPTER 03');
}
function buildLevel() {
  if (level === 1) { buildTower(); return; }
  world.tower = false; world.height = 720; world.ladders = []; world.checkpoints = []; world.movingPlatforms = []; world.teleports = [];
  const data = levelData[level];
  world.width = level === 0 ? 1400 : level === 2 ? 2850 : 1550;
  world.platforms = level === 2 ? [
    { id: 'c3-ground-a', x: 0, y: 630, w: 420, h: 90 }, { id: 'c3-ground-b', x: 500, y: 630, w: 350, h: 90 },
    { id: 'c3-ground-c', x: 900, y: 630, w: 520, h: 90 }, { id: 'c3-high-a', x: 970, y: 500, w: 200, h: 24 }, { id: 'c3-high-b', x: 1230, y: 420, w: 190, h: 24 },
    { id: 'c3-ground-d', x: 1480, y: 630, w: 510, h: 90 }, { id: 'c3-high-c', x: 1540, y: 500, w: 230, h: 24 }, { id: 'c3-high-d', x: 1810, y: 420, w: 220, h: 24 },
    { id: 'c3-throne-floor', x: 2040, y: 630, w: 760, h: 90 }, { id: 'c3-throne-high', x: 2180, y: 470, w: 260, h: 24 }
  ] : [{ id: 'platform-ground', x: 0, y: 630, w: world.width, h: 90 }, { id: 'platform-high-a', x: 270, y: 520, w: 160, h: 24 }, { id: 'platform-high-b', x: 560, y: 440, w: 190, h: 24 }, { id: 'platform-high-c', x: 875, y: 540, w: 180, h: 24 }];
  world.traps = level === 1 ? [{ x: 470, y: 612, w: 88, h: 18 }] : [];
  world.enemies = [];
  world.boss = level === 2 ? { x: 2470, y: 480, w: 110, h: 150, hp: 10, maxHp: 10, vx: 0, facing: -1, state: 'PATROL', stateTime: 0, patrolMin: 2320, patrolMax: 2630, platformId: 'c3-throne-floor', attackHit: false, attackCooldown: 0, animTime: 0, alive: false, active: false } : null;
  world.girl = level === 2 ? { x: 2710, y: 480, w: 74, h: 150, unlocked: false } : null;
  world.chapterEncounters = level === 2 ? chapter3Encounters.map((encounter) => ({ ...encounter, started: false, complete: false, waveIndex: -1 })) : [];
  if (level === 2) spawnAllChapterEnemies();
  world.chapterCheckpointX = 0; world.finalGateOpen = false; world.checkpoint = false; world.checkpointFloor = 0; resetPlayer(); cameraX = 0; cameraY = 0; updateHud();
}

function spawnChapterWave(encounter, announce = true) {
  const specs = encounter.waves[encounter.waveIndex] || [];
  specs.forEach((spec) => {
    const platform = world.platforms.find((item) => item.id === spec.platform);
    if (!platform) return;
    world.enemies.push({ x: spec.x, y: platform.y - 76, w: 58, h: 76, hp: spec.hp, maxHp: spec.hp, vx: 0, facing: -1, state: 'PATROL', stateTime: 0, patrolMin: platform.x + 20, patrolMax: platform.x + platform.w - 78, platformId: platform.id, floor: 3, encounterId: encounter.id, hitCooldown: 0, attackCooldown: 0, attackHit: false, animTime: 0, alive: true, active: true });
  });
  if (announce) toastMessage(`${encounter.label} / WAVE ${encounter.waveIndex + 1}`);
}

function spawnAllChapterEnemies() {
  world.chapterEncounters.forEach((encounter) => {
    encounter.waves.forEach((_, waveIndex) => {
      encounter.waveIndex = waveIndex;
      spawnChapterWave(encounter, false);
    });
    encounter.started = true;
    encounter.waveIndex = encounter.waves.length - 1;
  });
}

function updateChapter3Encounters() {
  if (level !== 2) return;
  world.chapterEncounters.forEach((encounter) => {
    if (encounter.complete) return;
    if (!encounter.started && player.x >= encounter.start) { encounter.started = true; encounter.waveIndex = 0; spawnChapterWave(encounter); }
    if (!encounter.started) return;
    const remaining = world.enemies.some((enemy) => enemy.alive && enemy.encounterId === encounter.id);
    if (!remaining && encounter.waveIndex < encounter.waves.length - 1) { encounter.waveIndex++; spawnChapterWave(encounter); return; }
    if (!remaining && encounter.waveIndex === encounter.waves.length - 1) { encounter.complete = true; world.chapterCheckpointX = encounter.checkpointX; world.checkpoint = true; toastMessage(`${encounter.label} CLEARED`); }
  });
  const throneGuardsCleared = world.chapterEncounters.every((encounter) => encounter.complete);
  if (throneGuardsCleared && !world.boss.active && !world.boss.alive) { world.boss.active = true; world.boss.alive = true; toastMessage('THE FINAL GUARDIAN APPROACHES'); }
}

function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function groundedOn(platform) { return player.y + player.h <= platform.y + 8 && player.y + player.h >= platform.y - 12 && player.x + player.w > platform.x && player.x < platform.x + platform.w && player.vy >= 0; }
function currentSprite(list, speed = 10) { return list[Math.floor(player.animTime * speed) % list.length]; }
function drawSprite(src, x, y, w, h, flip = false, alpha = 1) {
  const image = images.get(src);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + (flip ? w : 0), y); ctx.scale(flip ? -1 : 1, 1);
  if (image && image.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, w, h); else { ctx.fillStyle = '#c89c6b'; ctx.fillRect(w * .2, h * .15, w * .6, h * .7); }
  ctx.restore();
}
function drawTowerWorld() {
  ctx.save(); ctx.translate(-cameraX, -cameraY);
  ctx.fillStyle = '#182126'; ctx.fillRect(0, -5400, world.width, world.height + 5400);
  ctx.fillStyle = 'rgba(64, 72, 68, .55)'; ctx.fillRect(0, -5400, 26, world.height + 5400); ctx.fillRect(world.width - 26, -5400, 26, world.height + 5400);
  world.platforms.forEach((platform) => { ctx.fillStyle = '#4e5853'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h); ctx.fillStyle = 'rgba(215, 163, 75, .65)'; ctx.fillRect(platform.x, platform.y, platform.w, 4); });
  world.movingPlatforms.forEach((platform) => { ctx.fillStyle = '#6a7068'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h); ctx.fillStyle = '#d7a34b'; ctx.fillRect(platform.x, platform.y, platform.w, 4); });
  world.teleports.forEach((teleport) => { ctx.save(); ctx.translate(teleport.x, teleport.y); ctx.globalAlpha = .8; ctx.strokeStyle = '#52d9ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, teleport.radius + Math.sin(performance.now() / 180) * 4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(38, 184, 255, .22)'; ctx.beginPath(); ctx.arc(0, 0, teleport.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  world.ladders.forEach((ladder) => { ctx.strokeStyle = 'rgba(215, 163, 75, .65)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ladder.x + 10, ladder.y + ladder.h); ctx.lineTo(ladder.x + 10, ladder.y); ctx.moveTo(ladder.x + ladder.w - 10, ladder.y + ladder.h); ctx.lineTo(ladder.x + ladder.w - 10, ladder.y); for (let y = ladder.y + 18; y < ladder.y + ladder.h; y += 28) { ctx.moveTo(ladder.x + 10, y); ctx.lineTo(ladder.x + ladder.w - 10, y); } ctx.stroke(); });
  world.checkpoints.forEach((checkpoint) => { ctx.fillStyle = '#d7a34b'; ctx.fillRect(checkpoint.x, checkpoint.y - 110, 4, 110); ctx.fillStyle = '#d7a34b'; ctx.beginPath(); ctx.moveTo(checkpoint.x + 4, checkpoint.y - 106); ctx.lineTo(checkpoint.x + 40, checkpoint.y - 92); ctx.lineTo(checkpoint.x + 4, checkpoint.y - 78); ctx.fill(); });
  world.traps.forEach((trap) => {
    const active = trap.type !== 'timed' || Math.sin((performance.now() / 1000 + trap.phase) * Math.PI * 2 / trap.cycle) > .15;
    if (trap.type === 'spikes') { ctx.fillStyle = '#a34e45'; ctx.beginPath(); for (let x = trap.x; x < trap.x + trap.w; x += 16) { ctx.moveTo(x, trap.y + trap.h); ctx.lineTo(x + 8, trap.y); ctx.lineTo(x + 16, trap.y + trap.h); } ctx.fill(); }
    if (trap.type === 'timed' && active) { ctx.fillStyle = '#c85f4f'; ctx.fillRect(trap.x, trap.y, trap.w, trap.h); }
    if (trap.type === 'gate') { ctx.fillStyle = '#6b4037'; ctx.fillRect(trap.x, trap.y - trap.h, 12, trap.h); ctx.fillRect(trap.x + trap.w - 12, trap.y - trap.h, 12, trap.h); ctx.fillRect(trap.x, trap.y - trap.h, trap.w, 12); }
    if (trap.type === 'falling') { const dropY = trap.y - 130 + Math.abs(Math.sin(performance.now() / 900)) * 100; ctx.fillStyle = '#777164'; ctx.fillRect(trap.x, dropY, trap.w, 22); }
  });
  world.enemies.forEach((enemy) => { if (!enemy.alive) return; const animation = enemy.state === 'ATTACK' ? sprites.enemy.Attack : enemy.state === 'PATROL' ? sprites.enemy.Walk : sprites.enemy.Idle; drawSprite(animation[Math.floor(enemy.animTime * 8) % animation.length], enemy.x, enemy.y, enemy.w, enemy.h, enemy.facing < 0); if (enemy.state === 'ATTACK' && enemy.stateTime < .25) drawEnemySlash(enemy); });
  if (world.boss?.alive) { drawSprite(sprites.boss.Idle[Math.floor(world.boss.animTime * 8) % sprites.boss.Idle.length], world.boss.x, world.boss.y, world.boss.w, world.boss.h, world.boss.facing < 0); ctx.fillStyle = '#37262a'; ctx.fillRect(world.boss.x, world.boss.y - 22, world.boss.w, 8); ctx.fillStyle = '#c85f4f'; ctx.fillRect(world.boss.x, world.boss.y - 22, world.boss.w * (world.boss.hp / world.boss.maxHp), 8); if (world.boss.state === 'ATTACK') drawEnemySlash(world.boss); }
  const action = player.attacking > 0 ? (player.grounded ? 'Attack' : 'JumpAttack') : (Math.abs(player.vx) > 20 ? 'Run' : player.grounded ? 'Idle' : 'Jump');
  drawSprite(currentSprite(sprites.knight[action], action === 'Attack' ? 14 : 10), player.x, player.y, player.w, player.h, player.facing < 0, player.invuln > 0 && Math.floor(player.invuln * 14) % 2 === 0 ? .35 : 1);
  drawPlayerSlash();
  ctx.restore();
}
function drawEnemySlash(enemy) {
  ctx.save(); ctx.globalAlpha = Math.min(1, enemy.stateTime * 5); ctx.translate(enemy.facing > 0 ? enemy.x + enemy.w : enemy.x, enemy.y + 38); ctx.scale(enemy.facing > 0 ? 1 : -1, 1); ctx.beginPath(); ctx.arc(0, 0, 42, -Math.PI / 2, Math.PI / 2); ctx.lineWidth = 5; ctx.strokeStyle = '#d7a34b'; ctx.stroke(); ctx.restore();
}
function drawPlayerSlash() {
  if (player.attacking <= 0) return;
  const slashX = player.facing > 0 ? player.x + player.w - 4 : player.x + 4;
  ctx.save(); ctx.globalAlpha = Math.min(1, player.attacking * 4); ctx.translate(slashX, player.y + 40); ctx.scale(player.facing > 0 ? 1 : -1, 1); ctx.beginPath(); ctx.arc(0, 0, 48, -Math.PI / 2, Math.PI / 2); ctx.lineCap = 'round'; ctx.lineWidth = 13; ctx.strokeStyle = 'rgba(54, 221, 242, .22)'; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 48, -Math.PI / 2, Math.PI / 2); ctx.lineWidth = 5; ctx.strokeStyle = '#54e7f2'; ctx.stroke(); ctx.restore();
}
function drawBackground() {
  const data = levelData[level];
  const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, data.sky[0]); gradient.addColorStop(1, data.sky[1]); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  if (world.tower) {
    ctx.fillStyle = 'rgba(8, 12, 16, .55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(215, 163, 75, .12)';
    for (let x = 20; x < W; x += 180) { ctx.fillRect(x, 0, 2, H); ctx.fillRect(x + 70, 0, 1, H); }
    for (let y = -((cameraY * .2) % 180); y < H + 180; y += 180) { ctx.fillStyle = 'rgba(230, 224, 205, .1)'; ctx.fillRect(0, y, W, 2); }
    if (player.currentFloor === 10) { ctx.fillStyle = 'rgba(115, 72, 52, .22)'; ctx.fillRect(80, 70, W - 160, H - 110); ctx.strokeStyle = 'rgba(215, 163, 75, .28)'; ctx.lineWidth = 3; ctx.strokeRect(110, 90, W - 220, H - 150); }
    ctx.fillStyle = 'rgba(235, 224, 189, .16)'; ctx.beginPath(); ctx.arc(1060, 100, 52, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.fillStyle = 'rgba(9, 16, 20, .25)';
  for (let x = -((cameraX * .18) % 180) - 180; x < W + 180; x += 180) { ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x + 100, 250); ctx.lineTo(x + 210, 470); ctx.fill(); }
  ctx.fillStyle = 'rgba(235, 224, 189, .18)'; ctx.beginPath(); ctx.arc(1010, 105, 52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(230, 224, 205, .12)'; for (let i = 0; i < 28; i++) { const x = (i * 137 - cameraX * .3) % W; const y = 80 + (i * 71) % 210; ctx.fillRect(x, y, 2, 2); }
}
function drawWorld() {
  if (world.tower) { drawTowerWorld(); return; }
  ctx.save(); ctx.translate(-cameraX, 0);
  const data = levelData[level];
  world.platforms.forEach((platform, index) => { ctx.fillStyle = index === 0 ? data.ground : '#4e5853'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h); ctx.fillStyle = index === 0 ? 'rgba(218, 193, 135, .4)' : 'rgba(215, 163, 75, .6)'; ctx.fillRect(platform.x, platform.y, platform.w, 4); });
  if (level === 2) { ctx.fillStyle = 'rgba(32, 18, 28, .7)'; ctx.fillRect(2020, 300, 720, 330); ctx.fillStyle = '#5a403c'; ctx.fillRect(2350, 300, 260, 330); ctx.fillStyle = '#b88a4d'; ctx.fillRect(2410, 360, 140, 270); ctx.fillStyle = 'rgba(215, 163, 75, .2)'; ctx.fillRect(2390, 330, 180, 300); }
  world.traps.forEach((trap) => { ctx.fillStyle = '#8f423a'; ctx.beginPath(); for (let x = trap.x; x < trap.x + trap.w; x += 16) { ctx.moveTo(x, trap.y + trap.h); ctx.lineTo(x + 8, trap.y); ctx.lineTo(x + 16, trap.y + trap.h); } ctx.fill(); });
  ctx.fillStyle = '#d7a34b'; ctx.fillRect(levelData[level].exit, 540, 6, 90); ctx.fillStyle = 'rgba(215,163,75,.24)'; ctx.fillRect(levelData[level].exit - 20, 540, 46, 90);
  if (world.checkpoint) { ctx.fillStyle = '#d7a34b'; ctx.fillRect(level === 2 ? world.chapterCheckpointX : 1030, 470, 4, 160); ctx.fillStyle = '#d7a34b'; ctx.beginPath(); ctx.moveTo((level === 2 ? world.chapterCheckpointX : 1034) + 4, 475); ctx.lineTo((level === 2 ? world.chapterCheckpointX : 1034) + 40, 490); ctx.lineTo((level === 2 ? world.chapterCheckpointX : 1034) + 4, 505); ctx.fill(); }
  world.enemies.forEach((enemy) => { if (!enemy.alive || enemy.active === false) return; const animation = enemy.state === 'ATTACK' ? sprites.enemy.Attack : enemy.state === 'PATROL' ? sprites.enemy.Walk : sprites.enemy.Idle; drawSprite(animation[Math.floor(enemy.animTime * 8) % animation.length], enemy.x, enemy.y, enemy.w, enemy.h, enemy.facing < 0); if (enemy.state === 'ATTACK' && enemy.stateTime < .35) drawEnemySlash(enemy); });
  if (world.boss?.active && world.boss.alive) { const set = world.boss.state === 'ATTACK' ? sprites.boss.Run : sprites.boss.Idle; drawSprite(set[Math.floor(world.boss.animTime * 8) % set.length], world.boss.x, world.boss.y, world.boss.w, world.boss.h, world.boss.facing < 0); ctx.fillStyle = '#37262a'; ctx.fillRect(world.boss.x, world.boss.y - 22, world.boss.w, 8); ctx.fillStyle = '#c85f4f'; ctx.fillRect(world.boss.x, world.boss.y - 22, world.boss.w * (world.boss.hp / world.boss.maxHp), 8); if (world.boss.state === 'ATTACK') drawEnemySlash(world.boss); }
  if (world.girl) { drawSprite(sprites.girl.Idle[Math.floor(performance.now() / 130) % sprites.girl.Idle.length], world.girl.x, world.girl.y, world.girl.w, world.girl.h, true, world.girl.unlocked ? 1 : .45); ctx.fillStyle = '#d7a34b'; ctx.font = '11px DM Mono'; ctx.fillText(world.girl.unlocked ? 'THE CAPTIVE IS SAFE' : 'LOCKED', world.girl.x - 4, world.girl.y - 16); }
  const action = player.attacking > 0 ? (player.grounded ? 'Attack' : 'JumpAttack') : (Math.abs(player.vx) > 20 ? 'Run' : player.grounded ? 'Idle' : 'Jump');
  const list = sprites.knight[action]; drawSprite(currentSprite(list, action === 'Attack' ? 14 : 10), player.x, player.y, player.w, player.h, player.facing < 0, player.invuln > 0 && Math.floor(player.invuln * 14) % 2 === 0 ? .35 : 1);
  if (player.attacking > 0) {
    const slashX = player.facing > 0 ? player.x + player.w - 4 : player.x + 4;
    const slashY = player.y + 40;
    ctx.save();
    ctx.globalAlpha = Math.min(1, player.attacking * 4);
    ctx.translate(slashX, slashY);
    ctx.scale(player.facing > 0 ? 1 : -1, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 48, -Math.PI / 2, Math.PI / 2);
    ctx.lineCap = 'round';
    ctx.lineWidth = 13;
    ctx.strokeStyle = 'rgba(54, 221, 242, .22)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 48, -Math.PI / 2, Math.PI / 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#54e7f2';
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function updatePlayer(dt) {
  const spaceJump = spacePressed; spacePressed = false;
  if (world.tower) { updateTowerPlayer(dt, spaceJump); return; }
  const left = keys.has('ArrowLeft') || keys.has('a'); const right = keys.has('ArrowRight') || keys.has('d');
  const direction = (right ? 1 : 0) - (left ? 1 : 0); player.vx += direction * 1900 * dt; player.vx *= Math.pow(.0005, dt); player.vx = Math.max(-270, Math.min(270, player.vx)); if (direction) player.facing = direction;
  const jumpKey = keys.has('w') || keys.has('ArrowUp');
  if ((spaceJump || jumpKey) && player.grounded) { player.vy = -650; player.grounded = false; }
  else if (spaceJump && player.doubleJumpAvailable) { player.vy = -650; player.doubleJumpAvailable = false; }
  player.vy += 1700 * dt; const oldY = player.y; player.x += player.vx * dt; player.y += player.vy * dt; player.x = Math.max(0, Math.min(world.width - player.w, player.x));
  if (level === 2 && !world.finalGateOpen) player.x = Math.min(player.x, 2360);
  player.grounded = false; player.currentPlatformId = null;
  world.platforms.forEach((platform) => { if (player.vy >= 0 && oldY + player.h <= platform.y + 2 && player.y + player.h >= platform.y && player.x + player.w > platform.x && player.x < platform.x + platform.w) { player.y = platform.y - player.h; player.vy = 0; player.grounded = true; player.doubleJumpAvailable = true; player.currentPlatformId = platform.id; } });
  player.animTime += dt; player.attacking = Math.max(0, player.attacking - dt); player.invuln = Math.max(0, player.invuln - dt);
  if (player.y > H + 80) { damage(); if (level === 2 && world.chapterCheckpointX > 0) respawnChapter3Player(); }
  world.traps.forEach((trap) => { if (rectsOverlap(player, trap)) damage(); });
}
function updateTowerPlayer(dt, spaceJump) {
  world.movingPlatforms.forEach((platform) => { platform.y = platform.minY + (Math.sin(performance.now() / 1000 + platform.phase) + 1) * .5 * (platform.maxY - platform.minY); });
  const left = keys.has('ArrowLeft') || keys.has('a'); const right = keys.has('ArrowRight') || keys.has('d');
  const direction = (right ? 1 : 0) - (left ? 1 : 0); player.vx += direction * 1900 * dt; player.vx *= Math.pow(.0005, dt); player.vx = Math.max(-270, Math.min(270, player.vx)); if (direction) player.facing = direction;
  const teleport = world.teleports.find((item) => item.floor === player.currentFloor && Math.abs((player.x + player.w / 2) - item.x) < item.radius + player.w / 2 && Math.abs((player.y + player.h / 2) - item.y) < item.radius + player.h / 2);
  if (teleport) { player.x = teleport.targetX - player.w / 2; player.y = teleport.targetY; player.vx = 0; player.vy = 0; player.grounded = teleport.targetOnLadder === false ? false : true; player.onLadder = teleport.targetOnLadder !== false; player.currentFloor = teleport.targetFloor; toastMessage(`TELEPORTED TO FLOOR ${String(teleport.targetFloor).padStart(2, '0')}`); updateHud(); return; }
  const ladder = world.ladders.find((item) => player.x + player.w > item.x && player.x < item.x + item.w && player.y + player.h > item.y && player.y < item.y + item.h);
  const climbKey = keys.has(' ') || keys.has('w') || keys.has('ArrowUp');
  if (!player.onLadder && ladder && climbKey) player.onLadder = true;
  if (player.onLadder && !ladder && !climbKey) player.onLadder = false;
  if (player.onLadder && ladder) { if (spaceJump) { player.onLadder = false; player.grounded = false; player.vy = -650; } else { player.x += (ladder.x + ladder.w / 2 - (player.x + player.w / 2)) * Math.min(1, dt * 10); player.vx = 0; if (climbKey) player.y -= 260 * dt; player.vy = 0; player.grounded = true; if (player.y <= ladder.targetY) { player.y = ladder.targetY; player.onLadder = false; if (ladder.exit) { nextLevel(); } else { player.currentFloor = Math.min(10, ladder.floor + 1); toastMessage(`FLOOR ${String(player.currentFloor).padStart(2, '0')} / 10`); } } } }
  else {
    const jumpKey = keys.has('w') || keys.has('ArrowUp');
    if ((spaceJump || jumpKey) && player.grounded) { player.vy = -650; player.grounded = false; }
    else if (spaceJump && player.doubleJumpAvailable) { player.vy = -650; player.doubleJumpAvailable = false; }
    player.vy += 1700 * dt; const oldY = player.y; player.x += player.vx * dt; player.y += player.vy * dt; player.x = Math.max(28, Math.min(world.width - player.w - 28, player.x)); player.grounded = false; player.currentPlatformId = null;
    [...world.platforms, ...world.movingPlatforms].forEach((platform) => { if (player.vy >= 0 && oldY + player.h <= platform.y + 2 && player.y + player.h >= platform.y && player.x + player.w > platform.x && player.x < platform.x + platform.w) { player.y = platform.y - player.h; player.vy = 0; player.grounded = true; player.doubleJumpAvailable = true; player.currentPlatformId = platform.id; player.currentFloor = platform.floor; } });
  }
  player.animTime += dt; player.attacking = Math.max(0, player.attacking - dt); player.invuln = Math.max(0, player.invuln - dt);
  if (player.y > towerBaseY(1) + 180) { damage(); respawnTowerPlayer(); }
  world.traps.forEach((trap) => {
    const active = trap.type !== 'timed' || Math.sin((performance.now() / 1000 + trap.phase) * Math.PI * 2 / trap.cycle) > .15;
    const hazard = trap.type === 'falling' ? { x: trap.x, y: trap.y - 130 + Math.abs(Math.sin(performance.now() / 900)) * 100, w: trap.w, h: 22 } : trap.type === 'gate' ? { x: trap.x, y: trap.y - trap.h, w: trap.w, h: trap.h } : trap;
    if (active && rectsOverlap(player, hazard) && (trap.type !== 'gate' || player.y + player.h > trap.y - trap.h)) damage();
  });
}
function respawnChapter3Player() {
  resetPlayer(world.chapterCheckpointX, 544, 1); player.grounded = true; cameraX = Math.max(0, world.chapterCheckpointX - W * .35); toastMessage('RETURNED TO THE LAST THRONE CHECKPOINT'); updateHud();
}
function respawnTowerPlayer() {
  const floorNumber = world.checkpointFloor || 1;
  const floor = towerFloors[floorNumber - 1];
  resetPlayer(floorNumber === 1 ? 70 : floor.ladderX - 70, towerBaseY(floorNumber) - 86, floorNumber);
  player.grounded = true; cameraY = towerBaseY(floorNumber) - 180; toastMessage(`RETURNED TO FLOOR ${String(floorNumber).padStart(2, '0')}`); updateHud();
}
function restoreBossAfterDeath() {
  if (world.boss?.alive) {
    world.boss.hp = world.boss.maxHp;
    world.boss.alive = true;
    world.boss.state = 'PATROL';
    world.boss.stateTime = 0;
    world.boss.vx = 0;
    world.boss.attackHit = false;
    world.boss.attackCooldown = 0;
    const platform = world.platforms.find((item) => item.id === world.boss.platformId);
    if (platform) world.boss.y = platform.y - world.boss.h;
  }
}
function updateEnemies(dt) {
  if (world.tower) { updateTowerEnemies(dt); return; }
  if (level === 2) { updateChapter3Enemies(dt); return; }
  world.enemies.forEach((enemy) => { if (!enemy.alive) return; enemy.animTime += dt; if (Math.abs(player.x - enemy.x) < 250) enemy.vx = player.x < enemy.x ? -35 : 35; enemy.x += enemy.vx * dt; if (rectsOverlap(player, enemy)) { if (player.attacking > 0) { enemy.hp--; player.attacking = .12; if (enemy.hp <= 0) { enemy.alive = false; score += 10; toastMessage('THREAT CLEARED +10'); } } else damage(); } });
  if (world.boss?.alive) { const boss = world.boss; boss.animTime += dt; boss.attackTimer -= dt; if (Math.abs(player.x - boss.x) < 430) { boss.vx = player.x < boss.x ? -55 : 55; boss.x += boss.vx * dt; } if (rectsOverlap(player, boss)) { if (player.attacking > 0) { boss.hp--; player.attacking = .16; score += 2; if (boss.hp <= 0) { boss.alive = false; score += 50; toastMessage('THE WARDEN FALLS'); } } else if (boss.attackTimer <= 0) { damage(); boss.attackTimer = 1.5; } } }
}
function updateChapter3Enemies(dt) {
  updateChapter3Encounters();
  const update = (enemy, guardian = false) => {
    if (!enemy || !enemy.active || !enemy.alive) return;
    enemy.animTime += dt; enemy.stateTime += dt; enemy.hitCooldown = Math.max(0, (enemy.hitCooldown || 0) - dt); enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - dt);
    const samePlatform = player.currentPlatformId === enemy.platformId;
    const distance = player.x - enemy.x;
    if (player.attacking > 0 && samePlatform && enemy.hitCooldown <= 0 && Math.abs(distance) < (enemy.w + (guardian ? 80 : 65))) {
      enemy.hp--; enemy.hitCooldown = .4; player.attacking = .12; score += guardian ? 3 : 2; toastMessage('HIT CONFIRMED');
      if (enemy.hp <= 0) { enemy.alive = false; score += guardian ? 50 : 10; if (guardian) { world.finalGateOpen = true; world.girl.unlocked = true; toastMessage('THE GUARDIAN FALLS - THE CAPTIVE IS SAFE'); } return; }
    }
    if (enemy.state === 'PATROL') { enemy.vx = enemy.vx || 38; enemy.x += enemy.vx * dt; enemy.facing = enemy.vx < 0 ? -1 : 1; if (enemy.x <= enemy.patrolMin || enemy.x >= enemy.patrolMax) { enemy.vx *= -1; enemy.x = Math.max(enemy.patrolMin, Math.min(enemy.patrolMax, enemy.x)); } if (samePlatform && Math.abs(distance) < 230) { enemy.state = 'DETECT'; enemy.stateTime = 0; } }
    else if (enemy.state === 'DETECT') { enemy.vx = 0; enemy.facing = distance < 0 ? -1 : 1; if (!samePlatform) { enemy.state = 'PATROL'; enemy.stateTime = 0; } else if (enemy.stateTime > .3) { enemy.state = 'CHASE'; enemy.stateTime = 0; } }
    else if (enemy.state === 'CHASE') { if (!samePlatform) { enemy.state = 'PATROL'; enemy.stateTime = 0; } else { enemy.facing = distance < 0 ? -1 : 1; enemy.vx = enemy.facing * (guardian ? 70 : 52); enemy.x += enemy.vx * dt; enemy.x = Math.max(enemy.patrolMin, Math.min(enemy.patrolMax, enemy.x)); if (Math.abs(distance) < (guardian ? 115 : 92) && enemy.stateTime > .2 && enemy.attackCooldown <= 0) { enemy.state = 'ATTACK'; enemy.stateTime = 0; enemy.attackHit = false; } } }
    else if (enemy.state === 'ATTACK') { enemy.vx = 0; enemy.facing = distance < 0 ? -1 : 1; if (!enemy.attackHit && enemy.stateTime >= .2 && enemy.stateTime <= .34 && samePlatform && Math.abs(distance) < (guardian ? 125 : 105)) { enemy.attackHit = true; enemy.attackCooldown = guardian ? 1.1 : .9; damage(); } if (enemy.stateTime > (guardian ? .7 : .58)) { enemy.state = 'RECOVER'; enemy.stateTime = 0; } }
    else if (enemy.state === 'RECOVER' && enemy.stateTime > (guardian ? .65 : .55)) { enemy.state = 'PATROL'; enemy.stateTime = 0; enemy.vx = enemy.facing * -38; }
  };
  world.enemies.forEach((enemy) => update(enemy));
  if (world.boss?.active) update(world.boss, true);
}
function updateTowerEnemies(dt) {
  const update = (enemy) => {
    if (!enemy || !enemy.alive) return;
    enemy.animTime += dt; enemy.stateTime += dt; enemy.hitCooldown = Math.max(0, (enemy.hitCooldown || 0) - dt); enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - dt);
    const samePlatform = player.currentPlatformId === enemy.platformId && player.currentFloor === enemy.floor;
    const distance = player.x - enemy.x;
    if (player.attacking > 0 && samePlatform && enemy.hitCooldown <= 0 && Math.abs(distance) < (enemy.w + 65)) { enemy.hp--; enemy.hitCooldown = .4; player.attacking = .12; score += 2; toastMessage('HIT CONFIRMED'); if (enemy.hp <= 0) { enemy.alive = false; score += enemy === world.boss ? 50 : 10; if (enemy === world.boss) spawnTowerExitLadder(); else toastMessage('PATROL CLEARED'); return; } }
    if (enemy.state === 'PATROL') { enemy.vx = enemy.vx || 42; enemy.x += enemy.vx * dt; if (enemy.x <= enemy.patrolMin || enemy.x >= enemy.patrolMax) { enemy.vx *= -1; enemy.x = Math.max(enemy.patrolMin, Math.min(enemy.patrolMax, enemy.x)); } if (samePlatform && Math.abs(distance) < 220) { enemy.state = 'DETECT'; enemy.stateTime = 0; } }
    else if (enemy.state === 'DETECT') { enemy.vx = 0; enemy.facing = distance < 0 ? -1 : 1; if (!samePlatform) { enemy.state = 'PATROL'; enemy.stateTime = 0; } else if (enemy.stateTime > .3) { enemy.state = 'CHASE'; enemy.stateTime = 0; } }
    else if (enemy.state === 'CHASE') { if (!samePlatform) { enemy.state = 'PATROL'; enemy.stateTime = 0; } else { enemy.facing = distance < 0 ? -1 : 1; enemy.vx = enemy.facing * 58; enemy.x += enemy.vx * dt; enemy.x = Math.max(enemy.patrolMin, Math.min(enemy.patrolMax, enemy.x)); if (Math.abs(distance) < 92 && enemy.stateTime > .2 && enemy.attackCooldown <= 0) { enemy.state = 'ATTACK'; enemy.stateTime = 0; enemy.attackHit = false; } } }
    else if (enemy.state === 'ATTACK') { enemy.vx = 0; enemy.facing = distance < 0 ? -1 : 1; if (!enemy.attackHit && enemy.stateTime >= .2 && enemy.stateTime <= .34 && samePlatform && Math.abs(player.x - enemy.x) < 105) { enemy.attackHit = true; enemy.attackCooldown = .9; damage(); } if (enemy.stateTime > .58) { enemy.state = 'RECOVER'; enemy.stateTime = 0; } }
    else if (enemy.state === 'RECOVER' && enemy.stateTime > .55) { enemy.state = 'PATROL'; enemy.stateTime = 0; enemy.vx = enemy.facing * -42; }
  };
  world.enemies.forEach(update); update(world.boss);
}
function damage() {
  if (player.invuln > 0) return;
  health = Math.max(0, health - 25); player.invuln = 1.2; player.vx = -player.facing * 160; player.vy = -300;
  if (health <= 0) {
    toastMessage(world.tower ? 'FALLEN BACK TO THE LAST CHECKPOINT' : 'THE KEEP CLAIMS YOU');
    setTimeout(() => {
      health = maxHealth;
      potions = 3;
      restoreBossAfterDeath();
      if (world.tower && world.checkpointFloor) { const floor = towerFloors[world.checkpointFloor - 1]; resetPlayer((floor.checkpointX ?? floor.ladderX) - 28, towerBaseY(world.checkpointFloor) - 86, world.checkpointFloor); player.grounded = true; cameraY = towerBaseY(world.checkpointFloor) - 180; updateHud(); }
      else if (level === 2 && world.chapterCheckpointX > 0) { resetPlayer(world.chapterCheckpointX, 544, 1); player.grounded = true; cameraX = Math.max(0, world.chapterCheckpointX - W * .35); updateHud(); }
      else buildLevel();
    }, 650);
  }
  updateHud();
}
function usePotion() { if (paused || won || potions <= 0 || health >= maxHealth) return; health = Math.min(maxHealth, health + 30); potions--; toastMessage('HEALED +30'); updateHud(); }
function attack() { if (!paused && !won && player.attacking <= 0) { player.attacking = .34; } }
function nextLevel() { if (level < 2) { showModal('CHAPTER COMPLETE', level === 0 ? 'The gate opens. The keep waits beyond the mist.' : 'You made it through the old keep. One last room remains.', 'CONTINUE →', () => { level++; health = maxHealth; buildLevel(); }); } else { won = true; showModal('THE RESCUE', 'The Warden is defeated. The captive is free, and dawn finds the keep changed forever.', 'PLAY AGAIN ↻', () => { level = 0; score = 0; health = maxHealth; potions = 3; won = false; buildLevel(); }); } }
function checkProgress() {
  if (world.tower) {
    const floor = Math.max(1, Math.min(10, player.currentFloor || 1));
    if (floor % 2 === 0 && floor > (world.checkpointFloor || 0)) { world.checkpointFloor = floor; world.checkpoint = true; toastMessage(`CHECKPOINT FLOOR ${String(floor).padStart(2, '0')}`); }
    return;
  }
  if (level === 1 && player.x > 980 && !world.checkpoint) { world.checkpoint = true; toastMessage('CHECKPOINT REACHED'); }
  if (level === 2 && world.girl?.unlocked && player.x + player.w > world.girl.x) { toastMessage('THE CAPTIVE IS SAFE'); nextLevel(); } else if (player.x > levelData[level].exit && level < 2) nextLevel();
}
function toastMessage(message) { toast = message; toastTimer = 2; }
function updateHud() {
  document.querySelector('#levelKicker').textContent = world.tower ? `CHAPTER 02 / FLOOR ${String(player.currentFloor || 1).padStart(2, '0')} / 10` : `CHAPTER 0${level + 1}`;
  document.querySelector('#levelName').textContent = world.tower ? `TOWER / ${towerFloors[(player.currentFloor || 1) - 1].label}` : levelData[level].name;
  document.querySelector('#objective').textContent = world.tower ? (player.currentFloor === 10 && world.boss?.alive ? 'Defeat the Warden' : player.currentFloor === 10 ? 'Climb the opened ladder to Chapter 03' : `Floor ${String(player.currentFloor || 1).padStart(2, '0')}: ${towerFloors[(player.currentFloor || 1) - 1].route}`) : level === 2 && world.boss?.alive ? 'Defeat the guards and final guardian' : level === 2 ? 'Reach the captive and rescue her' : levelData[level].objective;
  document.querySelector('#hint').textContent = world.tower ? 'A / D move  ·  SPACE jump / climb  ·  J attack  ·  E heal' : `${levelData[level].hint}  ·  E heal`;
  document.querySelector('#status').textContent = world.tower ? 'OLD KEEP / VERTICAL ASCENT' : level === 2 ? 'THE IRON THRONE / FINAL ASSAULT' : 'READY YOURSELF';
  document.querySelector('#score').textContent = String(score).padStart(2, '0'); document.querySelector('#progress').textContent = world.tower ? `FLOOR ${String(player.currentFloor || 1).padStart(2, '0')} / 10` : `0${level + 1} / 03`;
    document.querySelector('#health').textContent = `${health} / ${maxHealth}`;
    document.querySelector('#potions').textContent = String(potions);
}
function showModal(kicker, title, button, action) { paused = true; document.querySelector('#modalKicker').textContent = kicker; document.querySelector('#modalTitle').textContent = title; document.querySelector('#modalText').textContent = level === 0 ? 'You have learned the basics. The old keep is waiting.' : level === 1 ? 'The path is clear. The Warden has heard your footsteps.' : 'The last shadow breaks.'; document.querySelector('#modalButton').innerHTML = button; document.querySelector('#modal').classList.remove('hidden'); document.querySelector('#modalButton').onclick = () => { document.querySelector('#modal').classList.add('hidden'); paused = false; action(); updateHud(); }; }
function drawOverlay() { if (toastTimer > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, toastTimer * 2); ctx.fillStyle = '#e9e4d8'; ctx.font = '500 14px DM Mono'; ctx.textAlign = 'center'; ctx.fillText(toast, W / 2, 90); ctx.restore(); } }
function loop(time) { const dt = Math.min(.033, (time - lastTime) / 1000 || 0); lastTime = time; if (!paused && !won) { updatePlayer(dt); updateEnemies(dt); checkProgress(); toastTimer = Math.max(0, toastTimer - dt); if (world.tower) { const targetY = player.y - 360; const minCameraY = towerBaseY(10) - 260; const maxCameraY = towerBaseY(1) - 180; cameraY += (Math.max(minCameraY, Math.min(maxCameraY, targetY)) - cameraY) * Math.min(1, dt * 5); } else { cameraX += (Math.max(0, Math.min(world.width - W, player.x - W * .35)) - cameraX) * Math.min(1, dt * 5); } updateHud(); } drawBackground(); drawWorld(); drawOverlay(); requestAnimationFrame(loop); }

window.addEventListener('keydown', (event) => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (event.key === ' ') spacePressed = true; keys.add(key); if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault(); if (key === 'j' || key === 'k') attack(); if (key === 'e') usePotion(); });
window.addEventListener('keyup', (event) => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
document.querySelector('#restart').addEventListener('click', () => { level = 0; score = 0; health = maxHealth; potions = 3; won = false; paused = false; document.querySelector('#modal').classList.add('hidden'); buildLevel(); });
buildLevel(); requestAnimationFrame(loop);
