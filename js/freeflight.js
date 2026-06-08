// ============================================================
// 🌃 Cyberpunk (保持不變)
// ============================================================
const SCENE_STAGES = [
  { threshold: 0, name: 'CYBER NIGHT', sky: [0.02, 0.03, 0.10], rail: [0.4, 0.8, 1.0], accent: [0.3, 0.7, 1.0], buildingDensity: 0, fog: false, speedBoost: 1.0, color: '#4fc3f7' },
  { threshold: 500, name: 'SUNSET DRIVE', sky: [0.18, 0.06, 0.22], rail: [1.0, 0.5, 0.4], accent: [1.0, 0.4, 0.6], buildingDensity: 0.5, fog: false, speedBoost: 1.05, color: '#ff7a50' },
  { threshold: 1000, name: 'NEON CITY', sky: [0.10, 0.02, 0.20], rail: [1.0, 0.3, 0.9], accent: [1.0, 0.2, 0.9], buildingDensity: 1.0, fog: true, fogDensity: 0.012, speedBoost: 1.15, color: '#ff45a0' },
  { threshold: 1500, name: 'HYPER DRIVE', sky: [0.05, 0.0, 0.15], rail: [0.3, 1.0, 1.0], accent: [0.4, 1.0, 0.9], buildingDensity: 1.2, fog: true, fogDensity: 0.018, speedBoost: 1.3, color: '#4cffe0' },
  { threshold: 2500, name: 'VOID BREAK', sky: [0.0, 0.0, 0.03], rail: [1.0, 0.9, 0.3], accent: [1.0, 0.85, 0.2], buildingDensity: 1.5, fog: true, fogDensity: 0.025, speedBoost: 1.5, color: '#ffd700' },
];

const GAME_CFG = {
  bounds: { minX: -4, maxX: 4, minY: 1.0, maxY: 5.8 },
  moveSpeed: 0.18, spawnZ: 55, despawnZ: -4,
  baseObsSpeed: 0.35, maxObsSpeed: 1.1, speedAccel: 0.008,
  baseSpawnInterval: 800, minSpawnInterval: 280,
  shotCooldown: 200, invincibleDuration: 1200, startLives: 3,
  bulletSpeed: 0.7, bulletLife: 2500, bulletHitRadius: 1.1,
  homingStrength: 0.18, trailInterval: 25,
};

