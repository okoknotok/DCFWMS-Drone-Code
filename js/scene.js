// ============================================================
// 3D 場景
// ============================================================
const STEP = 1.5, GRID_W = 18, GRID_D = 14;
const HALF = STEP / 2;                       // 🔧 FIX 1: 半格偏移,讓物件落在格子中央
const FLOOR_W = GRID_W * STEP, FLOOR_D = GRID_D * STEP;
const FLY_H = 2.5;
let canvas, engine, scene, camera, drone, propellers = [];
let pos = { x: 0, z: 0 }, dir = 0;
let flying = false, busy = false, propSpeed = 0, targetProp = 0;
let stopRequested = false;
let crashed = false;                          // 🔧 FIX 3: 撞到障礙物時立即停機
let startCell = { gx: 0, gz: 0 }, targetCell = { gx: 4, gz: -3 };
let targetMarker, targetRing, startMarker;
let defaultFloor, defaultWalls = [];

function dirToRotY(d) { return d * Math.PI / 180; }

function init3D() {
  canvas = document.getElementById('renderCanvas');
  engine = new BABYLON.Engine(canvas, true, { antialias: true });
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.05, 0.08, 0.13, 1);
  camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2, Math.PI/3.2, 28, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10; camera.upperRadiusLimit = 60;
  camera.upperBetaLimit = Math.PI/2.05;
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);
  hemi.intensity = 0.7;
  const dirL = new BABYLON.DirectionalLight('d', new BABYLON.Vector3(-1,-2,-1), scene);
  dirL.intensity = 0.7; dirL.position = new BABYLON.Vector3(10,20,10);
  // 🔧 FIX 2: 固定大小的陰影視錐 + 每幀跟著無人機移動,確保任何關卡影子都會跟隨
  dirL.autoUpdateExtends = false;
  dirL.shadowMinZ = 1;
  dirL.shadowMaxZ = 60;
  dirL.orthoLeft = -8; dirL.orthoRight = 8;
  dirL.orthoTop = 8; dirL.orthoBottom = -8;
  const sg = new BABYLON.ShadowGenerator(1024, dirL);
  sg.useBlurExponentialShadowMap = true;
  createGridFloor(); createWalls(); createMarkers(); createDrone(sg);
  
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'freeflight' || !GAME.active || GAME.gameOver) return;
    if (e.button !== undefined && e.button !== 0) return;
    handleShoot(e.clientX, e.clientY);
  });
  
  let lastFrame = Date.now();
  engine.runRenderLoop(() => {
    const now = Date.now();
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;
    // 🔧 FIX 2: 讓方向光跟著無人機,維持固定相對偏移(光來自 +x,+y,+z 方向)
    if (drone) {
      dirL.position.x = drone.position.x + 10;
      dirL.position.y = drone.position.y + 20;
      dirL.position.z = drone.position.z + 10;
    }
    propSpeed += (targetProp - propSpeed) * 0.08;
    propellers.forEach((p,i) => p.rotation.y += propSpeed * (i%2===0?1:-1));
    if (targetRing) { targetRing.rotation.y += 0.02; targetRing.position.y = 0.05 + Math.sin(performance.now()*0.003)*0.05; }
    const t = performance.now() * 0.002;
    checkpointMeshes.forEach((cp, i) => { if (cp._beam && !cp._visited) { cp._beam.scaling.x = 1 + Math.sin(t + i) * 0.1; cp._beam.scaling.z = 1 + Math.sin(t + i) * 0.1; } });
    treasureMeshes.forEach((tr, i) => { if (tr._gem && !tr._collected) { tr._gem.rotation.y += 0.04; tr._gem.rotation.x += 0.02; tr._gem.position.y = 1.2 + Math.sin(t * 2 + i) * 0.2; } });
    if (mode === 'freeflight' && GAME.active && !GAME.paused) updateEndlessGame(dt);
    scene.render();
    if (mode === 'programming') drawMinimap();
  });
  window.addEventListener('resize', () => engine.resize());
}

