// ============================================================
// 模式管理
// ============================================================
let mode = 'menu';

function enterMode(m) {
  initAudio();
  mode = m;
  document.getElementById('startMenu').classList.remove('show');
  if (m === 'programming') setupProgrammingMode();
  else setupFreeflightMode();
  setTimeout(() => {
    if (engine) engine.resize();
    if (workspace) Blockly.svgResize(workspace);
  }, 100);
}

function backToMenu() {
  if (busy) { stopRequested = true; setTimeout(backToMenu, 200); return; }
  if (mode === 'freeflight') stopEndlessGame();
  mode = 'menu';
  document.body.classList.remove('freeflight-mode');
  document.getElementById('startMenu').classList.add('show');
}

function setupProgrammingMode() {
  document.body.classList.remove('freeflight-mode');
  document.getElementById('blocksArea').style.display = 'flex';
  document.getElementById('divider').style.display = 'block';
  document.getElementById('levelPanel').style.display = 'block';
  document.getElementById('minimap').style.display = 'block';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('gameHud').classList.remove('show');
  document.getElementById('crosshair').classList.remove('show');
  document.getElementById('gameInstructions').classList.remove('show');
  if (targetMarker) targetMarker.setEnabled(true);
  if (startMarker) startMarker.setEnabled(true);
  if (defaultFloor) defaultFloor.setEnabled(true);
  if (defaultWalls) defaultWalls.forEach(w => w.setEnabled(true));
  if (drone && drone._nose) drone._nose.setEnabled(true); // 🔧 Task3:編程模式恢復機鼻
  if (camera) {
    camera.attachControl(canvas, true);
    camera.alpha = -Math.PI/2;
    camera.beta = Math.PI/3.2;
    camera.radius = 28;
    camera.setTarget(BABYLON.Vector3.Zero());
  }
  scene.clearColor = new BABYLON.Color4(0.05, 0.08, 0.13, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  loadLevel(currentLevel);
}

function setupFreeflightMode() {
  document.body.classList.add('freeflight-mode');
  document.getElementById('blocksArea').style.display = 'none';
  document.getElementById('divider').style.display = 'none';
  document.getElementById('levelPanel').style.display = 'none';
  document.getElementById('minimap').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('gameHud').classList.add('show');
  document.getElementById('crosshair').classList.add('show');
  document.getElementById('gameInstructions').classList.add('show');
  if (targetMarker) targetMarker.setEnabled(false);
  if (startMarker) startMarker.setEnabled(false);
  if (defaultFloor) defaultFloor.setEnabled(false);
  if (defaultWalls) defaultWalls.forEach(w => w.setEnabled(false));
  if (drone && drone._nose) drone._nose.setEnabled(false); // 🔧 Task3:無盡模式隱藏紅色機鼻
  rebuildObstacles([]);
  rebuildCheckpoints([]);
  rebuildTreasures([]);
  startEndlessGame();
}