const GAME = {
  active: false, paused: false, gameOver: false,
  score: 0, lives: 3, combo: 0, maxCombo: 0, speedMul: 1,
  obstacles: [], bullets: [], particles: [], muzzleFlashes: [],
  skyscrapers: [], speedLines: [],
  lastSpawn: 0, startTime: 0, spawnInterval: 800,
  invincibleUntil: 0, lastShotTime: 0,
  shotsFired: 0, shotsHit: 0, coinsCollected: 0,
  keys: {}, mouseX: 0, mouseY: 0, mouseInCanvas: false,
  road: null, roadTex: null, sideRails: [], stars: [],
  patternQueue: [], currentStage: 0, stageSpeedMul: 1, transitioning: false,
};
// ============================================================
// 🔊 音效系統 (Web Audio,程序合成,無需外部檔案)
// ============================================================
let audioCtx = null, masterGain = null;
function initAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audioCtx.destination);
  } catch (e) { audioCtx = null; }
}
function tone(freq, dur, type, vol, slideTo) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(masterGain || audioCtx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function noiseBurst(dur, vol, freq) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const size = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, 2);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(freq || 1400, t);
  f.frequency.exponentialRampToValueAtTime(200, t + dur);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol || 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(masterGain || audioCtx.destination);
  src.start(t); src.stop(t + dur);
}
function sfxShoot()    { tone(900, 0.10, 'square', 0.07, 300); }
function sfxExplode()  { noiseBurst(0.35, 0.28, 1600); tone(150, 0.3, 'sawtooth', 0.10, 50); }
function sfxCoin()     { tone(1320, 0.07, 'sine', 0.10); setTimeout(() => tone(1760, 0.1, 'sine', 0.10), 55); }
function sfxHit()      { noiseBurst(0.4, 0.34, 800); tone(90, 0.4, 'sawtooth', 0.16, 40); }
function sfxPowerup()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.12), i * 55)); }
function sfxStage()    { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sawtooth', 0.09), i * 70)); }
function sfxGameOver() { [440, 349, 294, 196].forEach((f, i) => setTimeout(() => tone(f, 0.45, 'sawtooth', 0.13), i * 200)); }
function sfxBeep(hi)   { tone(hi ? 880 : 440, 0.15, 'square', 0.11); }

// ============================================================
// ✨ 道具系統 (Power-ups) + 邊界工具
// ============================================================
function clampX(x) { return Math.max(GAME_CFG.bounds.minX, Math.min(GAME_CFG.bounds.maxX, x)); }
function clampY(y) { return Math.max(GAME_CFG.bounds.minY, Math.min(GAME_CFG.bounds.maxY, y)); }
function hexToColor3(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return new BABYLON.Color3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const POWERUP_TYPES = {
  shield: { icon: '🛡️', label: 'SHIELD', dur: 5000, color: '#4fc3f7' },
  rapid:  { icon: '⚡',  label: 'RAPID',  dur: 6000, color: '#FFD700' },
  triple: { icon: '✦',  label: 'TRIPLE', dur: 6000, color: '#ff45a0' },
  slow:   { icon: '⏱️', label: 'SLOW',   dur: 4500, color: '#50C878' },
  heal:   { icon: '❤',  label: 'HEAL',   dur: 0,    color: '#ff5577' },
};
function isPwrActive(type) { return GAME.activePwr && GAME.activePwr[type] && Date.now() < GAME.activePwr[type]; }

function createPowerupMesh(type) {
  const def = POWERUP_TYPES[type];
  const col = hexToColor3(def.color);
  const root = new BABYLON.TransformNode('pwr_' + Date.now() + Math.random(), scene);
  const orb = BABYLON.MeshBuilder.CreateSphere('pwrOrb', { diameter: 0.85, segments: 12 }, scene);
  orb.parent = root; orb.isPickable = false;
  const mat = new BABYLON.StandardMaterial('pwrM', scene);
  mat.diffuseColor = col; mat.emissiveColor = col.scale(0.6); mat.alpha = 0.35;
  orb.material = mat;
  const core = BABYLON.MeshBuilder.CreatePolyhedron('pwrCore', { type: 1, size: 0.3 }, scene);
  core.parent = root; core.isPickable = false;
  const cmat = new BABYLON.StandardMaterial('pwrCM', scene);
  cmat.emissiveColor = col; cmat.diffuseColor = col; cmat.specularColor = new BABYLON.Color3(1, 1, 1);
  core.material = cmat;
  const ring = BABYLON.MeshBuilder.CreateTorus('pwrRing', { diameter: 1.05, thickness: 0.07, tessellation: 18 }, scene);
  ring.parent = root; ring.isPickable = false; ring.material = cmat;
  root._core = core; root._ring = ring; root._type = type;
  return root;
}
function disposePowerup(pu) {
  if (pu.mesh) { if (pu.mesh.getChildMeshes) pu.mesh.getChildMeshes().forEach(c => c.dispose()); pu.mesh.dispose && pu.mesh.dispose(); }
}
function maybeSpawnPowerup() {
  if (Date.now() - GAME.lastPowerupSpawn < 9000) return;
  GAME.lastPowerupSpawn = Date.now();
  const pool = ['shield', 'rapid', 'triple', 'slow'];
  if (GAME.lives < GAME_CFG.startLives && Math.random() < 0.4) pool.push('heal', 'heal');
  const type = pool[Math.floor(Math.random() * pool.length)];
  const mesh = createPowerupMesh(type);
  const x = clampX((Math.random() - 0.5) * (GAME_CFG.bounds.maxX - GAME_CFG.bounds.minX));
  const y = clampY(GAME_CFG.bounds.minY + Math.random() * (GAME_CFG.bounds.maxY - GAME_CFG.bounds.minY));
  mesh.position = new BABYLON.Vector3(x, y, GAME_CFG.spawnZ + 4);
  GAME.powerups.push({ type, mesh });
}
function updatePowerups(dt, dtFactor, speed) {
  for (let i = GAME.powerups.length - 1; i >= 0; i--) {
    const pu = GAME.powerups[i];
    pu.mesh.position.z -= speed * dtFactor;
    if (pu.mesh._core) { pu.mesh._core.rotation.y += 0.07 * dtFactor; pu.mesh._core.rotation.x += 0.05 * dtFactor; }
    if (pu.mesh._ring) { pu.mesh._ring.rotation.x += 0.06 * dtFactor; pu.mesh._ring.rotation.z += 0.04 * dtFactor; }
    const d = BABYLON.Vector3.Distance(pu.mesh.position, drone.position);
    if (d < 1.15) { applyPowerup(pu.type); disposePowerup(pu); GAME.powerups.splice(i, 1); continue; }
    if (pu.mesh.position.z < GAME_CFG.despawnZ) { disposePowerup(pu); GAME.powerups.splice(i, 1); }
  }
}
function applyPowerup(type) {
  const def = POWERUP_TYPES[type];
  sfxPowerup();
  if (type === 'heal') {
    GAME.lives = Math.min(GAME_CFG.startLives + 2, GAME.lives + 1);
    showComboPopup('+1 ❤', def.color, drone.position);
  } else {
    GAME.activePwr[type] = Date.now() + def.dur;
    if (type === 'shield') GAME.invincibleUntil = Math.max(GAME.invincibleUntil, GAME.activePwr[type]);
    showComboPopup(def.icon + ' ' + def.label + '!', def.color, drone.position);
  }
  createParticles(drone.position, hexToColor3(def.color), 18);
  updatePowerupHUD();
}
function updatePowerupHUD() {
  const bar = document.getElementById('powerupBar');
  if (!bar) return;
  const active = Object.keys(GAME.activePwr || {}).filter(t => isPwrActive(t));
  if (active.length === 0) { bar.classList.remove('show'); bar.innerHTML = ''; return; }
  bar.classList.add('show');
  bar.innerHTML = active.map(t => {
    const def = POWERUP_TYPES[t];
    const pct = Math.max(0, Math.min(100, ((GAME.activePwr[t] - Date.now()) / def.dur) * 100));
    return '<div class="pwr-chip" style="border-color:' + def.color + ';color:' + def.color + '">' +
      '<span class="pwr-icon">' + def.icon + '</span><span>' + def.label + '</span>' +
      '<span class="pwr-bar"><span class="pwr-fill" style="width:' + pct + '%;background:' + def.color + '"></span></span></div>';
  }).join('');
}
function spawnThrusterParticle() {
  const boosting = GAME.keys['ShiftLeft'] || GAME.keys['ShiftRight'];
  if (Math.random() > (boosting ? 0.95 : 0.5)) return;
  const stage = SCENE_STAGES[GAME.currentStage];
  const p = BABYLON.MeshBuilder.CreateSphere('th_' + Math.random(), { diameter: 0.16 + Math.random() * 0.1, segments: 6 }, scene);
  p.position = new BABYLON.Vector3(drone.position.x + (Math.random() - 0.5) * 0.3, drone.position.y - 0.22, drone.position.z - 0.35);
  p.isPickable = false;
  const m = new BABYLON.StandardMaterial('thm_' + Math.random(), scene);
  m.emissiveColor = new BABYLON.Color3(stage.accent[0], stage.accent[1], stage.accent[2]);
  m.diffuseColor = m.emissiveColor; m.alpha = 0.85;
  p.material = m;
  GAME.particles.push({ mesh: p, vx: 0, vy: 0, vz: -0.16, life: 280, maxLife: 280, isTrail: true });
}
function startEndlessGame() {
  initAudio();
  GAME.active = false; GAME.gameOver = false; GAME.paused = false;
  GAME.score = 0; GAME.lives = GAME_CFG.startLives;
  GAME.combo = 0; GAME.maxCombo = 0; GAME.speedMul = 1; GAME.stageSpeedMul = 1;
  GAME.lastSpawn = 0; GAME.spawnInterval = GAME_CFG.baseSpawnInterval;
  GAME.invincibleUntil = 0;
  GAME.shotsFired = 0; GAME.shotsHit = 0; GAME.coinsCollected = 0;
  GAME.patternQueue = []; GAME.currentStage = 0; GAME.transitioning = false;
  GAME.powerups = []; GAME.activePwr = {}; GAME.lastPowerupSpawn = Date.now();
  clearGameObjects();
  scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  scene.clearColor = new BABYLON.Color4(SCENE_STAGES[0].sky[0], SCENE_STAGES[0].sky[1], SCENE_STAGES[0].sky[2], 1);
  camera.detachControl(canvas);
  drone.position = new BABYLON.Vector3(0, 3, 0);
  drone.rotation = new BABYLON.Vector3(0, 0, 0);
  flying = true; targetProp = 0.35;
  createRunnerEnvironment();
  GAME.shieldMesh = BABYLON.MeshBuilder.CreateSphere('shieldBubble', { diameter: 2.1, segments: 16 }, scene);
  const shMat = new BABYLON.StandardMaterial('shMat', scene);
  shMat.diffuseColor = new BABYLON.Color3(0.3, 0.7, 1); shMat.emissiveColor = new BABYLON.Color3(0.2, 0.5, 1);
  shMat.alpha = 0.18; shMat.backFaceCulling = false;
  GAME.shieldMesh.material = shMat; GAME.shieldMesh.isPickable = false; GAME.shieldMesh.setEnabled(false);
  applyStageVisuals(0, true);
  updateGameHUD();
  updatePowerupHUD();
  startCountdown();
}
function startCountdown() {
  const overlay = document.getElementById('countdownOverlay');
  const text = document.getElementById('countdownText');
  overlay.classList.add('show');
  let count = 3;
  text.textContent = count;
  text.style.color = '#4fc3f7';
  text.style.textShadow = '0 0 30px #4fc3f7';
  text.style.animation = 'none';
  setTimeout(() => text.style.animation = 'cdPulse 0.8s ease-out', 10);
  sfxBeep(false);
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      text.textContent = count;
      text.style.animation = 'none';
      setTimeout(() => text.style.animation = 'cdPulse 0.8s ease-out', 10);
      sfxBeep(false);
    } else if (count === 0) {
      text.textContent = 'GO!';
      text.style.color = '#50C878';
      text.style.textShadow = '0 0 30px #50C878';
      text.style.animation = 'none';
      setTimeout(() => text.style.animation = 'cdPulse 0.8s ease-out', 10);
      sfxBeep(true);
    } else {
      clearInterval(interval);
      overlay.classList.remove('show');
      GAME.active = true;
      GAME.startTime = Date.now();
      GAME.lastSpawn = Date.now();
      GAME.lastPowerupSpawn = Date.now();
    }
  }, 1000);
}