function createGridFloor() {
  defaultFloor = BABYLON.MeshBuilder.CreateGround('ground', { width: FLOOR_W, height: FLOOR_D }, scene);
  // 🔧 FIX 1: 地板平移半格,使 gx*STEP 落在格子正中央(無人機不再站在十字交叉點上)
  defaultFloor.position.x = -HALF;
  defaultFloor.position.z = -HALF;
  const TEX = 1024;
  const tex = new BABYLON.DynamicTexture('ft', { width: TEX, height: TEX }, scene, false);
  const ctx = tex.getContext();
  const cx = TEX / GRID_W, cz = TEX / GRID_D;
  for (let i = 0; i < GRID_W; i++) for (let j = 0; j < GRID_D; j++) {
    ctx.fillStyle = ((i+j)%2===0) ? '#e8d8b8' : '#d4c098';
    ctx.fillRect(i*cx, j*cz, cx, cz);
  }
  ctx.strokeStyle = 'rgba(70,40,20,0.4)'; ctx.lineWidth = 2;
  for (let i = 0; i <= GRID_W; i++) { ctx.beginPath(); ctx.moveTo(i*cx,0); ctx.lineTo(i*cx,TEX); ctx.stroke(); }
  for (let j = 0; j <= GRID_D; j++) { ctx.beginPath(); ctx.moveTo(0,j*cz); ctx.lineTo(TEX,j*cz); ctx.stroke(); }
  tex.update();
  const mat = new BABYLON.StandardMaterial('fm', scene);
  mat.diffuseTexture = tex;
  defaultFloor.material = mat; defaultFloor.receiveShadows = true;
}

function createWalls() {
  const wmat = new BABYLON.StandardMaterial('wmat', scene);
  wmat.diffuseColor = new BABYLON.Color3(0.6, 0.7, 0.85);
  wmat.alpha = 0.18; wmat.backFaceCulling = false;
  ['back','left','right'].forEach((side) => {
    const w = side==='back' ? FLOOR_W : FLOOR_D;
    const m = BABYLON.MeshBuilder.CreatePlane(side, { width: w, height: 6 }, scene);
    // 🔧 FIX 1: 牆面也跟著地板平移半格,保持與地板邊緣對齊
    if (side==='back') m.position = new BABYLON.Vector3(-HALF, 3, -FLOOR_D/2 - HALF);
    if (side==='left') { m.position = new BABYLON.Vector3(-FLOOR_W/2 - HALF, 3, -HALF); m.rotation.y = Math.PI/2; }
    if (side==='right') { m.position = new BABYLON.Vector3(FLOOR_W/2 - HALF, 3, -HALF); m.rotation.y = -Math.PI/2; }
    m.material = wmat;
    defaultWalls.push(m);
  });
}

function createMarkers() {
  startMarker = BABYLON.MeshBuilder.CreateGround('startM', { width: STEP*0.85, height: STEP*0.85 }, scene);
  const sTex = new BABYLON.DynamicTexture('sT', { width: 256, height: 256 }, scene, false);
  const sCtx = sTex.getContext();
  sCtx.fillStyle = 'rgba(80,200,120,0.6)'; sCtx.beginPath(); sCtx.arc(128,128,110,0,Math.PI*2); sCtx.fill();
  sCtx.fillStyle = '#1a4a2a'; sCtx.font = 'bold 110px Arial'; sCtx.textAlign = 'center'; sCtx.textBaseline = 'middle';
  sCtx.fillText('S', 128, 128); sTex.update(); sTex.hasAlpha = true;
  const sm = new BABYLON.StandardMaterial('sm', scene);
  sm.diffuseTexture = sTex; sm.diffuseTexture.hasAlpha = true; sm.useAlphaFromDiffuseTexture = true;
  startMarker.material = sm; startMarker.position.y = 0.01;
  targetMarker = new BABYLON.TransformNode('tm', scene);
  const tDisc = BABYLON.MeshBuilder.CreateGround('tD', { width: STEP*0.85, height: STEP*0.85 }, scene);
  const tTex = new BABYLON.DynamicTexture('tT', { width: 256, height: 256 }, scene, false);
  const tCtx = tTex.getContext();
  tCtx.fillStyle = 'rgba(147,51,234,0.6)'; tCtx.beginPath(); tCtx.arc(128,128,110,0,Math.PI*2); tCtx.fill();
  tCtx.fillStyle = '#4a1a6a'; tCtx.font = 'bold 90px Arial'; tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle';
  tCtx.fillText('🎯', 128, 128); tTex.update(); tTex.hasAlpha = true;
  const tm = new BABYLON.StandardMaterial('tmat', scene);
  tm.diffuseTexture = tTex; tm.diffuseTexture.hasAlpha = true; tm.useAlphaFromDiffuseTexture = true;
  tDisc.material = tm; tDisc.position.y = 0.01; tDisc.parent = targetMarker;
  targetRing = BABYLON.MeshBuilder.CreateTorus('tR', { diameter: STEP*1.1, thickness: 0.08 }, scene);
  const rmat = new BABYLON.StandardMaterial('rmat', scene);
  rmat.emissiveColor = new BABYLON.Color3(0.6, 0.2, 0.9); rmat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.9);
  targetRing.material = rmat; targetRing.parent = targetMarker;
  updateMarkerPositions();
}
function cellToWorld(gx, gz) { return { x: gx * STEP, z: gz * STEP }; }
function updateMarkerPositions() {
  const s = cellToWorld(startCell.gx, startCell.gz);
  startMarker.position.x = s.x; startMarker.position.z = s.z;
  const t = cellToWorld(targetCell.gx, targetCell.gz);
  targetMarker.position.x = t.x; targetMarker.position.z = t.z;
}

