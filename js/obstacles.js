// ============================================================
// 🌿 障礙物 — 加高為「高牆」,確保飛行高度也擋得住(FIX 3)
// ============================================================
function createVase(gx, gz, idx) {
  const parent = new BABYLON.TransformNode('vase' + idx, scene);
  parent.position = new BABYLON.Vector3(gx * STEP, 0, gz * STEP);
  const mat = new BABYLON.StandardMaterial('vmat' + idx, scene);
  const blueShade = 0.85 + Math.random() * 0.15;
  mat.diffuseColor = new BABYLON.Color3(blueShade * 0.6, blueShade * 0.8, blueShade);
  mat.specularColor = new BABYLON.Color3(0.4, 0.55, 0.7);
  const base = BABYLON.MeshBuilder.CreateCylinder('vBase' + idx, { height: 0.35, diameterTop: 0.55, diameterBottom: 0.8 }, scene);
  base.position.y = 0.175; base.material = mat; base.parent = parent;
  const body = BABYLON.MeshBuilder.CreateCylinder('vBody' + idx, { height: 1.7, diameterTop: 0.5, diameterBottom: 0.85, tessellation: 18 }, scene);
  body.position.y = 1.15; body.material = mat; body.parent = parent;
  const bulge = BABYLON.MeshBuilder.CreateSphere('vBulge' + idx, { diameter: 0.95, segments: 16 }, scene);
  bulge.scaling.y = 1.15; bulge.position.y = 1.0; bulge.material = mat; bulge.parent = parent;
  const neck = BABYLON.MeshBuilder.CreateCylinder('vNeck' + idx, { height: 0.85, diameterTop: 0.58, diameterBottom: 0.42, tessellation: 18 }, scene);
  neck.position.y = 2.4; neck.material = mat; neck.parent = parent;
  const rim = BABYLON.MeshBuilder.CreateTorus('vRim' + idx, { diameter: 0.62, thickness: 0.09, tessellation: 18 }, scene);
  rim.position.y = 2.82; rim.material = mat; rim.parent = parent;
  return parent;
}

function createPlant(gx, gz, idx) {
  const parent = new BABYLON.TransformNode('plant' + idx, scene);
  parent.position = new BABYLON.Vector3(gx * STEP, 0, gz * STEP);
  const pot = BABYLON.MeshBuilder.CreateCylinder('pot' + idx, { height: 0.6, diameterTop: 0.75, diameterBottom: 0.55 }, scene);
  pot.position.y = 0.3;
  const pmat = new BABYLON.StandardMaterial('pmat' + idx, scene);
  pmat.diffuseColor = new BABYLON.Color3(0.55, 0.33, 0.18);
  pot.material = pmat; pot.parent = parent;
  const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk' + idx, { height: 1.5, diameterTop: 0.18, diameterBottom: 0.28 }, scene);
  trunk.position.y = 1.35;
  const tkmat = new BABYLON.StandardMaterial('tkmat' + idx, scene);
  tkmat.diffuseColor = new BABYLON.Color3(0.45, 0.3, 0.16);
  trunk.material = tkmat; trunk.parent = parent;
  const leafMat = new BABYLON.StandardMaterial('leaf' + idx, scene);
  leafMat.diffuseColor = new BABYLON.Color3(0.15, 0.55, 0.22);
  const blobs = [
    { x: 0, y: 2.15, z: 0, s: 1.2 },
    { x: 0.38, y: 2.5, z: 0.12, s: 0.85 },
    { x: -0.32, y: 2.55, z: -0.15, s: 0.9 },
    { x: 0.1, y: 2.9, z: 0.22, s: 0.72 },
    { x: -0.12, y: 2.78, z: 0.3, s: 0.6 },
  ];
  blobs.forEach((p, i) => {
    const leaf = BABYLON.MeshBuilder.CreateSphere('lf' + idx + '_' + i, { diameter: p.s, segments: 10 }, scene);
    leaf.position = new BABYLON.Vector3(p.x, p.y, p.z); leaf.material = leafMat; leaf.parent = parent;
  });
  return parent;
}