function stopEndlessGame() {
  GAME.active = false;
  clearGameObjects();
  scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  document.getElementById('countdownOverlay').classList.remove('show');
  document.getElementById('gameOverModal').classList.remove('show');
  document.getElementById('stageBanner').classList.remove('show');
  const pb = document.getElementById('powerupBar'); if (pb) pb.classList.remove('show');
}

function restartEndlessGame() {
  document.getElementById('gameOverModal').classList.remove('show');
  document.getElementById('stageBanner').classList.remove('show');
  startEndlessGame();
}

function clearGameObjects() {
  GAME.obstacles.forEach(obs => disposeObstacle(obs));
  GAME.obstacles = [];
  GAME.bullets.forEach(b => { if (b.mesh) b.mesh.dispose(); if (b.light) b.light.dispose(); });
  GAME.bullets = [];
  GAME.particles.forEach(p => p.mesh && p.mesh.dispose());
  GAME.particles = [];
  GAME.muzzleFlashes.forEach(m => { if (m.mesh) m.mesh.dispose(); if (m.light) m.light.dispose(); });
  GAME.muzzleFlashes = [];
  (GAME.powerups || []).forEach(pu => disposePowerup(pu));
  GAME.powerups = [];
  if (GAME.shieldMesh) { GAME.shieldMesh.dispose(); GAME.shieldMesh = null; }
  GAME.skyscrapers.forEach(s => s.mesh && s.mesh.dispose());
  GAME.skyscrapers = [];
  GAME.speedLines.forEach(l => l.mesh && l.mesh.dispose());
  GAME.speedLines = [];
  if (GAME.road) { GAME.road.dispose(); GAME.road = null; }
  GAME.sideRails.forEach(r => r.dispose()); GAME.sideRails = [];
  GAME.stars.forEach(s => s.dispose()); GAME.stars = [];
}

function createRunnerEnvironment() {
  GAME.road = BABYLON.MeshBuilder.CreateGround('runnerRoad', { width: 10, height: 120 }, scene);
  GAME.road.position = new BABYLON.Vector3(0, 0, 55);
  GAME.roadTex = new BABYLON.DynamicTexture('rTex', { width: 256, height: 256 }, scene, false);
  GAME.roadTex.vScale = 12;
  rebuildRoadTexture(SCENE_STAGES[0]);
  const roadMat = new BABYLON.StandardMaterial('rmat', scene);
  roadMat.diffuseTexture = GAME.roadTex;
  roadMat.emissiveColor = new BABYLON.Color3(0.1, 0.15, 0.3);
  roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
  GAME.road.material = roadMat;
  [-1, 1].forEach((side) => {
    const rail = BABYLON.MeshBuilder.CreateBox('rail' + side, { width: 0.3, height: 0.5, depth: 120 }, scene);
    rail.position = new BABYLON.Vector3(side * 5, 0.25, 55);
    const rmat = new BABYLON.StandardMaterial('rlm' + side, scene);
    rmat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.6);
    rmat.emissiveColor = new BABYLON.Color3(0.2, 0.6, 1);
    rail.material = rmat;
    GAME.sideRails.push(rail);
    const topRail = BABYLON.MeshBuilder.CreateBox('rt' + side, { width: 0.1, height: 0.1, depth: 120 }, scene);
    topRail.position = new BABYLON.Vector3(side * 5, 0.55, 55);
    const tmat = new BABYLON.StandardMaterial('trm' + side, scene);
    tmat.emissiveColor = new BABYLON.Color3(0.4, 0.8, 1);
    topRail.material = tmat;
    GAME.sideRails.push(topRail);
  });
  for (let i = 0; i < 60; i++) {
    const star = BABYLON.MeshBuilder.CreateSphere('star' + i, { diameter: 0.08 + Math.random() * 0.12, segments: 6 }, scene);
    star.position = new BABYLON.Vector3((Math.random() - 0.5) * 80, 4 + Math.random() * 20, 80 + Math.random() * 40);
    const sm = new BABYLON.StandardMaterial('sm' + i, scene);
    const c = Math.random();
    if (c < 0.6) sm.emissiveColor = new BABYLON.Color3(1, 1, 1);
    else if (c < 0.8) sm.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
    else sm.emissiveColor = new BABYLON.Color3(1, 0.7, 0.5);
    star.material = sm;
    GAME.stars.push(star);
  }
}

function rebuildRoadTexture(stage) {
  if (!GAME.roadTex) return;
  const tex = GAME.roadTex;
  const TEX = 256;
  const ctx = tex.getContext();
  ctx.fillStyle = '#08051a';
  ctx.fillRect(0, 0, TEX, TEX);
  const accentRGB = `rgb(${Math.floor(stage.accent[0]*255)}, ${Math.floor(stage.accent[1]*255)}, ${Math.floor(stage.accent[2]*255)})`;
  const accentAlpha = `rgba(${Math.floor(stage.accent[0]*255)}, ${Math.floor(stage.accent[1]*255)}, ${Math.floor(stage.accent[2]*255)}, 0.45)`;
  ctx.strokeStyle = accentRGB; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(TEX/2, 0); ctx.lineTo(TEX/2, TEX); ctx.stroke();
  ctx.strokeStyle = accentAlpha; ctx.lineWidth = 2;
  ctx.setLineDash([20, 15]);
  ctx.beginPath(); ctx.moveTo(TEX*0.25, 0); ctx.lineTo(TEX*0.25, TEX); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(TEX*0.75, 0); ctx.lineTo(TEX*0.75, TEX); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = accentAlpha; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const y = (i / 8) * TEX;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX, y); ctx.stroke();
  }
  tex.update();
}

function createSkyscraper(side, distance, stage) {
  const height = 4 + Math.random() * (10 + stage.buildingDensity * 8);
  const width = 1.2 + Math.random() * 2.5;
  const building = BABYLON.MeshBuilder.CreateBox('bld', { width: width, height: height, depth: width }, scene);
  const xOff = 8 + Math.random() * (8 + stage.buildingDensity * 6);
  building.position = new BABYLON.Vector3(side * xOff, height/2, distance);
  const mat = new BABYLON.StandardMaterial('bldm', scene);
  mat.diffuseColor = new BABYLON.Color3(0.03, 0.02, 0.08);
  const wt = new BABYLON.DynamicTexture('wt' + Math.random(), { width: 128, height: 256 }, scene, false);
  const ctx = wt.getContext();
  ctx.fillStyle = '#08041a'; ctx.fillRect(0, 0, 128, 256);
  const accent = stage.accent;
  const colors = [
    `rgb(${Math.floor(accent[0]*255)}, ${Math.floor(accent[1]*255)}, ${Math.floor(accent[2]*255)})`,
    `rgb(${Math.floor((1-accent[0])*180+80)}, ${Math.floor((1-accent[1])*150+100)}, ${Math.floor((1-accent[2])*200+100)})`,
    `rgb(255, 255, 255)`,
  ];
  for (let y = 6; y < 256; y += 14) {
    for (let x = 6; x < 128; x += 14) {
      if (Math.random() < 0.65) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }
  wt.update();
  mat.emissiveTexture = wt;
  mat.diffuseTexture = wt;
  building.material = mat;
  building.isPickable = false;
  return building;
}

function spawnSkyscrapers(stage) {
  const count = Math.floor(stage.buildingDensity * 18);
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = (i / 2) * 12 + Math.random() * 6;
    const building = createSkyscraper(side, z, stage);
    GAME.skyscrapers.push({ mesh: building, side: side });
  }
}