function createDrone(sg) {
  drone = new BABYLON.TransformNode('drone', scene);
  const meshes = [];
  const body = BABYLON.MeshBuilder.CreateCylinder('body', { height: 0.25, diameter: 1.05, tessellation: 6 }, scene);
  body.parent = drone;
  const bm = new BABYLON.StandardMaterial('bm', scene);
  bm.diffuseColor = new BABYLON.Color3(0.18, 0.22, 0.32);
  bm.specularColor = new BABYLON.Color3(0.6, 0.7, 0.85);
  body.material = bm; meshes.push(body);
  const lowerHull = BABYLON.MeshBuilder.CreateCylinder('lh', { height: 0.15, diameterTop: 1.0, diameterBottom: 0.7, tessellation: 6 }, scene);
  lowerHull.position.y = -0.2; lowerHull.parent = drone; lowerHull.material = bm; meshes.push(lowerHull);
  const dome = BABYLON.MeshBuilder.CreateSphere('dome', { diameter: 0.62, slice: 0.5 }, scene);
  dome.position.y = 0.12; dome.parent = drone;
  const dm = new BABYLON.StandardMaterial('dm', scene);
  dm.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.9);
  dm.emissiveColor = new BABYLON.Color3(0.1, 0.35, 0.7);
  dm.alpha = 0.7; dm.specularColor = new BABYLON.Color3(1, 1, 1);
  dome.material = dm; meshes.push(dome);
  const nose = BABYLON.MeshBuilder.CreateCylinder('nose', { height: 0.55, diameterTop: 0.02, diameterBottom: 0.22 }, scene);
  nose.position = new BABYLON.Vector3(0.7, 0, 0); nose.rotation.z = -Math.PI / 2; nose.parent = drone;
  const nm = new BABYLON.StandardMaterial('nm', scene);
  nm.diffuseColor = new BABYLON.Color3(0.95, 0.2, 0.2);
  nm.emissiveColor = new BABYLON.Color3(0.55, 0.1, 0.1);
  nose.material = nm; meshes.push(nose);
  drone._nose = nose; // 🔧 Task3:供 Cyberpunk 模式隱藏
  const strip = BABYLON.MeshBuilder.CreateBox('strip', { width: 0.04, height: 0.06, depth: 0.85 }, scene);
  strip.position = new BABYLON.Vector3(0, 0.15, 0); strip.parent = drone;
  const sm = new BABYLON.StandardMaterial('strpm', scene);
  sm.emissiveColor = new BABYLON.Color3(0.3, 0.9, 1);
  strip.material = sm; meshes.push(strip);
  const thrust = BABYLON.MeshBuilder.CreateCylinder('thrust', { height: 0.08, diameterTop: 0.45, diameterBottom: 0.3 }, scene);
  thrust.position.y = -0.32; thrust.parent = drone;
  const tm = new BABYLON.StandardMaterial('tm', scene);
  tm.emissiveColor = new BABYLON.Color3(0.4, 0.7, 1);
  tm.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.9);
  thrust.material = tm; meshes.push(thrust);
  const armPositions = [{x: 0.55, z: 0.55, isFront: true},{x: 0.55, z: -0.55, isFront: true},{x: -0.55, z: 0.55, isFront: false},{x: -0.55, z: -0.55, isFront: false}];
  armPositions.forEach((p, i) => {
    const arm = BABYLON.MeshBuilder.CreateBox('a' + i, { width: 0.06, height: 0.06, depth: 0.42 }, scene);
    arm.position = new BABYLON.Vector3(p.x * 0.6, 0, p.z * 0.6);
    arm.rotation.y = Math.atan2(p.x, p.z);
    arm.parent = drone;
    const am = new BABYLON.StandardMaterial('am' + i, scene);
    am.diffuseColor = new BABYLON.Color3(0.1, 0.13, 0.18);
    arm.material = am; meshes.push(arm);
    const motor = BABYLON.MeshBuilder.CreateCylinder('m' + i, { height: 0.1, diameter: 0.18 }, scene);
    motor.position = new BABYLON.Vector3(p.x, 0.08, p.z); motor.parent = drone; motor.material = am; meshes.push(motor);
    const led = BABYLON.MeshBuilder.CreateSphere('led' + i, { diameter: 0.1, segments: 8 }, scene);
    led.position = new BABYLON.Vector3(p.x * 1.1, 0.08, p.z * 1.1); led.parent = drone;
    const ledMat = new BABYLON.StandardMaterial('lm' + i, scene);
    ledMat.emissiveColor = p.isFront ? new BABYLON.Color3(1, 0.25, 0.25) : new BABYLON.Color3(0.25, 1, 0.4);
    led.material = ledMat; meshes.push(led);
    const prop = BABYLON.MeshBuilder.CreateBox('p' + i, { width: 0.46, height: 0.015, depth: 0.04 }, scene);
    prop.position = new BABYLON.Vector3(p.x, 0.16, p.z); prop.parent = drone;
    const propM = new BABYLON.StandardMaterial('pm' + i, scene);
    propM.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.78);
    propM.alpha = 0.6;
    prop.material = propM; propellers.push(prop); meshes.push(prop);
  });
  meshes.forEach(m => sg.addShadowCaster(m));
  drone.position = new BABYLON.Vector3(0, 0.4, 0);
}