function createCheckpoint(cp, idx) {
  const parent = new BABYLON.TransformNode('cp' + idx, scene);
  parent.position = new BABYLON.Vector3(cp.gx * STEP, 0, cp.gz * STEP);
  parent._visited = false;
  const disc = BABYLON.MeshBuilder.CreateGround('cpD' + idx, { width: STEP*0.8, height: STEP*0.8 }, scene);
  const tex = new BABYLON.DynamicTexture('cpT' + idx, { width: 256, height: 256 }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = 'rgba(255,200,40,0.7)'; ctx.beginPath(); ctx.arc(128,128,110,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#5a3500'; ctx.font = 'bold 130px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cp.label || '?', 128, 128); tex.update(); tex.hasAlpha = true;
  const mat = new BABYLON.StandardMaterial('cpM' + idx, scene);
  mat.diffuseTexture = tex; mat.diffuseTexture.hasAlpha = true; mat.useAlphaFromDiffuseTexture = true;
  disc.material = mat; disc.position.y = 0.02; disc.parent = parent;
  const beam = BABYLON.MeshBuilder.CreateCylinder('cpB' + idx, { height: 3, diameterTop: 0.5, diameterBottom: 0.9 }, scene);
  beam.position.y = 1.5; beam.parent = parent;
  const bmat = new BABYLON.StandardMaterial('cpBM' + idx, scene);
  bmat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2); bmat.emissiveColor = new BABYLON.Color3(1, 0.7, 0.1); bmat.alpha = 0.25;
  beam.material = bmat;
  parent._beam = beam; parent._disc = disc;
  return parent;
}

function createTreasure(t, idx) {
  const parent = new BABYLON.TransformNode('tr' + idx, scene);
  parent.position = new BABYLON.Vector3(t.gx * STEP, 0, t.gz * STEP);
  parent._collected = false;
  const gem = BABYLON.MeshBuilder.CreatePolyhedron('gemM' + idx, { type: 1, size: 0.3 }, scene);
  gem.position.y = 1.2; gem.parent = parent;
  const gmat = new BABYLON.StandardMaterial('gemMat' + idx, scene);
  gmat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.1); gmat.emissiveColor = new BABYLON.Color3(0.6, 0.5, 0.05);
  gem.material = gmat;
  parent._gem = gem;
  return parent;
}

function rebuildObstacles(list) {
  obstacleMeshes.forEach(m => { if (m.getChildMeshes) m.getChildMeshes().forEach(c => c.dispose()); m.dispose && m.dispose(); });
  obstacleMeshes = [];
  if (!scene) return;
  list.forEach((o, i) => {
    let mesh;
    if (o.type === 'vase' || !o.type) mesh = createVase(o.gx, o.gz, i);
    else if (o.type === 'plant') mesh = createPlant(o.gx, o.gz, i);
    obstacleMeshes.push(mesh);
  });
}
function rebuildCheckpoints(list) {
  checkpointMeshes.forEach(m => { if (m.getChildMeshes) m.getChildMeshes().forEach(c => c.dispose()); m.dispose && m.dispose(); });
  checkpointMeshes = [];
  if (!scene) return;
  list.forEach((cp, i) => { checkpointMeshes.push(createCheckpoint(cp, i)); });
}
function rebuildTreasures(list) {
  treasureMeshes.forEach(m => { if (m.getChildMeshes) m.getChildMeshes().forEach(c => c.dispose()); m.dispose && m.dispose(); });
  treasureMeshes = [];
  if (!scene) return;
  list.forEach((t, i) => { treasureMeshes.push(createTreasure(t, i)); });
}

function isObstacleAt(gx, gz) {
  if (mode !== 'programming') return false;
  const lv = LEVELS[currentLevel];
  return (lv.obstacles || []).some(o => o.gx === gx && o.gz === gz);
}
function getObstacleTypeAt(gx, gz) {
  if (mode !== 'programming') return null;
  const lv = LEVELS[currentLevel];
  const o = (lv.obstacles || []).find(o => o.gx === gx && o.gz === gz);
  return o ? (o.type || 'vase') : null;
}

function changeLevel(delta) {
  const next = currentLevel + delta;
  if (next < 0 || next >= LEVELS.length) return;
  loadLevel(next);
}

function checkLevelComplete() {
  const lv = LEVELS[currentLevel];
  if (lv.check(levelStats)) { showWinModal(); return true; }
  else {
    failCounts[currentLevel]++;
    const count = failCounts[currentLevel];
    updateFailUI();
    let reason = '';
    if (!levelStats.tookOff) reason = '(尚未起飛)';
    else if (!levelStats.landed) reason = '(尚未降落)';
    else if (levelStats.hitObstacle) reason = '(撞到障礙物)';
    else if (!levelStats.atTarget) reason = '(未到達終點)';
    else if (lv.checkpoints && !levelStats.checkpointOrderCorrect) reason = '(檢查點順序錯誤)';
    else if (lv.checkpoints && levelStats.checkpointsVisitedCount < lv.checkpoints.length) reason = '(檢查點未全部經過)';
    else if (lv.treasures && levelStats.treasuresCollectedCount < lv.treasures.length) reason = '(寶物未全部收集)';
    if (count === FAIL_HINT_THRESHOLD) toast('💡 已解鎖小提示!', 'warn');
    else if (count === FAIL_ANSWER_THRESHOLD) toast('📖 已解鎖「參考答案」按鈕!', 'warn');
    else toast(`💪 再試一次 ${reason}(已試 ${count} 次)`, 'warn');
    return false;
  }
}

function showWinModal() {
  const modal = document.getElementById('winModal');
  const isLast = currentLevel === LEVELS.length - 1;
  document.getElementById('winTitle').textContent = isLast ? '🏆 全部過關!' : '🎉 過關!';
  document.getElementById('winMsg').textContent = isLast ? `你完成了所有 ${LEVELS.length} 個關卡!成為真正的 AI 無人機大師!` : `恭喜完成第 ${currentLevel + 1} 關:${LEVELS[currentLevel].name}`;
  document.getElementById('winNext').style.display = isLast ? 'none' : 'inline-block';
  modal.classList.add('show');
}
function goNextFromModal() { closeModal('winModal'); changeLevel(1); }