function updateSkyscrapers(speed, dtFactor) {
  const stage = SCENE_STAGES[GAME.currentStage];
  GAME.skyscrapers.forEach(b => {
    b.mesh.position.z -= speed * dtFactor * 0.8;
    if (b.mesh.position.z < -20) {
      b.mesh.dispose();
      b.mesh = createSkyscraper(b.side, 95 + Math.random() * 20, stage);
    }
  });
}

function checkStageTransition() {
  if (GAME.transitioning) return;
  let newStage = 0;
  for (let i = SCENE_STAGES.length - 1; i >= 0; i--) {
    if (GAME.score >= SCENE_STAGES[i].threshold) {
      newStage = i;
      break;
    }
  }
  if (newStage !== GAME.currentStage) transitionToStage(newStage);
}

function transitionToStage(idx) {
  if (idx === GAME.currentStage || GAME.transitioning) return;
  GAME.transitioning = true;
  sfxStage();
  const stage = SCENE_STAGES[idx];
  const flash = document.getElementById('stageFlash');
  flash.style.backgroundColor = stage.color;
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 120);
  const startSky = scene.clearColor.clone();
  const endSky = new BABYLON.Color4(stage.sky[0], stage.sky[1], stage.sky[2], 1);
  let t = 0;
  const trans = setInterval(() => {
    t += 0.04;
    if (t >= 1) {
      scene.clearColor = endSky;
      clearInterval(trans);
      GAME.transitioning = false;
    } else {
      scene.clearColor = new BABYLON.Color4(
        startSky.r + (endSky.r - startSky.r) * t,
        startSky.g + (endSky.g - startSky.g) * t,
        startSky.b + (endSky.b - startSky.b) * t, 1
      );
    }
  }, 40);
  GAME.currentStage = idx;
  applyStageVisuals(idx, false);
  showStageBanner(idx, stage);
  GAME.stageSpeedMul = stage.speedBoost;
}

function applyStageVisuals(idx, isInitial) {
  const stage = SCENE_STAGES[idx];
  GAME.sideRails.forEach(r => {
    if (r.material) {
      r.material.emissiveColor = new BABYLON.Color3(stage.rail[0], stage.rail[1], stage.rail[2]);
      if (r.name.startsWith('rail')) {
        r.material.diffuseColor = new BABYLON.Color3(stage.rail[0] * 0.3, stage.rail[1] * 0.3, stage.rail[2] * 0.3);
      }
    }
  });
  rebuildRoadTexture(stage);
  GAME.skyscrapers.forEach(s => s.mesh.dispose());
  GAME.skyscrapers = [];
  if (stage.buildingDensity > 0) spawnSkyscrapers(stage);
  if (stage.fog) {
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = stage.fogDensity || 0.01;
    scene.fogColor = new BABYLON.Color3(stage.sky[0] * 1.5, stage.sky[1] * 1.5, stage.sky[2] * 1.5);
  } else {
    scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  }
}

function showStageBanner(idx, stage) {
  const banner = document.getElementById('stageBanner');
  document.getElementById('sbNum').textContent = idx + 1;
  document.getElementById('sbName').textContent = stage.name;
  banner.querySelector('.stage-name').style.color = stage.color;
  banner.querySelector('.stage-line').style.color = stage.color;
  banner.classList.remove('show');
  setTimeout(() => banner.classList.add('show'), 50);
  setTimeout(() => banner.classList.remove('show'), 2800);
  document.getElementById('gStage').textContent = stage.name;
  document.getElementById('gStage').style.color = stage.color;
  document.getElementById('gStage').style.textShadow = `0 0 8px ${stage.color}`;
}

function createObstacleMesh(type) {
  const root = new BABYLON.TransformNode('obs_' + Date.now() + Math.random(), scene);
  if (type === 'red') {
    const aura = BABYLON.MeshBuilder.CreateSphere('redAura', { diameter: 1.6, segments: 12 }, scene);
    aura.parent = root;
    aura.isPickable = true;
    const auraMat = new BABYLON.StandardMaterial('auraM', scene);
    auraMat.diffuseColor = new BABYLON.Color3(1, 0.15, 0.15);
    auraMat.emissiveColor = new BABYLON.Color3(1, 0.1, 0.1);
    auraMat.alpha = 0.22;
    aura.material = auraMat;
    aura._gameType = 'red'; aura._gameRoot = root;
    const core = BABYLON.MeshBuilder.CreatePolyhedron('redCore', { type: 1, size: 0.4 }, scene);
    core.parent = root;
    core.isPickable = true;
    const coreMat = new BABYLON.StandardMaterial('coreM', scene);
    coreMat.diffuseColor = new BABYLON.Color3(0.85, 0.05, 0.05);
    coreMat.emissiveColor = new BABYLON.Color3(1, 0.25, 0.25);
    coreMat.specularColor = new BABYLON.Color3(1, 0.6, 0.6);
    core.material = coreMat;
    core._gameType = 'red'; core._gameRoot = root;
    const spikeDirs = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
    ];
    spikeDirs.forEach((d, i) => {
      const spike = BABYLON.MeshBuilder.CreateCylinder('spike' + i, { height: 0.55, diameterTop: 0, diameterBottom: 0.18 }, scene);
      spike.parent = core;
      spike.isPickable = true;
      spike.position = new BABYLON.Vector3(d.x * 0.45, d.y * 0.45, d.z * 0.45);
      if (d.x !== 0) spike.rotation.z = -Math.sign(d.x) * Math.PI / 2;
      else if (d.z !== 0) spike.rotation.x = Math.sign(d.z) * Math.PI / 2;
      else if (d.y < 0) spike.rotation.x = Math.PI;
      spike.material = coreMat;
      spike._gameType = 'red'; spike._gameRoot = root;
    });
    const beacon = BABYLON.MeshBuilder.CreateSphere('beacon', { diameter: 0.18, segments: 8 }, scene);
    beacon.position = new BABYLON.Vector3(0, 0.85, 0);
    beacon.parent = root;
    beacon.isPickable = true;
    const bMat = new BABYLON.StandardMaterial('bMat', scene);
    bMat.emissiveColor = new BABYLON.Color3(1, 1, 0.3);
    beacon.material = bMat;
    beacon._gameType = 'red'; beacon._gameRoot = root;
    root._main = core; root._aura = aura; root._beacon = beacon;
  } else if (type === 'blue') {
    const main = BABYLON.MeshBuilder.CreateBox('blueObs', { width: 1, height: 1, depth: 0.3 }, scene);
    main.parent = root;
    main.rotation.z = Math.PI / 4;
    main.isPickable = false;
    const mat = new BABYLON.StandardMaterial('blueM', scene);
    mat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.7);
    mat.emissiveColor = new BABYLON.Color3(0.2, 0.5, 1);
    main.material = mat;
    const frame = BABYLON.MeshBuilder.CreateBox('blueF', { width: 1.2, height: 1.2, depth: 0.1 }, scene);
    frame.parent = root;
    frame.rotation.z = Math.PI / 4;
    frame.isPickable = false;
    const fmat = new BABYLON.StandardMaterial('bFM', scene);
    fmat.emissiveColor = new BABYLON.Color3(0.4, 0.8, 1);
    frame.material = fmat;
    root._main = main;
  } else if (type === 'coin') {
    const main = BABYLON.MeshBuilder.CreateCylinder('coin', { height: 0.08, diameter: 0.7 }, scene);
    main.parent = root;
    main.rotation.x = Math.PI / 2;
    main.isPickable = false;
    const mat = new BABYLON.StandardMaterial('coinM', scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.1);
    mat.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.05);
    mat.specularColor = new BABYLON.Color3(1, 1, 0.5);
    main.material = mat;
    root._main = main;
  }
  return root;
}