function getForwardVector() { const rad = dir * Math.PI / 180; return { dx: Math.cos(rad), dz: -Math.sin(rad) }; }
function checkBounds(x, z) { const m = 0.6; return x > -FLOOR_W/2+m && x < FLOOR_W/2-m && z > -FLOOR_D/2+m && z < FLOOR_D/2-m; }
function dirName(d) { d = ((d % 360) + 360) % 360; if (d === 0) return '→東'; if (d === 90) return '↓南'; if (d === 180) return '←西'; if (d === 270) return '↑北'; return d + '°'; }
function getCurrentCell() { return { gx: Math.round(pos.x / STEP), gz: Math.round(pos.z / STEP) }; }
function distanceToTarget() { const c = getCurrentCell(); return Math.abs(c.gx - targetCell.gx) + Math.abs(c.gz - targetCell.gz); }
function isAtTarget() { const c = getCurrentCell(); return c.gx === targetCell.gx && c.gz === targetCell.gz; }
function updateUI(state) {
  if (mode !== 'programming') return;
  document.getElementById('px').textContent = pos.x.toFixed(1);
  document.getElementById('pz').textContent = pos.z.toFixed(1);
  const c = getCurrentCell();
  document.getElementById('gx').textContent = c.gx;
  document.getElementById('gz').textContent = c.gz;
  document.getElementById('pd').textContent = dir + '°';
  document.getElementById('pdn').textContent = dirName(dir);
  document.getElementById('pdist').textContent = distanceToTarget();
  if (state) {
    const ps = document.getElementById('ps');
    ps.textContent = state; ps.className = 'status';
    if (state === '懸停' || state.includes('飛')) ps.classList.add('flying');
    if (busy) ps.classList.add('busy');
  }
}

function animate(fn, duration) {
  return new Promise(resolve => {
    const start = Date.now();
    function tick() {
      if (stopRequested) { resolve(); return; }
      const t = Math.min((Date.now() - start) / duration, 1);
      fn(1 - Math.pow(1 - t, 2));
      if (t < 1) requestAnimationFrame(tick); else resolve();
    }
    tick();
  });
}