function spawnObstaclePattern() {
  const elapsed = (Date.now() - GAME.startTime) / 1000;
  const difficulty = Math.min(1, elapsed / 60);
  const minX = GAME_CFG.bounds.minX, maxX = GAME_CFG.bounds.maxX;
  const minY = GAME_CFG.bounds.minY, maxY = GAME_CFG.bounds.maxY;
  const xRange = maxX - minX, yRange = maxY - minY;
  const randX = () => minX + Math.random() * xRange;
  const randY = () => minY + Math.random() * yRange;
  const dX = drone ? drone.position.x : 0;
  const dY = drone ? drone.position.y : 3;
  const redChance = 0.2 + GAME.currentStage * 0.05;
  const ph = () => Math.random() * Math.PI * 2;

  if (GAME.patternQueue.length === 0) {
    const camper = Math.random() < (0.18 + difficulty * 0.22);
    const r = Math.random();

    if (camper) {
      // 🔧 Task2:直接朝玩家「當前位置」生成,杜絕在最上/最下/邊緣的固定躲藏點
      const t = Math.random() < redChance ? 'red' : 'blue';
      GAME.patternQueue.push({ type: t, x: clampX(dX + (Math.random() - 0.5)), y: clampY(dY + (Math.random() - 0.5)), offsetZ: 0,
                               weave: (t === 'red' && difficulty > 0.4) ? 0.8 : 0, phase: ph() });
      if (Math.random() < 0.4) GAME.patternQueue.push({ type: 'coin', x: clampX(-dX), y: clampY(minY + maxY - dY), offsetZ: 6 });
    } else if (r < 0.12) {
      GAME.patternQueue.push({ type: 'blue', x: randX(), y: randY(), offsetZ: 0 });
    } else if (r < 0.12 + redChance) {
      GAME.patternQueue.push({ type: 'red', x: randX(), y: randY(), offsetZ: 0, weave: difficulty > 0.5 ? 1.0 : 0, phase: ph() });
    } else if (r < 0.40) {
      // 金幣斜串,鼓勵走位
      const bx = randX(), by = randY(), sx = (Math.random() - 0.5) * 0.9, sy = (Math.random() - 0.5) * 0.9;
      for (let i = 0; i < 4; i++) GAME.patternQueue.push({ type: 'coin', x: clampX(bx + sx * i), y: clampY(by + sy * i), offsetZ: i * 2.5 });
    } else if (r < 0.60) {
      // 🔧 Task2:全寬橫牆(含左右最邊),只留一個缺口
      const lanes = [minX + 0.4, minX + xRange * 0.37, maxX - xRange * 0.37, maxX - 0.4];
      const gap = Math.floor(Math.random() * lanes.length);
      const wy = randY();
      lanes.forEach((px, idx) => { if (idx !== gap) GAME.patternQueue.push({ type: 'blue', x: px, y: wy, offsetZ: 0 }); });
      GAME.patternQueue.push({ type: 'coin', x: lanes[gap], y: wy, offsetZ: 0 });
    } else if (r < 0.80) {
      // 🔧 Task2:全高直牆(含最上最下),只留一個缺口(專治上下躲藏)
      const wx = randX();
      const rows = [minY + 0.4, minY + yRange * 0.37, maxY - yRange * 0.37, maxY - 0.4];
      const gap = Math.floor(Math.random() * rows.length);
      rows.forEach((py, idx) => { if (idx !== gap) GAME.patternQueue.push({ type: 'blue', x: wx, y: py, offsetZ: 0 }); });
      GAME.patternQueue.push({ type: 'coin', x: wx, y: rows[gap], offsetZ: 0 });
      if (difficulty > 0.45) {
        const wx2 = clampX(wx + (Math.random() < 0.5 ? -2.2 : 2.2));
        const gap2 = Math.floor(Math.random() * rows.length);
        rows.forEach((py, idx) => { if (idx !== gap2) GAME.patternQueue.push({ type: 'blue', x: wx2, y: py, offsetZ: 8 }); });
      }
    } else if (r < 0.90) {
      // 🔧 Task2:上下夾擊,同時封住最上與最下,逼回中間
      const wx = randX();
      GAME.patternQueue.push({ type: 'blue', x: wx, y: maxY - 0.35, offsetZ: 0 });
      GAME.patternQueue.push({ type: 'blue', x: wx, y: minY + 0.35, offsetZ: 0 });
      GAME.patternQueue.push({ type: (Math.random() < redChance ? 'red' : 'coin'), x: wx, y: (minY + maxY) / 2, offsetZ: 0, phase: ph() });
    } else {
      // 紅球小隊(連射挑戰)
      const n = 2 + Math.floor(difficulty * 2);
      for (let i = 0; i < n; i++) GAME.patternQueue.push({ type: 'red', x: randX(), y: randY(), offsetZ: i * 4, weave: difficulty > 0.55 ? 1.1 : 0, phase: ph() });
    }
  }

  while (GAME.patternQueue.length > 0) {
    const p = GAME.patternQueue.shift();
    const mesh = createObstacleMesh(p.type);
    mesh.position = new BABYLON.Vector3(p.x, p.y, GAME_CFG.spawnZ + (p.offsetZ || 0));
    GAME.obstacles.push({ type: p.type, mesh: mesh, spawnTime: Date.now(), destroyed: false, baseX: p.x, baseY: p.y, weave: p.weave || 0, phase: p.phase || 0 });
  }
}
function updateEndlessGame(dt) {
  if (!GAME.active || GAME.gameOver) return;
  const dtFactor = dt / 16.67;
  const elapsed = (Date.now() - GAME.startTime) / 1000;
  GAME.speedMul = Math.min(GAME_CFG.maxObsSpeed / GAME_CFG.baseObsSpeed, 1 + elapsed * GAME_CFG.speedAccel) * GAME.stageSpeedMul;
  const slowFactor = isPwrActive('slow') ? 0.45 : 1;
  const currentObsSpeed = GAME_CFG.baseObsSpeed * GAME.speedMul * slowFactor;
  GAME.score += GAME_CFG.baseObsSpeed * GAME.speedMul * dtFactor * 0.5;
  GAME.spawnInterval = Math.max(GAME_CFG.minSpawnInterval, GAME_CFG.baseSpawnInterval - elapsed * 8);
  checkStageTransition();
  if (Date.now() - GAME.lastSpawn > GAME.spawnInterval) {
    spawnObstaclePattern();
    GAME.lastSpawn = Date.now();
  }
  maybeSpawnPowerup();
  spawnThrusterParticle();
  if (GAME.roadTex) GAME.roadTex.vOffset = (GAME.roadTex.vOffset || 0) + currentObsSpeed * 0.05 * dtFactor;
  updateDroneMovement(dt);
  updateSkyscrapers(currentObsSpeed, dtFactor);
  updateBullets(dt, dtFactor);
  updateMuzzleFlashes(dt);
  updatePowerups(dt, dtFactor, currentObsSpeed);
  if (GAME.shieldMesh) {
    const on = isPwrActive('shield');
    GAME.shieldMesh.setEnabled(on);
    if (on) { GAME.shieldMesh.position.copyFrom(drone.position); const s = 1 + Math.sin(Date.now() * 0.01) * 0.06; GAME.shieldMesh.scaling.set(s, s, s); }
  }
  for (let i = GAME.obstacles.length - 1; i >= 0; i--) {
    const obs = GAME.obstacles[i];
    if (obs.destroyed) { GAME.obstacles.splice(i, 1); continue; }
    obs.mesh.position.z -= currentObsSpeed * dtFactor;
    if (obs.weave) {
      obs.mesh.position.x = clampX(obs.baseX + Math.sin(Date.now() * 0.0025 + obs.phase) * obs.weave);
      obs.mesh.position.y = clampY(obs.baseY + Math.cos(Date.now() * 0.002 + obs.phase) * obs.weave * 0.5);
    }
    if (obs.type === 'red') {
      if (obs.mesh._main) { obs.mesh._main.rotation.y += 0.04 * dtFactor; obs.mesh._main.rotation.x += 0.025 * dtFactor; }
      if (obs.mesh._aura) {
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.18;
        obs.mesh._aura.scaling.x = pulse; obs.mesh._aura.scaling.y = pulse; obs.mesh._aura.scaling.z = pulse;
      }
      if (obs.mesh._beacon && obs.mesh._beacon.material) {
        const fl = Math.sin(Date.now() * 0.015) > 0;
        obs.mesh._beacon.material.emissiveColor = fl ? new BABYLON.Color3(1, 1, 0.3) : new BABYLON.Color3(1, 0.1, 0.1);
      }
    } else if (obs.type === 'coin' && obs.mesh._main) {
      obs.mesh._main.rotation.z += 0.15 * dtFactor;
    } else if (obs.type === 'blue') {
      obs.mesh.rotation.z += 0.01 * dtFactor;
    }
    const dx = obs.mesh.position.x - drone.position.x;
    const dy = obs.mesh.position.y - drone.position.y;
    const dz = obs.mesh.position.z - drone.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const hitRange = obs.type === 'red' ? 1.0 : 0.85;
    if (dist < hitRange) {
      if (obs.type === 'coin') { collectCoin(obs); obs.destroyed = true; disposeObstacle(obs); continue; }
      else {
        if (Date.now() > GAME.invincibleUntil) { hitObstacle(obs); obs.destroyed = true; disposeObstacle(obs); continue; }
      }
    }
    if (obs.mesh.position.z < GAME_CFG.despawnZ) {
      if (obs.type === 'red') GAME.combo = 0;
      obs.destroyed = true; disposeObstacle(obs);
    }
  }
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.life -= dt;
    if (p.life <= 0) { p.mesh.dispose(); GAME.particles.splice(i, 1); }
    else {
      p.mesh.position.x += p.vx * dtFactor;
      p.mesh.position.y += p.vy * dtFactor;
      p.mesh.position.z += p.vz * dtFactor;
      if (!p.isTrail) p.vy -= 0.02 * dtFactor;
      if (p.mesh.material) p.mesh.material.alpha = (p.life / p.maxLife);
      const s = (p.life / p.maxLife);
      p.mesh.scaling.x = p.mesh.scaling.y = p.mesh.scaling.z = s;
    }
  }
  updateGameCamera(dt);
  updateCrosshairTargeting();
  updateGameHUD();
  updatePowerupHUD();
}
function disposeObstacle(obs) {
  if (obs.mesh) { if (obs.mesh.getChildMeshes) obs.mesh.getChildMeshes().forEach(c => c.dispose()); obs.mesh.dispose && obs.mesh.dispose(); }
}

function updateDroneMovement(dt) {
  const dtFactor = dt / 16.67;
  let dx = 0, dy = 0;
  if (GAME.keys['KeyA'] || GAME.keys['ArrowLeft']) dx -= 1;
  if (GAME.keys['KeyD'] || GAME.keys['ArrowRight']) dx += 1;
  if (GAME.keys['KeyW'] || GAME.keys['ArrowUp']) dy += 1;
  if (GAME.keys['KeyS'] || GAME.keys['ArrowDown']) dy -= 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  const boosting = (GAME.keys['ShiftLeft'] || GAME.keys['ShiftRight']) && (dx !== 0 || dy !== 0);
  const speed = GAME_CFG.moveSpeed * dtFactor * (boosting ? 1.9 : 1);
  let newX = drone.position.x + dx * speed;
  let newY = drone.position.y + dy * speed;
  newX = Math.max(GAME_CFG.bounds.minX, Math.min(GAME_CFG.bounds.maxX, newX));
  newY = Math.max(GAME_CFG.bounds.minY, Math.min(GAME_CFG.bounds.maxY, newY));
  drone.position.x = newX; drone.position.y = newY;
  const targetRollZ = dx * (boosting ? 0.6 : 0.4);
  const targetPitchX = -dy * 0.3;
  drone.rotation.z += (targetRollZ - drone.rotation.z) * 0.15;
  drone.rotation.x += (targetPitchX - drone.rotation.x) * 0.15;
  const hitFlashing = Date.now() < GAME.invincibleUntil && !isPwrActive('shield');
  if (hitFlashing) {
    const flash = Math.sin(Date.now() * 0.02) > 0;
    drone.getChildMeshes().forEach(m => { if (m.material) m.material.alpha = flash ? 0.4 : (m.material.alpha < 0.95 ? m.material.alpha : 1); });
  } else {
    drone.getChildMeshes().forEach(m => { if (m.material && m.material.name !== 'dm' && !m.material.name.startsWith('pm')) m.material.alpha = 1; });
  }
}
function updateGameCamera(dt) {
  const targetCamX = drone.position.x * 0.5;
  const targetCamY = drone.position.y + 1.8;
  const targetCamZ = -5;
  const targetX = drone.position.x * 0.3;
  const targetY = drone.position.y - 0.3;
  const targetZ = 8;
  const camPos = camera.position;
  camPos.x += (targetCamX - camPos.x) * 0.12;
  camPos.y += (targetCamY - camPos.y) * 0.12;
  camPos.z += (targetCamZ - camPos.z) * 0.12;
  camera.position = camPos;
  const tgt = camera.getTarget();
  const newTgt = new BABYLON.Vector3(
    tgt.x + (targetX - tgt.x) * 0.15,
    tgt.y + (targetY - tgt.y) * 0.15,
    tgt.z + (targetZ - tgt.z) * 0.15,
  );
  camera.setTarget(newTgt);
}

function findRedTargetByRay(canvasX, canvasY) {
  try {
    const pick = scene.pick(canvasX, canvasY, mesh => mesh && mesh._gameType === 'red');
    if (pick && pick.hit && pick.pickedMesh && pick.pickedMesh._gameRoot) {
      const found = GAME.obstacles.find(o => o.mesh === pick.pickedMesh._gameRoot && !o.destroyed);
      if (found) return found;
    }
  } catch(e) {}
  const ray = scene.createPickingRay(canvasX, canvasY, BABYLON.Matrix.Identity(), camera);
  let bestRayObs = null;
  let bestRayDist = Infinity;
  GAME.obstacles.forEach(obs => {
    if (obs.type !== 'red' || obs.destroyed) return;
    const toObs = obs.mesh.position.subtract(camera.position);
    const proj = BABYLON.Vector3.Dot(toObs, ray.direction);
    if (proj < 0 || proj > 80) return;
    const closestOnRay = camera.position.add(ray.direction.scale(proj));
    const distToRay = BABYLON.Vector3.Distance(closestOnRay, obs.mesh.position);
    if (distToRay < 2.0 && distToRay < bestRayDist) {
      bestRayDist = distToRay;
      bestRayObs = obs;
    }
  });
  if (bestRayObs) return bestRayObs;
  let nearestObs = null;
  let nearestDist = Infinity;
  GAME.obstacles.forEach(obs => {
    if (obs.type !== 'red' || obs.destroyed) return;
    const d = BABYLON.Vector3.Distance(drone.position, obs.mesh.position);
    if (d < 50 && d < nearestDist && obs.mesh.position.z > drone.position.z - 2) {
      nearestDist = d;
      nearestObs = obs;
    }
  });
  return nearestObs;
}