async function takeoff() {
  if (flying) return;
  flying = true; targetProp = 0.25; updateUI('起飛中');
  if (mode === 'programming') levelStats.tookOff = true;
  const sy = drone.position.y;
  await animate(t => drone.position.y = sy + (FLY_H - sy) * t, 600);
  targetProp = 0.18; updateUI('懸停');
}
async function land() {
  if (!flying) return;
  targetProp = 0.1; updateUI('降落中');
  const sy = drone.position.y;
  await animate(t => drone.position.y = sy + (0.4 - sy) * t, 600);
  flying = false; targetProp = 0; updateUI('待機');
  if (mode === 'programming') { levelStats.landed = true; if (isAtTarget()) levelStats.atTarget = true; }
}

function checkCheckpointAt(gx, gz) {
  if (mode !== 'programming') return;
  const lv = LEVELS[currentLevel];
  if (!lv.checkpoints) return;
  lv.checkpoints.forEach((cp, idx) => {
    if (cp.gx === gx && cp.gz === gz) {
      if (levelStats.checkpointsVisitedIndices.includes(idx)) return;
      const expectedIdx = levelStats.checkpointsVisitedCount;
      if (idx !== expectedIdx) { levelStats.checkpointOrderCorrect = false; toast(`⚠️ 檢查點順序錯誤!`, 'error'); }
      else { toast(`🚩 通過檢查點 ${cp.label}`, 'success'); }
      levelStats.checkpointsVisitedIndices.push(idx);
      levelStats.checkpointsVisitedCount++;
      if (checkpointMeshes[idx]) {
        checkpointMeshes[idx]._visited = true;
        if (checkpointMeshes[idx]._beam) {
          checkpointMeshes[idx]._beam.material.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2);
          checkpointMeshes[idx]._beam.scaling.y = 0.3;
        }
      }
      updateExtrasUI();
    }
  });
}
function checkTreasureAt(gx, gz) {
  if (mode !== 'programming') return;
  const lv = LEVELS[currentLevel];
  if (!lv.treasures) return;
  lv.treasures.forEach((t, idx) => {
    if (t.gx === gx && t.gz === gz && !levelStats.treasuresCollected.includes(idx)) {
      levelStats.treasuresCollected.push(idx);
      levelStats.treasuresCollectedCount++;
      toast(`💎 收集寶石 (${levelStats.treasuresCollectedCount}/${lv.treasures.length})`, 'success');
      const tr = treasureMeshes[idx];
      if (tr) { tr._collected = true; if (tr._gem) tr._gem.setEnabled(false); }
      updateExtrasUI();
    }
  });
}

async function move(sign) {
  if (!flying) await takeoff();
  const v = getForwardVector();
  const tx = pos.x + v.dx * sign * STEP;
  const tz = pos.z + v.dz * sign * STEP;
  const ngx = Math.round(tx / STEP);
  const ngz = Math.round(tz / STEP);
  if (!checkBounds(tx, tz)) { toast('🚫 出界,無法移動', 'error'); updateUI('出界'); return false; }
  if (isObstacleAt(ngx, ngz)) {
    // 🔧 FIX 3: 障礙物是實心高牆,撞上就立即停機並判定失敗
    if (mode === 'programming') { levelStats.hitObstacle = true; crashed = true; }
    const type = getObstacleTypeAt(ngx, ngz);
    const msg = type === 'vase' ? '🏺 撞上花瓶高牆,無人機停機!' : '🌿 撞上盆栽高叢,無人機停機!';
    toast(msg, 'error'); updateUI('撞毀停機');
    return false;
  }
  updateUI(sign>0?'前進中':'後退中');
  const sx = pos.x, sz = pos.z;
  await animate(t => { pos.x = sx + (tx - sx) * t; pos.z = sz + (tz - sz) * t; drone.position.x = pos.x; drone.position.z = pos.z; updateUI(); }, 350);
  if (!stopRequested) {
    pos.x = tx; pos.z = tz;
    drone.position.x = tx; drone.position.z = tz;
    if (mode === 'programming') {
      levelStats.totalMoves++;
      checkCheckpointAt(ngx, ngz);
      checkTreasureAt(ngx, ngz);
    }
    updateUI('懸停');
    if (mode === 'programming' && isAtTarget()) {
      levelStats.atTarget = true;
      toast('🎯 到達目標位置!', 'success');
      targetProp = 0.3;
      setTimeout(() => { if (flying) targetProp = 0.18; }, 800);
    }
  }
  return true;
}