function updateCrosshairTargeting() {
  const crosshair = document.getElementById('crosshair');
  if (!GAME.mouseInCanvas) { crosshair.classList.remove('target'); return; }
  const rect = canvas.getBoundingClientRect();
  const canvasX = GAME.mouseX - rect.left;
  const canvasY = GAME.mouseY - rect.top;
  let hasTarget = false;
  try {
    const pick = scene.pick(canvasX, canvasY, mesh => mesh && mesh._gameType === 'red');
    if (pick && pick.hit) hasTarget = true;
  } catch(e) {}
  if (!hasTarget) {
    const ray = scene.createPickingRay(canvasX, canvasY, BABYLON.Matrix.Identity(), camera);
    GAME.obstacles.forEach(obs => {
      if (hasTarget || obs.type !== 'red' || obs.destroyed) return;
      const toObs = obs.mesh.position.subtract(camera.position);
      const proj = BABYLON.Vector3.Dot(toObs, ray.direction);
      if (proj < 0 || proj > 80) return;
      const closestOnRay = camera.position.add(ray.direction.scale(proj));
      const distToRay = BABYLON.Vector3.Distance(closestOnRay, obs.mesh.position);
      if (distToRay < 1.5) hasTarget = true;
    });
  }
  if (hasTarget) crosshair.classList.add('target');
  else crosshair.classList.remove('target');
}

function createBulletMesh() {
  const bullet = BABYLON.MeshBuilder.CreateSphere('bullet_' + Date.now() + Math.random(), { diameter: 0.45, segments: 12 }, scene);
  bullet.isPickable = false;
  const mat = new BABYLON.StandardMaterial('bmat_' + Date.now() + Math.random(), scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.3);
  mat.emissiveColor = new BABYLON.Color3(1, 0.6, 0.15);
  mat.specularColor = new BABYLON.Color3(1, 1, 1);
  bullet.material = mat;
  const halo = BABYLON.MeshBuilder.CreateSphere('halo_' + Date.now() + Math.random(), { diameter: 0.85, segments: 10 }, scene);
  halo.parent = bullet;
halo.isPickable = false;
  const haloMat = new BABYLON.StandardMaterial('hm_' + Date.now() + Math.random(), scene);
  haloMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.1);
  haloMat.emissiveColor = new BABYLON.Color3(1, 0.4, 0.05);
  haloMat.alpha = 0.4;
  halo.material = haloMat;
  return bullet;
}

function spawnBullet(targetObs, angleOffset) {
  const startPos = new BABYLON.Vector3(drone.position.x, drone.position.y - 0.05, drone.position.z + 1.0);
  const bullet = createBulletMesh();
  bullet.position = startPos.clone();
  let initialDir;
  if (targetObs && !targetObs.destroyed) {
    initialDir = targetObs.mesh.position.subtract(startPos).normalize();
  } else {
    initialDir = new BABYLON.Vector3(0, 0, 1);
  }
  if (angleOffset) {
    const cos = Math.cos(angleOffset), sin = Math.sin(angleOffset);
    const nx = initialDir.x * cos - initialDir.z * sin;
    const nz = initialDir.x * sin + initialDir.z * cos;
    initialDir = new BABYLON.Vector3(nx, initialDir.y, nz).normalize();
  }
  const light = new BABYLON.PointLight('blight_' + Date.now() + Math.random(), startPos.clone(), scene);
  light.diffuse = new BABYLON.Color3(1, 0.6, 0.2);
  light.specular = new BABYLON.Color3(1, 0.6, 0.2);
  light.intensity = 0.9;
  light.range = 8;
  GAME.bullets.push({
    mesh: bullet, light: light, targetObs: targetObs,
    direction: initialDir, speed: GAME_CFG.bulletSpeed,
    life: GAME_CFG.bulletLife, maxLife: GAME_CFG.bulletLife, trailTimer: 0,
  });
}
function updateBullets(dt, dtFactor) {
  for (let i = GAME.bullets.length - 1; i >= 0; i--) {
    const b = GAME.bullets[i];
    b.life -= dt;
    b.trailTimer += dt;
    if (b.targetObs && !b.targetObs.destroyed && b.targetObs.mesh) {
      const toTarget = b.targetObs.mesh.position.subtract(b.mesh.position);
      if (toTarget.length() > 0.01) {
        const targetDir = toTarget.normalize();
        b.direction = b.direction.scale(1 - GAME_CFG.homingStrength)
          .add(targetDir.scale(GAME_CFG.homingStrength)).normalize();
      }
    } else if (b.targetObs && b.targetObs.destroyed) {
      b.targetObs = null;
    }
    const moveVec = b.direction.scale(b.speed * dtFactor);
    b.mesh.position.addInPlace(moveVec);
    if (b.light) b.light.position = b.mesh.position.clone();
    if (b.trailTimer >= GAME_CFG.trailInterval) {
      b.trailTimer = 0;
      const trail = BABYLON.MeshBuilder.CreateSphere('trail_' + Date.now() + Math.random(), { diameter: 0.28, segments: 6 }, scene);
      trail.position = b.mesh.position.clone();
      trail.isPickable = false;
      const tm = new BABYLON.StandardMaterial('trm_' + Date.now() + Math.random(), scene);
      tm.diffuseColor = new BABYLON.Color3(1, 0.5, 0.1);
      tm.emissiveColor = new BABYLON.Color3(1, 0.4, 0.05);
      tm.alpha = 0.7;
      trail.material = tm;
      GAME.particles.push({ mesh: trail, vx: 0, vy: 0, vz: 0, life: 300, maxLife: 300, isTrail: true });
    }
    let hit = false;
    for (let j = 0; j < GAME.obstacles.length; j++) {
      const obs = GAME.obstacles[j];
      if (obs.destroyed || obs.type !== 'red') continue;
      const d = BABYLON.Vector3.Distance(b.mesh.position, obs.mesh.position);
      if (d < GAME_CFG.bulletHitRadius) {
        destroyRedTarget(obs);
        hit = true;
        break;
      }
    }
    if (hit || b.life <= 0 || b.mesh.position.z > 70 || b.mesh.position.z < -15 || Math.abs(b.mesh.position.x) > 30) {
      if (b.mesh) {
        if (b.mesh.getChildMeshes) b.mesh.getChildMeshes().forEach(c => c.dispose());
        b.mesh.dispose();
      }
      if (b.light) b.light.dispose();
      GAME.bullets.splice(i, 1);
    }
  }
}

function destroyRedTarget(obs) {
  if (obs.destroyed) return;
  obs.destroyed = true;
  GAME.shotsHit++;
  GAME.combo++;
  if (GAME.combo > GAME.maxCombo) GAME.maxCombo = GAME.combo;
  const points = Math.floor(100 * (1 + GAME.combo * 0.2) * (1 + GAME.currentStage * 0.15));
  GAME.score += points;
  createParticles(obs.mesh.position, new BABYLON.Color3(1, 0.4, 0.3), 18);
  createParticles(obs.mesh.position, new BABYLON.Color3(1, 0.8, 0.2), 10);
  createExplosionRing(obs.mesh.position);
  showComboPopup('+' + points, '#ff5577', obs.mesh.position);
  disposeObstacle(obs);
}

function createExplosionRing(pos) {
  const ring = BABYLON.MeshBuilder.CreateTorus('expR', { diameter: 0.5, thickness: 0.15, tessellation: 16 }, scene);
  ring.position = pos.clone();
  ring.isPickable = false;
  const mat = new BABYLON.StandardMaterial('expM', scene);
  mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0.2);
  mat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.2);
  mat.alpha = 1;
  ring.material = mat;
  let t = 0;
  const expand = setInterval(() => {
    t += 0.08;
    if (t >= 1) { ring.dispose(); clearInterval(expand); return; }
    const s = 1 + t * 8;
    ring.scaling.x = s; ring.scaling.y = s; ring.scaling.z = s;
    mat.alpha = 1 - t;
  }, 20);
}

function spawnMuzzleFlash() {
  const pos = new BABYLON.Vector3(drone.position.x, drone.position.y - 0.05, drone.position.z + 0.9);
  const flash = BABYLON.MeshBuilder.CreateSphere('mf_' + Date.now(), { diameter: 0.8, segments: 8 }, scene);
  flash.position = pos.clone();
  flash.isPickable = false;
  const mat = new BABYLON.StandardMaterial('mfm_' + Date.now(), scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.4);
  mat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
  mat.alpha = 0.95;
  flash.material = mat;
  const light = new BABYLON.PointLight('mfl_' + Date.now(), pos.clone(), scene);
  light.diffuse = new BABYLON.Color3(1, 0.7, 0.2);
  light.intensity = 1.8;
  light.range = 10;
  GAME.muzzleFlashes.push({ mesh: flash, light: light, life: 150, maxLife: 150 });
}

function updateMuzzleFlashes(dt) {
  for (let i = GAME.muzzleFlashes.length - 1; i >= 0; i--) {
    const m = GAME.muzzleFlashes[i];
    m.life -= dt;
    if (m.life <= 0) {
      m.mesh.dispose();
      if (m.light) m.light.dispose();
      GAME.muzzleFlashes.splice(i, 1);
    } else {
      const t = m.life / m.maxLife;
      m.mesh.scaling.x = m.mesh.scaling.y = m.mesh.scaling.z = 1 + (1 - t) * 2;
      if (m.mesh.material) m.mesh.material.alpha = t * 0.95;
      if (m.light) m.light.intensity = t * 1.8;
      const newPos = new BABYLON.Vector3(drone.position.x, drone.position.y - 0.05, drone.position.z + 0.9);
      m.mesh.position = newPos;
      if (m.light) m.light.position = newPos.clone();
    }
  }
}

function collectCoin(obs) {
  const bonus = Math.floor(50 * (1 + GAME.combo * 0.1) * (1 + GAME.currentStage * 0.1));
  GAME.score += bonus;
  GAME.coinsCollected++;
  createParticles(obs.mesh.position, new BABYLON.Color3(1, 0.85, 0.1), 8);
  showComboPopup('+' + bonus, '#FFD700', obs.mesh.position);
}

function hitObstacle(obs) {
  GAME.lives--;
  GAME.combo = 0;
  GAME.invincibleUntil = Date.now() + GAME_CFG.invincibleDuration;
  const flash = document.getElementById('damageFlash');
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 200);
  const color = obs.type === 'blue' ? new BABYLON.Color3(0.3, 0.6, 1) : new BABYLON.Color3(1, 0.3, 0.3);
  createParticles(obs.mesh.position, color, 15);
  shakeCamera();
  if (GAME.lives <= 0) triggerGameOver();
}

function shakeCamera() {
  const origPos = camera.position.clone();
  let shakeTime = 0;
  const shakeInterval = setInterval(() => {
    shakeTime += 30;
    camera.position.x = origPos.x + (Math.random() - 0.5) * 0.3;
    camera.position.y = origPos.y + (Math.random() - 0.5) * 0.3;
    if (shakeTime > 250) clearInterval(shakeInterval);
  }, 30);
}

function triggerGameOver() {
  GAME.gameOver = true;
  GAME.active = false;
  document.getElementById('goScore').textContent = Math.floor(GAME.score);
  document.getElementById('goStage').textContent = SCENE_STAGES[GAME.currentStage].name;
  document.getElementById('goMaxCombo').textContent = '×' + GAME.maxCombo;
  const acc = GAME.shotsFired > 0 ? Math.floor((GAME.shotsHit / GAME.shotsFired) * 100) : 0;
  document.getElementById('goAccuracy').textContent = acc + '%';
  setTimeout(() => { document.getElementById('gameOverModal').classList.add('show'); }, 800);
}

function createParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const p = BABYLON.MeshBuilder.CreateSphere('par_' + Date.now() + Math.random(), { diameter: 0.15, segments: 6 }, scene);
    p.position = pos.clone();
    p.isPickable = false;
    const mat = new BABYLON.StandardMaterial('parM', scene);
    mat.emissiveColor = color;
    mat.diffuseColor = color;
    mat.alpha = 1;
    p.material = mat;
    GAME.particles.push({ mesh: p, vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.3 + 0.1, vz: (Math.random() - 0.5) * 0.3, life: 500 + Math.random() * 200, maxLife: 700 });
  }
}

function showComboPopup(text, color, pos3D) {
  const popup = document.getElementById('comboPopup');
  const screen = BABYLON.Vector3.Project(pos3D, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
  popup.style.left = screen.x + 'px';
  popup.style.top = screen.y + 'px';
  popup.style.color = color;
  popup.textContent = text;
  popup.style.opacity = '1';
  popup.style.transition = 'none';
  setTimeout(() => {
    popup.style.transition = 'opacity 0.6s ease, top 0.6s ease';
    popup.style.top = (screen.y - 60) + 'px';
    popup.style.opacity = '0';
  }, 30);
}

function handleShoot(clientX, clientY) {
  if (!GAME.active || GAME.gameOver) return;
  const cd = isPwrActive('rapid') ? GAME_CFG.shotCooldown * 0.4 : GAME_CFG.shotCooldown;
  if (Date.now() - GAME.lastShotTime < cd) return;
  GAME.lastShotTime = Date.now();
  const triple = isPwrActive('triple');
  GAME.shotsFired += triple ? 3 : 1;
  const rect = canvas.getBoundingClientRect();
  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;
  const targetObs = findRedTargetByRay(canvasX, canvasY);
  spawnMuzzleFlash();
  sfxShoot();
  if (triple) {
    spawnBullet(targetObs, 0);
    spawnBullet(targetObs, -0.14);
    spawnBullet(targetObs, 0.14);
  } else {
    spawnBullet(targetObs, 0);
  }
}
function updateGameHUD() {
  if (mode !== 'freeflight') return;
  document.getElementById('gScore').textContent = Math.floor(GAME.score).toLocaleString();
  document.getElementById('gCombo').textContent = '×' + GAME.combo;
  document.getElementById('gSpeed').textContent = GAME.speedMul.toFixed(1) + '×';
  let hearts = '';
  for (let i = 0; i < GAME.lives; i++) hearts += '❤';
  for (let i = GAME.lives; i < GAME_CFG.startLives; i++) hearts += '🖤';
  document.getElementById('gLives').textContent = hearts;
  const comboBox = document.getElementById('gComboBox');
  if (GAME.combo >= 5) comboBox.classList.add('high');
  else comboBox.classList.remove('high');
}

window.addEventListener('keydown', (e) => {
  if (mode !== 'freeflight') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
  GAME.keys[e.code] = true;
  if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (mode !== 'freeflight') return;
  GAME.keys[e.code] = false;
});
document.addEventListener('mousemove', (e) => {
  if (mode !== 'freeflight') return;
  GAME.mouseX = e.clientX;
  GAME.mouseY = e.clientY;
  GAME.mouseInCanvas = true;
  const crosshair = document.getElementById('crosshair');
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';
});