async function turn(angle) {
  if (!flying) await takeoff();
  const newDir = ((dir + angle) % 360 + 360) % 360;
  updateUI('轉向中');
  const sr = drone.rotation.y;
  const rotateRad = angle * Math.PI / 180;
  await animate(t => { drone.rotation.y = sr + rotateRad * t; }, 300);
  if (!stopRequested) { dir = newDir; drone.rotation.y = dirToRotY(dir); updateUI('懸停'); }
}

function drawMinimap() {
  const c = document.getElementById('mmCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.fillStyle = '#0a1018'; ctx.fillRect(0, 0, W, H);
  const cellW = W / GRID_W, cellH = H / GRID_D;
  ctx.strokeStyle = 'rgba(80,100,140,0.3)'; ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_W; i++) { ctx.beginPath(); ctx.moveTo(i*cellW, 0); ctx.lineTo(i*cellW, H); ctx.stroke(); }
  for (let j = 0; j <= GRID_D; j++) { ctx.beginPath(); ctx.moveTo(0, j*cellH); ctx.lineTo(W, j*cellH); ctx.stroke(); }
  const toMM = (gx, gz) => ({ x: (gx + GRID_W/2 + 0.5) * cellW, y: (-gz + GRID_D/2 - 0.5) * cellH });
  const lv = LEVELS[currentLevel];
  (lv.obstacles || []).forEach(o => {
    const m = toMM(o.gx, o.gz);
    ctx.fillStyle = o.type === 'plant' ? '#4caf50' : '#7da8d8';
    ctx.beginPath(); ctx.arc(m.x, m.y, Math.min(cellW, cellH) * 0.35, 0, Math.PI * 2); ctx.fill();
  });
  (lv.checkpoints || []).forEach((cp, idx) => {
    const m = toMM(cp.gx, cp.gz);
    const visited = levelStats.checkpointsVisitedIndices.includes(idx);
    ctx.fillStyle = visited ? '#4CAF50' : '#FFC107';
    ctx.fillRect(m.x - cellW/2 + 1, m.y - cellH/2 + 1, cellW-2, cellH-2);
    ctx.fillStyle = '#000'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cp.label, m.x, m.y);
  });
  (lv.treasures || []).forEach((t, idx) => {
    if (levelStats.treasuresCollected.includes(idx)) return;
    const m = toMM(t.gx, t.gz);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.moveTo(m.x, m.y - 4); ctx.lineTo(m.x + 4, m.y); ctx.lineTo(m.x, m.y + 4); ctx.lineTo(m.x - 4, m.y); ctx.closePath(); ctx.fill();
  });
  const sm = toMM(startCell.gx, startCell.gz);
  ctx.fillStyle = '#50C878'; ctx.fillRect(sm.x - cellW/2, sm.y - cellH/2, cellW-1, cellH-1);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('S', sm.x, sm.y);
  const tmm = toMM(targetCell.gx, targetCell.gz);
  ctx.fillStyle = '#9333EA'; ctx.fillRect(tmm.x - cellW/2, tmm.y - cellH/2, cellW-1, cellH-1);
  ctx.fillStyle = '#fff'; ctx.fillText('T', tmm.x, tmm.y);
  const dm = toMM(pos.x / STEP, pos.z / STEP);
  ctx.save(); ctx.translate(dm.x, dm.y); ctx.rotate(dir * Math.PI / 180);
  ctx.fillStyle = flying ? '#4fc3f7' : '#888';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function resetAll() {
  if (busy) { stopRequested = true; setTimeout(resetAll, 100); return; }
  crashed = false;
  if (mode === 'programming') {
    const lv = LEVELS[currentLevel];
    pos = { x: lv.start.gx * STEP, z: lv.start.gz * STEP }; dir = lv.start.dir;
    flying = false; targetProp = 0;
    levelStats = createEmptyStats();
    drone.position = new BABYLON.Vector3(pos.x, 0.4, pos.z);
    drone.rotation = new BABYLON.Vector3(0, dirToRotY(dir), 0);
    rebuildCheckpoints(lv.checkpoints || []);
    rebuildTreasures(lv.treasures || []);
    updateExtrasUI();
  }
  updateUI('待機');
  toast('🔄 已重置位置', 'info');
}
