// ============================================================
// 模式管理
// ============================================================
let mode = 'menu';

function enterMode(m) {
  initAudio();
  mode = m;
  document.getElementById('startMenu').classList.remove('show');
  if (m === 'programming') setupProgrammingMode();
  else if (m === 'freeflight') setupFreeflightMode();
  else if (m === 'builder') setupBuilderMode();
  setTimeout(() => {
    if (engine) engine.resize();
    if (workspace) Blockly.svgResize(workspace);
  }, 100);
}

function backToMenu() {
  if (busy) { stopRequested = true; setTimeout(backToMenu, 200); return; }
  if (mode === 'freeflight') stopEndlessGame();
  if (mode === 'builder') teardownBuilderMode();
  mode = 'menu';
  document.body.classList.remove('freeflight-mode', 'builder-mode');
  document.getElementById('startMenu').classList.add('show');
}

function hideBuilderUI() {
  document.getElementById('builderToolbar').classList.remove('show');
  document.getElementById('builderPalette').classList.remove('show');
  document.getElementById('builderInfo').classList.remove('show');
  document.getElementById('builderShareModal').classList.remove('show');
  if (scene) scene.onPointerObservable.removeCallback(builderPointerObs);
  builderPointerObs = null;
}

function setupProgrammingMode() {
  document.body.classList.remove('freeflight-mode', 'builder-mode');
  hideBuilderUI();
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
  document.body.classList.remove('builder-mode');
  hideBuilderUI();
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

// ============================================================
// 自訂積木定義
// ============================================================
Blockly.Blocks['event_start'] = { init: function() { this.appendDummyInput().appendField("▶ 當開始執行"); this.setNextStatement(true, null); this.setColour("#FFBF00"); }};
Blockly.Blocks['action_takeoff'] = { init: function() { this.appendDummyInput().appendField("🚀 起飛"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#4CBF56"); }};
Blockly.Blocks['action_land'] = { init: function() { this.appendDummyInput().appendField("🛬 降落"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#EC5B5B"); }};
Blockly.Blocks['action_wait'] = { init: function() { this.appendDummyInput().appendField("⏳ 等待").appendField(new Blockly.FieldNumber(500, 0, 5000, 100), "MS").appendField("毫秒"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#4CBF56"); }};
Blockly.Blocks['move_forward'] = { init: function() { this.appendDummyInput().appendField("⬆️ 前進").appendField(new Blockly.FieldNumber(1, 1, 20, 1), "STEPS").appendField("格"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#4C97FF"); }};
Blockly.Blocks['move_backward'] = { init: function() { this.appendDummyInput().appendField("⬇️ 後退").appendField(new Blockly.FieldNumber(1, 1, 20, 1), "STEPS").appendField("格"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#4C97FF"); }};
Blockly.Blocks['turn_left'] = { init: function() { this.appendDummyInput().appendField("↩️ 左轉 90°"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#4C97FF"); }};
Blockly.Blocks['turn_right'] = { init: function() { this.appendDummyInput().appendField("↪️ 右轉 90°"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#4C97FF"); }};
Blockly.Blocks['control_repeat'] = { init: function() { this.appendDummyInput().appendField("🔁 重複").appendField(new Blockly.FieldNumber(4, 1, 100, 1), "TIMES").appendField("次"); this.appendStatementInput("DO").appendField("執行"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#FFAB19"); }};
Blockly.Blocks['control_repeat_until_target'] = { init: function() { this.appendDummyInput().appendField("🎯 重複直到到達終點"); this.appendStatementInput("DO").appendField("執行"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#FFAB19"); }};
Blockly.Blocks['control_if_obstacle'] = { init: function() { this.appendDummyInput().appendField("❓ 如果前方有障礙"); this.appendStatementInput("DO").appendField("就執行"); this.appendStatementInput("ELSE").appendField("否則"); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setColour("#FFAB19"); }};
Blockly.Blocks['sense_distance'] = { init: function() { this.appendDummyInput().appendField("📏 距終點格數"); this.setOutput(true, "Number"); this.setColour("#5CB1D6"); }};
Blockly.Blocks['sense_at_target'] = { init: function() { this.appendDummyInput().appendField("✅ 已到達終點?"); this.setOutput(true, "Boolean"); this.setColour("#5CB1D6"); }};
Blockly.Blocks['sense_obstacle_ahead'] = { init: function() { this.appendDummyInput().appendField("🧱 前方有障礙?"); this.setOutput(true, "Boolean"); this.setColour("#5CB1D6"); }};

Blockly.Blocks['control_repeat_forever'] = { 
  init: function() { 
    this.appendDummyInput().appendField("♾️ 重複無限次"); 
    this.appendStatementInput("DO").appendField("執行"); 
    this.setPreviousStatement(true, null); 
    this.setNextStatement(true, null); 
    this.setColour("#FF6B9D"); 
    this.setTooltip("會一直重複,直到無人機降落為止"); 
  }
};
Blockly.Blocks['control_if'] = { 
  init: function() { 
    this.appendValueInput("COND").setCheck("Boolean").appendField("❓ 如果"); 
    this.appendStatementInput("DO").appendField("就執行"); 
    this.appendStatementInput("ELSE").appendField("否則"); 
    this.setPreviousStatement(true, null); 
    this.setNextStatement(true, null); 
    this.setColour("#FFAB19"); 
    this.setTooltip("通用條件積木,可接任何感測器"); 
  }
};
Blockly.Blocks['sense_all_collected'] = { 
  init: function() { 
    this.appendDummyInput().appendField("💎 已收集所有寶物?"); 
    this.setOutput(true, "Boolean"); 
    this.setColour("#5CB1D6"); 
  }
};

function togglePanel() { document.getElementById('levelPanel').classList.toggle('collapsed'); }

function initResizer() {
  const divider = document.getElementById('divider');
  const blocksArea = document.getElementById('blocksArea');
  let isDragging = false;
  const startDrag = (e) => { isDragging = true; divider.classList.add('dragging'); document.body.style.cursor = 'ew-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); };
  const onDrag = (e) => { if (!isDragging) return; const clientX = e.touches ? e.touches[0].clientX : e.clientX; let newWidth = window.innerWidth - clientX - 3; if (newWidth < 300) newWidth = 300; if (newWidth > window.innerWidth - 300) newWidth = window.innerWidth - 300; blocksArea.style.width = newWidth + 'px'; if (engine) engine.resize(); if (workspace) Blockly.svgResize(workspace); };
  const endDrag = () => { if (!isDragging) return; isDragging = false; divider.classList.remove('dragging'); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
  divider.addEventListener('mousedown', startDrag);
  divider.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
}

// ============================================================
// 關卡資料
// ============================================================
function B(type, fields = {}, statements = {}, values = {}, next = null) {
  let xml = `<block type="${type}">`;
  for (const [k, v] of Object.entries(fields)) xml += `<field name="${k}">${v}</field>`;
  for (const [k, v] of Object.entries(values)) xml += `<value name="${k}">${v}</value>`;
  for (const [k, v] of Object.entries(statements)) xml += `<statement name="${k}">${v}</statement>`;
  if (next) xml += `<next>${next}</next>`;
  xml += `</block>`;
  return xml;
}
function chain(...items) {
  if (items.length === 0) return '';
  let result = null;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (typeof item === 'string') { result = item; continue; }
    result = B(item.type, item.fields || {}, item.statements || {}, item.values || {}, result);
  }
  return result;
}
const TK = { type: 'action_takeoff' }, LD = { type: 'action_land' }, TL = { type: 'turn_left' }, TR = { type: 'turn_right' };
const F = (n) => ({ type: 'move_forward', fields: { STEPS: n } }), ST = { type: 'event_start' };
const V_AT_TARGET = '<block type="sense_at_target"></block>';
const V_ALL_COLLECTED = '<block type="sense_all_collected"></block>';
const V_OBSTACLE = '<block type="sense_obstacle_ahead"></block>';

const FAIL_HINT_THRESHOLD = 3, FAIL_ANSWER_THRESHOLD = 10;

const LEVELS = [
  { name: '起飛與降落', desc: '學習最基本的操作:先「起飛」,再「降落」。', goal: '完成一次起飛 → 降落', hint: '只需要兩個積木:「🚀 起飛」+「🛬 降落」。', start: { gx: -3, gz: 0, dir: 0 }, target: { gx: -3, gz: 0 }, obstacles: [], check: (s) => s.tookOff && s.landed, solutionXml: () => chain(ST, TK, LD) },
  { name: '直線前進', desc: '無人機面向「東」。試試起飛後前進 8 格,到達紫色目標!', goal: '到達 (4, 0) 並降落', hint: '由 (-4, 0) 飛到 (4, 0),X 軸距離 = 8 格。', start: { gx: -4, gz: 0, dir: 0 }, target: { gx: 4, gz: 0 }, obstacles: [], check: (s) => s.atTarget && s.landed, solutionXml: () => chain(ST, TK, F(8), LD) },
  { name: '轉個彎', desc: '目標在南面!需要前進、右轉、再前進,才能到達。', goal: '到達 (2, -3) 並降落', hint: '先東 4 → 右轉 → 南 3 → 降落。', start: { gx: -2, gz: 0, dir: 0 }, target: { gx: 2, gz: -3 }, obstacles: [], check: (s) => s.atTarget && s.landed, solutionXml: () => chain(ST, TK, F(4), TR, F(3), LD) },
  { name: '花園正方形', desc: '飛一個正方形巡邏路線!使用「🔁 重複 4 次」積木。花瓶和盆栽都是高牆,飛行時別撞上!', goal: '繞花瓶飛完正方形並返回起點 (-3, 0) 降落', hint: '「🔁 重複 4 次」包住「⬆️ 前進 3 格」+「↪️ 右轉」。', start: { gx: -3, gz: 0, dir: 0 }, target: { gx: -3, gz: 0 }, obstacles: [{ gx: -2, gz: -1, type: 'vase' }, { gx: -1, gz: -2, type: 'plant' }, { gx: 2, gz: 0, type: 'plant' }, { gx: -3, gz: 2, type: 'plant' }], check: (s) => s.tookOff && s.landed && s.atTarget && s.totalMoves >= 12, solutionXml: () => chain(ST, TK, { type: 'control_repeat', fields: { TIMES: 4 }, statements: { DO: chain(F(3), TR) } }, LD) },
  { name: '穿越花瓶陣', desc: '花瓶現在是高聳的牆,無人機無法從上方飛越,只能繞道!想辦法繞過花瓶陣到達目標。', goal: '避開花瓶到達 (4, 0) 並降落', hint: '東 3 → 右轉南 3 → 左轉東 4 → 左轉北 3 → 右轉東 1 → 降落。', start: { gx: -4, gz: 0, dir: 0 }, target: { gx: 4, gz: 0 }, obstacles: [{ gx: 0, gz: 0, type: 'vase' }, { gx: 0, gz: -1, type: 'vase' }, { gx: 0, gz: 1, type: 'vase' }, { gx: -2, gz: 2, type: 'plant' }, { gx: 2, gz: -2, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, F(3), TR, F(3), TL, F(4), TL, F(3), TR, F(1), LD) },
  { name: '智能避障', desc: '障礙物都是擋住去路的高牆!用條件判斷自動偵測前方,聰明地繞過它們(撞上會直接墜機失敗)。', goal: '自動到達 (5, -2) 並降落', hint: '「🎯 重複直到到達終點」內放「❓ 如果前方有障礙」。', start: { gx: -5, gz: -2, dir: 0 }, target: { gx: 5, gz: -2 }, obstacles: [{ gx: -2, gz: -2, type: 'vase' }, { gx: 1, gz: -2, type: 'plant' }, { gx: 3, gz: -2, type: 'vase' }, { gx: -3, gz: 0, type: 'plant' }, { gx: 0, gz: 1, type: 'vase' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, { type: 'control_repeat_until_target', statements: { DO: chain({ type: 'control_if_obstacle', statements: { DO: chain(TR, F(1), TL, F(2), TL, F(1), TR), ELSE: chain(F(1)) } }) } }, LD) },
  { name: '🌪️ 風場穿越', desc: '田地中間有風力場會吹走無人機！你要繞過風場，沿住外圍飛行到達終點。', goal: '避開風場到達 (5, 0) 並降落', hint: '東 2 → 右轉南 3 → 東 6 → 左轉北 3 → 東 2 → 降落。風場喺中間，唔好直接飛過！', start: { gx: -5, gz: 0, dir: 0 }, target: { gx: 5, gz: 0 }, obstacles: [{ gx: -1, gz: 0, type: 'windZone', direction: 'north' }, { gx: 0, gz: 0, type: 'windZone', direction: 'north' }, { gx: 1, gz: 0, type: 'windZone', direction: 'north' }, { gx: -3, gz: 2, type: 'plant' }, { gx: 3, gz: -2, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, F(2), TR, F(3), TL, F(6), TL, F(3), TR, F(2), LD) },
  { name: '環島巡邏', desc: '繞過花圃飛一個大正方形。', goal: '繞花圃一周返回起點 (-1, 2) 降落', hint: '「🔁 重複 4 次」內放「⬆️前進 4 + ↪️右轉」。', start: { gx: -1, gz: 2, dir: 0 }, target: { gx: -1, gz: 2 }, obstacles: [{ gx: 0, gz: 0, type: 'plant' }, { gx: 1, gz: 0, type: 'plant' }, { gx: 0, gz: -1, type: 'vase' }, { gx: 1, gz: -1, type: 'vase' }, { gx: -3, gz: 3, type: 'vase' }, { gx: 5, gz: -3, type: 'plant' }], check: (s) => s.tookOff && s.landed && s.atTarget && !s.hitObstacle && s.totalMoves >= 16, solutionXml: () => chain(ST, TK, { type: 'control_repeat', fields: { TIMES: 4 }, statements: { DO: chain(F(4), TR) } }, LD) },
  { name: '障礙隧道', desc: '一排花瓶 🏺 高牆攔住路。使用條件判斷自動繞過。', goal: '穿越花瓶隧道到 (6, 0) 降落', hint: '迴圈 + 條件判斷做 U 形繞路。', start: { gx: -6, gz: 0, dir: 0 }, target: { gx: 6, gz: 0 }, obstacles: [{ gx: -3, gz: 0, type: 'vase' }, { gx: 0, gz: 0, type: 'vase' }, { gx: 3, gz: 0, type: 'vase' }, { gx: -5, gz: 2, type: 'plant' }, { gx: 5, gz: 2, type: 'plant' }, { gx: -5, gz: -3, type: 'plant' }, { gx: 5, gz: -3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, { type: 'control_repeat_until_target', statements: { DO: chain({ type: 'control_if_obstacle', statements: { DO: chain(TR, F(1), TL, F(2), TL, F(1), TR), ELSE: chain(F(1)) } }) } }, LD) },
  { name: '花園迷宮', desc: '穿越複雜的花園迷宮。', goal: '從 (-6, 4) 到 (6, -4) 降落', hint: '逐步繞過每組障礙物。', start: { gx: -6, gz: 4, dir: 0 }, target: { gx: 6, gz: -4 }, obstacles: [{ gx: -2, gz: 4, type: 'vase' }, { gx: -2, gz: 3, type: 'plant' }, { gx: -2, gz: 2, type: 'vase' }, { gx: -2, gz: 1, type: 'plant' }, { gx: -3, gz: -1, type: 'vase' }, { gx: -2, gz: -1, type: 'plant' }, { gx: 1, gz: 0, type: 'vase' }, { gx: 1, gz: -1, type: 'plant' }, { gx: 4, gz: -2, type: 'vase' }, { gx: 4, gz: -3, type: 'plant' }, { gx: 4, gz: -4, type: 'vase' }, { gx: 5, gz: 1, type: 'plant' }, { gx: 2, gz: 2, type: 'vase' }, { gx: -4, gz: 0, type: 'plant' }, { gx: -5, gz: -3, type: 'vase' }, { gx: -1, gz: -3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, F(3), TR, F(4), TL, F(3), TR, F(2), TL, F(3), TL, F(2), TR, F(3), TR, F(4), LD) },
  { name: '雙檢查點巡邏', desc: '依順序經過 2 個黃色檢查點 A → B,最後到終點。', goal: '依序 A → B → 到 (4, 0) 降落', hint: '北 2 → 東 2 (A) → 南 4 → 東 4 (B) → 北 2 → 東 2。', start: { gx: -4, gz: 0, dir: 0 }, target: { gx: 4, gz: 0 }, checkpoints: [{ gx: -2, gz: 2, label: 'A' }, { gx: 2, gz: -2, label: 'B' }], obstacles: [{ gx: 0, gz: 0, type: 'vase' }, { gx: 0, gz: 1, type: 'plant' }, { gx: 0, gz: -1, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.checkpointOrderCorrect && s.checkpointsVisitedCount === 2, solutionXml: () => chain(ST, TK, TL, F(2), TR, F(2), TR, F(4), TL, F(4), TL, F(2), TR, F(2), LD) },
  { name: '寶物獵人', desc: '收集 4 顆寶石後再到終點降落。', goal: '收集全部 4 顆寶石後到 (5, 0) 降落', hint: '4 顆寶石位置:(-3, 2)、(0, 2)、(0, -2)、(3, -2)。', start: { gx: -5, gz: 0, dir: 0 }, target: { gx: 5, gz: 0 }, treasures: [{ gx: -3, gz: 2 }, { gx: 0, gz: 2 }, { gx: 0, gz: -2 }, { gx: 3, gz: -2 }], obstacles: [{ gx: -2, gz: 0, type: 'vase' }, { gx: 2, gz: 0, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.treasuresCollectedCount === 4, solutionXml: () => chain(ST, TK, TL, F(2), TR, F(5), TR, F(4), TL, F(3), TL, F(2), TR, F(2), LD) },
  { name: '🔄 螺旋收集', desc: '田地中心有 3 顆寶石！你要飛螺旋路線由外向內，收集所有寶石後降落。', goal: '收集 3 顆寶石並降落', hint: '東 5 → 右轉南 4 → 右轉西 3 → 右轉北 2 → 右轉東 1 → 降落。每段都會經過寶石！', start: { gx: -3, gz: 2, dir: 0 }, target: { gx: 0, gz: 0 }, treasures: [{ gx: 2, gz: 2 }, { gx: 2, gz: -2 }, { gx: -1, gz: -1 }], obstacles: [{ gx: 3, gz: 0, type: 'plant' }, { gx: -3, gz: -3, type: 'vase' }, { gx: 5, gz: 3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.treasuresCollectedCount === 3, solutionXml: () => chain(ST, TK, F(5), TR, F(4), TR, F(3), TR, F(2), TR, F(1), LD) },
  { name: '寶物迷宮', desc: '穿越障礙物收集 3 顆寶石,再到達終點。', goal: '收集 3 顆寶石並到 (5, 3) 降落', hint: '3 顆寶石:(-3, -2)、(0, 0)、(3, 2)。', start: { gx: -5, gz: 3, dir: 0 }, target: { gx: 5, gz: 3 }, treasures: [{ gx: -3, gz: -2 }, { gx: 0, gz: 0 }, { gx: 3, gz: 2 }], obstacles: [{ gx: -3, gz: 0, type: 'vase' }, { gx: -2, gz: 1, type: 'plant' }, { gx: -2, gz: -1, type: 'plant' }, { gx: 2, gz: 0, type: 'vase' }, { gx: 1, gz: 2, type: 'plant' }, { gx: 1, gz: -2, type: 'vase' }, { gx: 4, gz: 1, type: 'plant' }, { gx: -4, gz: 1, type: 'vase' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.treasuresCollectedCount === 3, solutionXml: () => chain(ST, TK, TR, F(4), TL, F(2), TR, F(1), TL, F(3), TL, F(3), TR, F(3), TL, F(2), TR, F(2), LD) },
  { name: '終極大師考驗', desc: '依序經過 2 個檢查點、收集 2 顆寶石、最後到達終點。', goal: 'A → B,收集所有寶石,到 (6, -3) 降落', hint: '依序串聯:檢查點 + 寶石 + 終點。', start: { gx: -6, gz: 3, dir: 0 }, target: { gx: 6, gz: -3 }, checkpoints: [{ gx: -3, gz: 2, label: 'A' }, { gx: 3, gz: 2, label: 'B' }], treasures: [{ gx: 0, gz: 0 }, { gx: 5, gz: -3 }], obstacles: [{ gx: -2, gz: 0, type: 'vase' }, { gx: -2, gz: -1, type: 'plant' }, { gx: 2, gz: -1, type: 'vase' }, { gx: 2, gz: 0, type: 'plant' }, { gx: -4, gz: -2, type: 'vase' }, { gx: 0, gz: 3, type: 'plant' }, { gx: 4, gz: 1, type: 'vase' }, { gx: -1, gz: -3, type: 'plant' }, { gx: 3, gz: -3, type: 'vase' }, { gx: 6, gz: 1, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.checkpointOrderCorrect && s.checkpointsVisitedCount === 2 && s.treasuresCollectedCount === 2, solutionXml: () => chain(ST, TK, TR, F(1), TL, F(5), TR, F(2), TL, F(1), TL, F(2), TR, F(5), TR, F(5), TL, F(1), LD) },
  
  { 
    name: '🤖 自動巡邏者(AI)', 
    desc: '不再用「前進 N 格」這種笨方法!使用全新的「♾️ 重複無限次」+「💎 已收集所有寶物?」,讓無人機像 AI 一樣自動巡邏:沿著路一直前進,撞牆就右轉,收集完所有 4 顆寶石後自動降落。',
    goal: '自動繞圈收集 4 顆寶石並降落', 
    hint: '結構:♾️重複無限次 { ❓如果(💎已收集所有寶物?) → 🛬降落; ❓如果前方有障礙 → ↪️右轉,否則 → ⬆️前進1 }。寶石和終點都在路徑上!',
    start: { gx: -4, gz: 2, dir: 0 }, 
    target: { gx: -3, gz: -2 }, 
    treasures: [
      { gx: -3, gz: 2 },
      { gx: 3, gz: 2 },
      { gx: 3, gz: -2 },
      { gx: -3, gz: -2 },
    ],
    obstacles: [
      { gx: 5, gz: 2, type: 'vase' },
      { gx: 4, gz: -3, type: 'vase' },
      { gx: -5, gz: -2, type: 'vase' },
      { gx: -4, gz: 3, type: 'vase' },
      { gx: 0, gz: 0, type: 'plant' },
      { gx: -2, gz: 0, type: 'plant' },
      { gx: 2, gz: 0, type: 'plant' },
    ], 
    check: (s) => s.landed && s.treasuresCollectedCount === 4 && !s.hitObstacle && s.atTarget,
    solutionXml: () => chain(
      ST, TK,
      { type: 'control_repeat_forever', statements: {
        DO: chain(
          { type: 'control_if', values: { COND: V_ALL_COLLECTED }, statements: { DO: chain(LD), ELSE: '' } },
          { type: 'control_if_obstacle', statements: { DO: chain(TR), ELSE: chain(F(1)) } }
        )
      }}
    )
  },
  
  {
    name: '🛰️ 環島自動巡邏',
    desc: '更進階的 AI 巡邏!使用「♾️ 重複無限次」+「❓ 如果(✅ 已到達終點?)」。無人機沿著外圈 CW 方向自動飛行,沿路收集 3 顆寶石、依序通過 3 個檢查點 A → B → C,最後到達終點降落。',
    goal: 'A → B → C 順序通過 + 收集 3 寶石 + 終點降落',
    hint: '結構:♾️重複無限次 { ❓如果(✅已到達終點?) → 🛬降落; ❓如果前方有障礙 → ↪️右轉,否則 → ⬆️前進1 }。所有寶石和檢查點都在路徑上,自然會收集到!',
    start: { gx: -5, gz: 3, dir: 0 },
    target: { gx: -5, gz: 0 },
    checkpoints: [
      { gx: 0, gz: 3, label: 'A' },
      { gx: 5, gz: 0, label: 'B' },
      { gx: 0, gz: -3, label: 'C' },
    ],
    treasures: [
      { gx: -2, gz: 3 },
      { gx: 5, gz: -1 },
      { gx: -2, gz: -3 },
    ],
    obstacles: [
      { gx: 6, gz: 3, type: 'vase' },
      { gx: 5, gz: -4, type: 'vase' },
      { gx: -6, gz: -3, type: 'vase' },
      { gx: -5, gz: 4, type: 'vase' },
      { gx: 0, gz: 0, type: 'plant' },
      { gx: -3, gz: 0, type: 'plant' },
      { gx: 3, gz: 0, type: 'plant' },
      { gx: 0, gz: 2, type: 'plant' },
      { gx: 0, gz: -2, type: 'plant' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle && 
                  s.checkpointOrderCorrect && s.checkpointsVisitedCount === 3 &&
                  s.treasuresCollectedCount === 3,
    solutionXml: () => chain(
      ST, TK,
      { type: 'control_repeat_forever', statements: {
        DO: chain(
          { type: 'control_if', values: { COND: V_AT_TARGET }, statements: { DO: chain(LD), ELSE: '' } },
          { type: 'control_if_obstacle', statements: { DO: chain(TR), ELSE: chain(F(1)) } }
        )
      }}
    )
  },
  
  {
    name: '🧠 終極自動探索',
    desc: '終極挑戰!路徑非常大,終點在第 1 圈就會經過,但要等到收集完所有 5 顆寶石才能降落。這需要 ✨ 巢狀條件:「如果到達終點 → 如果也收集完所有寶物 → 降落」。意思是必須繞 2 圈才能完成!',
    goal: '繞 2 圈 + 4 檢查點順序 + 5 寶石 + 在終點降落',
    hint: '解法:♾️重複無限次 { ❓如果(✅到達終點?) { ❓如果(💎已收集所有寶物?) → 🛬降落 }; ❓如果前方有障礙 → ↪️右轉,否則 → ⬆️前進1 }。注意是兩層巢狀的「如果」!',
    start: { gx: -6, gz: 4, dir: 0 },
    target: { gx: 0, gz: 4 },
    checkpoints: [
      { gx: -3, gz: 4, label: 'A' },
      { gx: 6, gz: -2, label: 'B' },
      { gx: 0, gz: -4, label: 'C' },
      { gx: -6, gz: -2, label: 'D' },
    ],
    treasures: [
      { gx: 3, gz: 4 },
      { gx: 6, gz: 0 },
      { gx: 3, gz: -4 },
      { gx: -3, gz: -4 },
      { gx: -6, gz: 0 },
    ],
    obstacles: [
      { gx: 7, gz: 4, type: 'vase' },
      { gx: 6, gz: -5, type: 'vase' },
      { gx: -7, gz: -4, type: 'vase' },
      { gx: -6, gz: 5, type: 'vase' },
      { gx: -3, gz: 0, type: 'plant' },
      { gx: 3, gz: 0, type: 'plant' },
      { gx: 0, gz: 0, type: 'plant' },
      { gx: -3, gz: 2, type: 'plant' },
      { gx: 3, gz: 2, type: 'plant' },
      { gx: -3, gz: -2, type: 'plant' },
      { gx: 3, gz: -2, type: 'plant' },
      { gx: 0, gz: 2, type: 'vase' },
      { gx: 0, gz: -2, type: 'vase' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle &&
                  s.checkpointOrderCorrect && s.checkpointsVisitedCount === 4 &&
                  s.treasuresCollectedCount === 5,
    solutionXml: () => chain(
      ST, TK,
      { type: 'control_repeat_forever', statements: {
        DO: chain(
          { type: 'control_if', values: { COND: V_AT_TARGET }, statements: { 
            DO: chain({ type: 'control_if', values: { COND: V_ALL_COLLECTED }, statements: { DO: chain(LD), ELSE: '' } }),
            ELSE: ''
          } },
          { type: 'control_if_obstacle', statements: { DO: chain(TR), ELSE: chain(F(1)) } }
        )
      }}
    )
  },
  
  {
    name: '🪞 鏡像對稱',
    desc: '起點同終點對稱，中間有對稱嘅障礙物陣。你要飛一個鏡像路線，考驗空間感！',
    goal: '從 (-5, 0) 飛到 (5, 0) 並降落',
    hint: '東 3 → 右轉南 2 → 東 4 → 左轉北 2 → 東 3 → 降落。注意障礙物對稱分佈！',
    start: { gx: -5, gz: 0, dir: 0 },
    target: { gx: 5, gz: 0 },
    obstacles: [
      { gx: -2, gz: 1, type: 'vase' }, { gx: -2, gz: -1, type: 'vase' },
      { gx: 2, gz: 1, type: 'vase' }, { gx: 2, gz: -1, type: 'vase' },
      { gx: 0, gz: 2, type: 'plant' }, { gx: 0, gz: -2, type: 'plant' },
      { gx: -4, gz: 3, type: 'plant' }, { gx: 4, gz: -3, type: 'plant' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle,
    solutionXml: () => chain(ST, TK, F(3), TR, F(2), TL, F(4), TL, F(2), TR, F(3), LD)
  },
  
  {
    name: '🚧 智能巡邏隊',
    desc: '田地有 4 個檢查點要依序通過！你要規劃最有效率嘅路線，用迴圈簡化程式。',
    goal: '依序 A → B → C → D 通過所有檢查點並降落',
    hint: '用「🔁 重複 4 次」包位「前進 4 + 右轉」，每次右轉後都會到達下一個檢查點！',
    start: { gx: -4, gz: -4, dir: 0 },
    target: { gx: -4, gz: -4 },
    checkpoints: [
      { gx: 0, gz: -4, label: 'A' },
      { gx: 4, gz: -4, label: 'B' },
      { gx: 4, gz: 0, label: 'C' },
      { gx: 0, gz: 0, label: 'D' },
    ],
    obstacles: [
      { gx: -2, gz: -2, type: 'electricFence' },
      { gx: 2, gz: -2, type: 'electricFence' },
      { gx: -2, gz: 2, type: 'plant' },
      { gx: 2, gz: 2, type: 'plant' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.checkpointOrderCorrect && s.checkpointsVisitedCount === 4,
    solutionXml: () => chain(ST, TK, { type: 'control_repeat', fields: { TIMES: 4 }, statements: { DO: chain(F(4), TR) } }, LD)
  },
  
  {
    name: '💎 寶石+檢查點混合挑戰',
    desc: '收集 3 顆寶石 + 依序通過 3 個檢查點！規劃最短路線，考驗策略思維。',
    goal: 'A → B → C 順序通過 + 收集 3 寶石 + 到 (6, 0) 降落',
    hint: '寶石位置:(-4, 2)、(0, 2)、(4, -2)。檢查點:(-2, 2)=A、(2, 2)=B、(4, 0)=C。先收集寶石再過檢查點！',
    start: { gx: -6, gz: 0, dir: 0 },
    target: { gx: 6, gz: 0 },
    checkpoints: [
      { gx: -2, gz: 2, label: 'A' },
      { gx: 2, gz: 2, label: 'B' },
      { gx: 4, gz: 0, label: 'C' },
    ],
    treasures: [
      { gx: -4, gz: 2 },
      { gx: 0, gz: 2 },
      { gx: 4, gz: -2 },
    ],
    obstacles: [
      { gx: -3, gz: 0, type: 'vase' }, { gx: -1, gz: 0, type: 'plant' },
      { gx: 1, gz: 0, type: 'vase' }, { gx: 3, gz: 0, type: 'plant' },
      { gx: 0, gz: -2, type: 'vase' }, { gx: -5, gz: -2, type: 'plant' },
      { gx: 5, gz: 2, type: 'plant' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle && 
                  s.checkpointOrderCorrect && s.checkpointsVisitedCount === 3 &&
                  s.treasuresCollectedCount === 3,
    solutionXml: () => chain(ST, TK, TL, F(2), TR, F(6), TR, F(4), TL, F(2), TL, F(2), TR, F(4), LD)
  },
  
  {
    name: '⚡ 電網迷宮',
    desc: '田地佈滿電網同激光！你要小心繞過，撞到会即時失敗。',
    goal: '避開所有電網和激光到達 (5, -3) 並降落',
    hint: '東 2 → 右轉南 2 → 東 4 → 左轉南 1 → 東 1 → 降落。注意激光是橫向的，要從側面繞過！',
    start: { gx: -5, gz: 0, dir: 0 },
    target: { gx: 5, gz: -3 },
    obstacles: [
      { gx: -2, gz: 0, type: 'electricFence' }, { gx: -2, gz: -1, type: 'electricFence' },
      { gx: 0, gz: 1, type: 'laserBeam', direction: 'horizontal' },
      { gx: 2, gz: -2, type: 'electricFence' }, { gx: 2, gz: -3, type: 'electricFence' },
      { gx: 4, gz: 0, type: 'laserBeam', direction: 'horizontal' },
      { gx: -3, gz: -3, type: 'plant' }, { gx: 3, gz: 2, type: 'vase' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle,
    solutionXml: () => chain(ST, TK, F(2), TR, F(2), TL, F(4), TL, F(1), TR, F(1), LD)
  },
  
  {
    name: '🏰 終極迷宮逃脫',
    desc: '最複雜嘅迷宮！12 個障礙物 + 2 個檢查點 + 2 顆寶石，要規劃完整路線。',
    goal: 'A → B 順序通過 + 收集 2 寶石 + 到 (6, -4) 降落',
    hint: '逐步繞過每組障礙物，先過檢查點再收集寶石。需要多個轉彎同迴圈！',
    start: { gx: -6, gz: 4, dir: 0 },
    target: { gx: 6, gz: -4 },
    checkpoints: [
      { gx: -2, gz: 2, label: 'A' },
      { gx: 2, gz: -2, label: 'B' },
    ],
    treasures: [
      { gx: 0, gz: 0 },
      { gx: 4, gz: -2 },
    ],
    obstacles: [
      { gx: -4, gz: 4, type: 'vase' }, { gx: -4, gz: 3, type: 'plant' },
      { gx: -2, gz: 0, type: 'vase' }, { gx: -2, gz: -1, type: 'plant' },
      { gx: 0, gz: 2, type: 'vase' }, { gx: 0, gz: -2, type: 'plant' },
      { gx: 2, gz: 0, type: 'vase' }, { gx: 2, gz: -4, type: 'plant' },
      { gx: 4, gz: 2, type: 'vase' }, { gx: 4, gz: -4, type: 'plant' },
      { gx: -1, gz: -3, type: 'vase' }, { gx: 3, gz: 3, type: 'plant' },
    ],
    check: (s) => s.atTarget && s.landed && !s.hitObstacle && 
                  s.checkpointOrderCorrect && s.checkpointsVisitedCount === 2 &&
                  s.treasuresCollectedCount === 2,
    solutionXml: () => chain(ST, TK, TR, F(2), TL, F(4), TR, F(4), TR, F(2), TL, F(2), TL, F(2), TR, F(4), TR, F(2), LD)
  },
];

let currentLevel = 0;
let levelStats = createEmptyStats();
let failCounts = LEVELS.map(() => 0);
let obstacleMeshes = [], checkpointMeshes = [], treasureMeshes = [];

function createEmptyStats() { return { tookOff: false, landed: false, atTarget: false, hitObstacle: false, totalMoves: 0, checkpointsVisitedCount: 0, checkpointsVisitedIndices: [], checkpointOrderCorrect: true, treasuresCollectedCount: 0, treasuresCollected: [], }; }

function loadLevel(idx) {
  if (busy) { stopRequested = true; setTimeout(() => loadLevel(idx), 150); return; }
  currentLevel = Math.max(0, Math.min(LEVELS.length - 1, idx));
  const lv = LEVELS[currentLevel];
  startCell = { gx: lv.start.gx, gz: lv.start.gz };
  targetCell = { gx: lv.target.gx, gz: lv.target.gz };
  pos = { x: lv.start.gx * STEP, z: lv.start.gz * STEP };
  dir = lv.start.dir;
  flying = false; targetProp = 0; crashed = false;
  levelStats = createEmptyStats();
  if (drone) {
    drone.position = new BABYLON.Vector3(pos.x, 0.4, pos.z);
    drone.rotation = new BABYLON.Vector3(0, dirToRotY(dir), 0);
  }
  if (targetMarker) updateMarkerPositions();
  rebuildObstacles(lv.obstacles || []);
  rebuildCheckpoints(lv.checkpoints || []);
  rebuildTreasures(lv.treasures || []);
  document.getElementById('lvNum').textContent = currentLevel + 1;
  document.getElementById('lvName').textContent = lv.name;
  document.getElementById('lvDesc').textContent = lv.desc;
  document.getElementById('lvGoal').textContent = lv.goal;
  document.getElementById('lvPrev').disabled = currentLevel === 0;
  document.getElementById('lvNext').disabled = currentLevel === LEVELS.length - 1;
  document.getElementById('lvSelect').value = currentLevel;
  if (workspace) clearBlocks();
  updateFailUI(); updateExtrasUI(); updateUI('待機');
  toast(`📘 載入第 ${currentLevel + 1} 關:${lv.name}`, 'success');
}

function updateFailUI() {
  if (mode !== 'programming') return;
  const count = failCounts[currentLevel];
  const lv = LEVELS[currentLevel];
  const failInfo = document.getElementById('failInfo');
  const hintBox = document.getElementById('hintBox');
  const ansBtn = document.getElementById('ansBtn');
  if (count > 0) { failInfo.style.display = 'block'; document.getElementById('failNum').textContent = count; }
  else { failInfo.style.display = 'none'; }
  if (count >= FAIL_HINT_THRESHOLD && lv.hint) { hintBox.classList.add('show'); document.getElementById('hintText').textContent = lv.hint; }
  else { hintBox.classList.remove('show'); }
  if (count >= FAIL_ANSWER_THRESHOLD && lv.solutionXml) ansBtn.classList.add('show');
  else ansBtn.classList.remove('show');
}

function updateExtrasUI() {
  if (mode !== 'programming') return;
  const lv = LEVELS[currentLevel];
  const extras = document.getElementById('extrasInfo');
  const hasCp = lv.checkpoints && lv.checkpoints.length > 0;
  const hasTr = lv.treasures && lv.treasures.length > 0;
  if (!hasCp && !hasTr) { extras.style.display = 'none'; return; }
  extras.style.display = 'block';
  let html = '';
  if (hasCp) { html += `🚩 檢查點: ${levelStats.checkpointsVisitedCount}/${lv.checkpoints.length}`; if (!levelStats.checkpointOrderCorrect) html += ' <span style="color:#ff6080">⚠️順序錯</span>'; }
  if (hasTr) { if (html) html += ' &nbsp;|&nbsp; '; html += `💎 寶物: ${levelStats.treasuresCollectedCount}/${lv.treasures.length}`; }
  extras.innerHTML = html;
}

function askShowAnswer() { document.getElementById('ansModal').classList.add('show'); }
function applyAnswer() {
  closeModal('ansModal');
  const lv = LEVELS[currentLevel];
  if (!lv.solutionXml) { toast('⚠️ 本關尚未提供參考答案', 'warn'); return; }
  workspace.clear();
  const xml = `<xml>${lv.solutionXml().replace(/<block /, '<block x="40" y="40" ')}</xml>`;
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
  toast('📖 已載入參考答案,按「▶ 執行」查看結果', 'success');
}
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

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

function createElectricFence(gx, gz, idx) {
  const parent = new BABYLON.TransformNode('ef' + idx, scene);
  parent.position = new BABYLON.Vector3(gx * STEP, 0, gz * STEP);
  // 兩根柱子
  const post1 = BABYLON.MeshBuilder.CreateCylinder('efPost1_' + idx, { height: 2.5, diameter: 0.15 }, scene);
  post1.position = new BABYLON.Vector3(-0.4, 1.25, 0); post1.parent = parent;
  const post2 = BABYLON.MeshBuilder.CreateCylinder('efPost2_' + idx, { height: 2.5, diameter: 0.15 }, scene);
  post2.position = new BABYLON.Vector3(0.4, 1.25, 0); post2.parent = parent;
  const postMat = new BABYLON.StandardMaterial('efPostMat' + idx, scene);
  postMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  post1.material = postMat; post2.material = postMat;
  // 電線（發光）
  for (let i = 0; i < 3; i++) {
    const wire = BABYLON.MeshBuilder.CreateCylinder('efWire' + idx + '_' + i, { height: 0.8, diameter: 0.03 }, scene);
    wire.position = new BABYLON.Vector3(0, 0.6 + i * 0.6, 0);
    wire.rotation.z = Math.PI / 2;
    wire.parent = parent;
    const wireMat = new BABYLON.StandardMaterial('efWireMat' + idx + '_' + i, scene);
    wireMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0.1);
    wireMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0);
    wire.material = wireMat;
  }
  return parent;
}

function createLaserBeam(gx, gz, idx, direction = 'horizontal') {
  const parent = new BABYLON.TransformNode('lb' + idx, scene);
  parent.position = new BABYLON.Vector3(gx * STEP, 0, gz * STEP);
  // 發射器
  const emitter = BABYLON.MeshBuilder.CreateBox('lbEmitter' + idx, { width: 0.3, height: 0.3, depth: 0.3 }, scene);
  emitter.position.y = 1.5; emitter.parent = parent;
  const emitMat = new BABYLON.StandardMaterial('lbEmitMat' + idx, scene);
  emitMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  emitMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
  emitter.material = emitMat;
  // 激光束
  const beamLen = direction === 'horizontal' ? 2.5 : 2.5;
  const beam = BABYLON.MeshBuilder.CreateCylinder('lbBeam' + idx, { height: beamLen, diameter: 0.08 }, scene);
  beam.position.y = 1.5;
  beam.rotation.z = direction === 'horizontal' ? Math.PI / 2 : 0;
  beam.parent = parent;
  const beamMat = new BABYLON.StandardMaterial('lbBeamMat' + idx, scene);
  beamMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
  beamMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
  beamMat.alpha = 0.7;
  beam.material = beamMat;
  return parent;
}

function createWindZone(gx, gz, idx, direction = 'east') {
  const parent = new BABYLON.TransformNode('wz' + idx, scene);
  parent.position = new BABYLON.Vector3(gx * STEP, 0, gz * STEP);
  // 風力場區域（半透明）
  const zone = BABYLON.MeshBuilder.CreateBox('wzZone' + idx, { width: STEP * 0.9, height: 3, depth: STEP * 0.9 }, scene);
  zone.position.y = 1.5; zone.parent = parent;
  const zoneMat = new BABYLON.StandardMaterial('wzZoneMat' + idx, scene);
  zoneMat.diffuseColor = new BABYLON.Color3(0.5, 0.8, 1);
  zoneMat.emissiveColor = new BABYLON.Color3(0.3, 0.6, 1);
  zoneMat.alpha = 0.2;
  zone.material = zoneMat;
  // 風向箭頭
  const arrow = BABYLON.MeshBuilder.CreateCylinder('wzArrow' + idx, { height: 0.8, diameterTop: 0.1, diameterBottom: 0.3 }, scene);
  arrow.position.y = 1.5; arrow.parent = parent;
  if (direction === 'east') arrow.rotation.z = -Math.PI / 2;
  else if (direction === 'west') arrow.rotation.z = Math.PI / 2;
  else if (direction === 'north') arrow.rotation.x = Math.PI / 2;
  else if (direction === 'south') arrow.rotation.x = -Math.PI / 2;
  const arrowMat = new BABYLON.StandardMaterial('wzArrowMat' + idx, scene);
  arrowMat.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);
  arrow.material = arrowMat;
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
    else if (o.type === 'electricFence') mesh = createElectricFence(o.gx, o.gz, i);
    else if (o.type === 'laserBeam') mesh = createLaserBeam(o.gx, o.gz, i, o.direction);
    else if (o.type === 'windZone') mesh = createWindZone(o.gx, o.gz, i, o.direction);
    else mesh = createVase(o.gx, o.gz, i);
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

// ============================================================
// 解釋器
// ============================================================
// 🐛 FIX: obstacleAhead 偵測方向必須與 move() 一致
// 舊版錯誤地用 -v.dz,導致南北方向偵測反了 → 16/17/18 關走南會撞牆
function obstacleAhead() {
  const v = getForwardVector();
  const cur = getCurrentCell();
  const ng = { gx: cur.gx + Math.round(v.dx), gz: cur.gz + Math.round(v.dz) };
  return isObstacleAt(ng.gx, ng.gz);
}

function evalValueBlock(block) {
  if (!block) return false;
  switch (block.type) {
    case 'sense_obstacle_ahead': return obstacleAhead();
    case 'sense_at_target': return isAtTarget();
    case 'sense_all_collected': {
      const lv = LEVELS[currentLevel];
      if (!lv.treasures || lv.treasures.length === 0) return true;
      return levelStats.treasuresCollectedCount >= lv.treasures.length;
    }
    case 'sense_distance': return distanceToTarget();
  }
  return null;
}

async function execBlock(block) {
  if (!block || stopRequested || crashed) return;
  if (block.addSelect) block.addSelect();
  try {
    switch(block.type) {
      case 'event_start': break;
      case 'action_takeoff': await takeoff(); break;
      case 'action_land': await land(); break;
      case 'action_wait': { await sleep(parseInt(block.getFieldValue('MS'))); break; }
      case 'move_forward': { const n = parseInt(block.getFieldValue('STEPS')); for (let i = 0; i < n; i++) { if (stopRequested || crashed) break; if (!await move(1)) break; } break; }
      case 'move_backward': { const n = parseInt(block.getFieldValue('STEPS')); for (let i = 0; i < n; i++) { if (stopRequested || crashed) break; if (!await move(-1)) break; } break; }
      case 'turn_left': await turn(-90); break;
      case 'turn_right': await turn(90); break;
      case 'control_repeat': { 
        const times = parseInt(block.getFieldValue('TIMES')); 
        const inner = block.getInputTargetBlock('DO'); 
        for (let i = 0; i < times; i++) { 
          if (stopRequested || crashed) break; 
          if (levelStats.tookOff && !flying) break;
          await execChain(inner); 
        } 
        break; 
      }
      case 'control_repeat_until_target': { 
        const inner = block.getInputTargetBlock('DO'); 
        let safety = 0; 
        while (!isAtTarget() && safety < 300 && !stopRequested && !crashed) { 
          if (levelStats.tookOff && !flying) break;
          await execChain(inner); 
          safety++; 
        } 
        break; 
      }
      case 'control_repeat_forever': {
        const inner = block.getInputTargetBlock('DO');
        let safety = 0;
        while (safety < 800 && !stopRequested && !crashed) {
          if (levelStats.tookOff && !flying) break;
          await execChain(inner);
          safety++;
        }
        if (safety >= 800) toast('⚠️ 重複無限次達到安全上限 (800 次),自動停止', 'warn');
        break;
      }
      case 'control_if': {
        const condBlock = block.getInputTargetBlock('COND');
        const cond = evalValueBlock(condBlock);
        if (cond) await execChain(block.getInputTargetBlock('DO'));
        else await execChain(block.getInputTargetBlock('ELSE'));
        break;
      }
      case 'control_if_obstacle': { 
        if (obstacleAhead()) await execChain(block.getInputTargetBlock('DO')); 
        else await execChain(block.getInputTargetBlock('ELSE')); 
        break; 
      }
    }
  } finally { if (block.removeSelect) block.removeSelect(); }
}

async function execChain(block) {
  while (block && !stopRequested && !crashed) {
    if (levelStats.tookOff && !flying && 
        block.type !== 'event_start' && 
        block.type !== 'action_takeoff' &&
        block.type !== 'action_wait') {
      break;
    }
    await execBlock(block);
    block = block.getNextBlock();
  }
}

function sleep(ms) { return new Promise(r => { const start = Date.now(); const check = () => { if (stopRequested) return r(); if (Date.now() - start >= ms) return r(); requestAnimationFrame(check); }; check(); }); }

function toast(msg, type='info') {
  const container = document.getElementById('toast');
  const div = document.createElement('div');
  div.className = 'toast-msg toast-' + type;
  div.innerHTML = msg;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

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

// ============================================================
// Blockly
// ============================================================
let workspace;
function initBlockly() {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    grid: { spacing: 20, length: 3, colour: '#ddd', snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.4 },
    trashcan: true,
    renderer: 'zelos',
  });
  const xml = `<xml><block type="event_start" x="40" y="40"></block></xml>`;
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
}

function clearBlocks() {
  workspace.clear();
  const xml = `<xml><block type="event_start" x="40" y="40"></block></xml>`;
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
}

async function runProgram() {
  if (busy) return;
  const topBlocks = workspace.getTopBlocks(true);
  const startBlock = topBlocks.find(b => b.type === 'event_start');
  if (!startBlock) { toast('⚠️ 找不到「▶ 當開始執行」', 'warn'); return; }
  resetAll();
  await sleep(300);
  busy = true; stopRequested = false; crashed = false;
  document.getElementById('btnRun').disabled = true;
  document.getElementById('btnStop').disabled = false;
  try {
    await execChain(startBlock);
    if (crashed) { toast('💥 無人機撞毀,本次任務失敗', 'error'); setTimeout(() => checkLevelComplete(), 400); }
    else if (!stopRequested) { toast('✅ 程式執行完成', 'success'); setTimeout(() => checkLevelComplete(), 400); }
    else { toast('⏹ 程式被中止', 'warn'); }
  } catch(e) { toast('❌ 錯誤: ' + e.message, 'error'); console.error(e); }
  finally {
    busy = false; stopRequested = false;
    document.getElementById('btnRun').disabled = false;
    document.getElementById('btnStop').disabled = true;
    workspace.getAllBlocks().forEach(b => b.removeSelect && b.removeSelect());
    updateUI();
  }
}
function stopProgram() { stopRequested = true; }

function buildLevelSelector() {
  const sel = document.getElementById('lvSelect');
  LEVELS.forEach((lv, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `第 ${i+1} 關 - ${lv.name}`;
    sel.appendChild(opt);
  });
}

// ============================================================
// 🏗️ Builder Mode (沙盒關卡設計)
// ============================================================
let builderActive = false;
let builderTool = 'vase'; // 當前工具: vase, plant, checkpoint, treasure, start, target, erase
let builderObstacles = [];
let builderCheckpoints = [];
let builderTreasures = [];
let builderStart = { gx: 0, gz: 0, dir: 0 };
let builderTarget = { gx: 4, gz: -3 };
let builderMeshes = [];
let builderPointerObs = null;
let builderGhost = null;
let builderCheckpointIdx = 0;

const BUILDER_TOOLS = [
  { id: 'vase', icon: '🏺', label: '花瓶', cat: 'obstacle' },
  { id: 'plant', icon: '🌿', label: '盆栽', cat: 'obstacle' },
  { id: 'electricFence', icon: '⚡', label: '電網', cat: 'obstacle' },
  { id: 'laserBeam', icon: '🔴', label: '激光', cat: 'obstacle' },
  { id: 'windZone', icon: '🌪️', label: '風場', cat: 'obstacle' },
  { id: 'checkpoint', icon: '🚩', label: '檢查點', cat: 'special' },
  { id: 'treasure', icon: '💎', label: '寶石', cat: 'special' },
  { id: 'start', icon: '🟢', label: '起點', cat: 'pos' },
  { id: 'target', icon: '🎯', label: '終點', cat: 'pos' },
  { id: 'erase', icon: '🧹', label: '清除', cat: 'tool' },
];

function setupBuilderMode() {
  document.body.classList.add('builder-mode');
  document.body.classList.remove('freeflight-mode');
  
  // Hide other modes UI
  document.getElementById('blocksArea').style.display = 'none';
  document.getElementById('divider').style.display = 'none';
  document.getElementById('levelPanel').style.display = 'none';
  document.getElementById('minimap').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('gameHud').classList.remove('show');
  document.getElementById('crosshair').classList.remove('show');
  document.getElementById('gameInstructions').classList.remove('show');
  
  // Show builder UI
  document.getElementById('builderToolbar').classList.add('show');
  document.getElementById('builderPalette').classList.add('show');
  document.getElementById('builderInfo').classList.add('show');
  
  // Setup scene
  if (targetMarker) targetMarker.setEnabled(false);
  if (startMarker) startMarker.setEnabled(false);
  if (defaultFloor) defaultFloor.setEnabled(true);
  if (defaultWalls) defaultWalls.forEach(w => w.setEnabled(true));
  if (drone && drone._nose) drone._nose.setEnabled(false);
  
  if (camera) {
    camera.attachControl(canvas, true);
    camera.alpha = -Math.PI/2;
    camera.beta = Math.PI/3.2;
    camera.radius = 28;
    camera.setTarget(BABYLON.Vector3.Zero());
  }
  scene.clearColor = new BABYLON.Color4(0.05, 0.08, 0.13, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
  
  // Reset drone to ground
  drone.position = new BABYLON.Vector3(0, 0.4, 0);
  drone.rotation = BABYLON.Vector3.Zero();
  
  // Init builder state
  builderActive = true;
  builderTool = 'vase';
  builderObstacles = [];
  builderCheckpoints = [];
  builderTreasures = [];
  builderStart = { gx: 0, gz: 0, dir: 0 };
  builderTarget = { gx: 4, gz: -3 };
  builderCheckpointIdx = 0;
  
  // Clear existing level meshes (from programming mode)
  rebuildObstacles([]);
  rebuildCheckpoints([]);
  rebuildTreasures([]);
  
  // Clear builder meshes
  builderClearMeshes();
  
  // Show start & target markers
  rebuildBuilderStart();
  rebuildBuilderTarget();
  
  // Build toolbar buttons
  buildBuilderToolbar();
  buildBuilderPalette();
  
  // Setup pointer observer
  setupBuilderPointer();
  
  // Update info
  updateBuilderInfo();
  
  toast('🏗️ 設計模式已啟動!點撃網格放置物件', 'success');
}

function teardownBuilderMode() {
  builderActive = false;
  hideBuilderUI();
  builderClearMeshes();
  // Clear builder-placed objects from scene
  rebuildObstacles([]);
  rebuildCheckpoints([]);
  rebuildTreasures([]);
}

function buildBuilderToolbar() {
  const container = document.getElementById('toolBtns');
  container.innerHTML = '';
  BUILDER_TOOLS.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = 'tool-btn' + (builderTool === tool.id ? ' active' : '');
    btn.innerHTML = `${tool.icon} ${tool.label}`;
    btn.onclick = () => {
      builderTool = tool.id;
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.pal-item').forEach(p => p.classList.remove('active'));
      const palItem = document.querySelector(`.pal-item[data-tool="${tool.id}"]`);
      if (palItem) palItem.classList.add('active');
    };
    container.appendChild(btn);
  });
}

function buildBuilderPalette() {
  const container = document.getElementById('palItems');
  container.innerHTML = '';
  BUILDER_TOOLS.forEach(tool => {
    const item = document.createElement('div');
    item.className = 'pal-item' + (builderTool === tool.id ? ' active' : '');
    item.dataset.tool = tool.id;
    item.innerHTML = `${tool.icon} ${tool.label}`;
    item.onclick = () => {
      builderTool = tool.id;
      document.querySelectorAll('.pal-item').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.tool-btn').forEach(b => {
        if (b.textContent.includes(tool.label)) b.classList.add('active');
        else b.classList.remove('active');
      });
    };
    container.appendChild(item);
  });
}

function setupBuilderPointer() {
  builderPointerObs = scene.onPointerObservable.add((pointerInfo) => {
    if (!builderActive) return;
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
      const pickResult = pointerInfo.pickInfo;
      if (pickResult.hit && pickResult.pickedMesh === defaultFloor) {
        const worldPos = pickResult.pickedPoint;
        const gx = Math.round(worldPos.x / STEP);
        const gz = Math.round(worldPos.z / STEP);
        handleBuilderClick(gx, gz);
      }
    }
  }, BABYLON.PointerEventTypes.POINTERPICK);
}

function handleBuilderClick(gx, gz) {
  // Bounds check
  const halfW = Math.floor(GRID_W / 2);
  const halfD = Math.floor(GRID_D / 2);
  if (gx < -halfW || gx >= halfW || gz < -halfD || gz >= halfD) {
    toast('🚫 超出範圍', 'warn');
    return;
  }
  
  if (builderTool === 'erase') {
    eraseAt(gx, gz);
  } else if (builderTool === 'start') {
    builderStart = { gx, gz, dir: 0 };
    rebuildBuilderStart();
  } else if (builderTool === 'target') {
    builderTarget = { gx, gz };
    rebuildBuilderTarget();
  } else if (builderTool === 'vase' || builderTool === 'plant') {
    placeObstacle(gx, gz, builderTool);
  } else if (builderTool === 'checkpoint') {
    placeCheckpoint(gx, gz);
  } else if (builderTool === 'treasure') {
    placeTreasure(gx, gz);
  }
  
  updateBuilderInfo();
}

function placeObstacle(gx, gz, type) {
  // Check if already exists
  const existing = builderObstacles.find(o => o.gx === gx && o.gz === gz);
  if (existing) {
    toast('⚠️ 此位置已有物件', 'warn');
    return;
  }
  
  // Check start/target
  if (gx === builderStart.gx && gz === builderStart.gz) {
    toast('⚠️ 不能放在起點', 'warn');
    return;
  }
  if (gx === builderTarget.gx && gz === builderTarget.gz) {
    toast('⚠️ 不能放在終點', 'warn');
    return;
  }
  
  builderObstacles.push({ gx, gz, type });
  rebuildBuilderObstacles();
  toast(`${type === 'vase' ? '🏺' : '🌿'} 已放置`, 'success');
}

function placeCheckpoint(gx, gz) {
  const existing = builderCheckpoints.find(cp => cp.gx === gx && cp.gz === gz);
  if (existing) {
    toast('⚠️ 此位置已有檢查點', 'warn');
    return;
  }
  
  builderCheckpointIdx++;
  const label = String.fromCharCode(64 + builderCheckpointIdx); // A, B, C...
  builderCheckpoints.push({ gx, gz, label });
  rebuildBuilderCheckpoints();
  toast(`🚩 檢查點 ${label} 已放置`, 'success');
}

function placeTreasure(gx, gz) {
  const existing = builderTreasures.find(t => t.gx === gx && t.gz === gz);
  if (existing) {
    toast('⚠️ 此位置已有寶石', 'warn');
    return;
  }
  
  builderTreasures.push({ gx, gz });
  rebuildBuilderTreasures();
  toast('💎 寶石已放置', 'success');
}

function eraseAt(gx, gz) {
  let erased = false;
  
  const obsIdx = builderObstacles.findIndex(o => o.gx === gx && o.gz === gz);
  if (obsIdx !== -1) {
    builderObstacles.splice(obsIdx, 1);
    rebuildBuilderObstacles();
    erased = true;
  }
  
  const cpIdx = builderCheckpoints.findIndex(cp => cp.gx === gx && cp.gz === gz);
  if (cpIdx !== -1) {
    builderCheckpoints.splice(cpIdx, 1);
    rebuildBuilderCheckpoints();
    erased = true;
  }
  
  const trIdx = builderTreasures.findIndex(t => t.gx === gx && t.gz === gz);
  if (trIdx !== -1) {
    builderTreasures.splice(trIdx, 1);
    rebuildBuilderTreasures();
    erased = true;
  }
  
  if (erased) {
    toast('🧹 已清除', 'info');
  } else {
    toast('此位置沒有物件', 'info');
  }
}

function disposeBuilderMeshes(type) {
  builderMeshes.filter(m => m._builderType === type).forEach(m => {
    if (m.getChildMeshes) m.getChildMeshes().forEach(c => {
      if (c.material && c.material.diffuseTexture) { c.material.diffuseTexture.dispose(); }
      if (c.material) c.material.dispose();
      c.dispose();
    });
    m.dispose();
  });
  builderMeshes = builderMeshes.filter(m => m._builderType !== type);
}

function rebuildBuilderObstacles() {
  disposeBuilderMeshes('obstacle');
  const offset = Date.now() % 10000;
  builderObstacles.forEach((obs, idx) => {
    let mesh;
    if (obs.type === 'vase') {
      mesh = createVase(obs.gx, obs.gz, offset + idx);
    } else {
      mesh = createPlant(obs.gx, obs.gz, offset + idx);
    }
    mesh._builderType = 'obstacle';
    builderMeshes.push(mesh);
  });
}

function rebuildBuilderCheckpoints() {
  disposeBuilderMeshes('checkpoint');
  const offset = Date.now() % 10000;
  builderCheckpoints.forEach((cp, idx) => {
    const mesh = createCheckpoint(cp, offset + idx);
    mesh._builderType = 'checkpoint';
    builderMeshes.push(mesh);
  });
}

function rebuildBuilderTreasures() {
  disposeBuilderMeshes('treasure');
  const offset = Date.now() % 10000;
  builderTreasures.forEach((t, idx) => {
    const mesh = createTreasure(t, offset + idx);
    mesh._builderType = 'treasure';
    builderMeshes.push(mesh);
  });
}

function rebuildBuilderStart() {
  builderMeshes.filter(m => m._builderType === 'start').forEach(m => m.dispose());
  builderMeshes = builderMeshes.filter(m => m._builderType !== 'start');
  
  const s = cellToWorld(builderStart.gx, builderStart.gz);
  const startDisc = BABYLON.MeshBuilder.CreateGround('builderStart', { width: STEP*0.85, height: STEP*0.85 }, scene);
  const sTex = new BABYLON.DynamicTexture('bsT', { width: 256, height: 256 }, scene, false);
  const sCtx = sTex.getContext();
  sCtx.fillStyle = 'rgba(80,200,120,0.7)';
  sCtx.beginPath();
  sCtx.arc(128, 128, 110, 0, Math.PI*2);
  sCtx.fill();
  sCtx.fillStyle = '#1a4a2a';
  sCtx.font = 'bold 110px Arial';
  sCtx.textAlign = 'center';
  sCtx.textBaseline = 'middle';
  sCtx.fillText('S', 128, 128);
  sTex.update();
  sTex.hasAlpha = true;
  const sm = new BABYLON.StandardMaterial('bsm', scene);
  sm.diffuseTexture = sTex;
  sm.diffuseTexture.hasAlpha = true;
  sm.useAlphaFromDiffuseTexture = true;
  startDisc.material = sm;
  startDisc.position = new BABYLON.Vector3(s.x, 0.02, s.z);
  startDisc._builderType = 'start';
  builderMeshes.push(startDisc);
}

function rebuildBuilderTarget() {
  builderMeshes.filter(m => m._builderType === 'target').forEach(m => m.dispose());
  builderMeshes = builderMeshes.filter(m => m._builderType !== 'target');
  
  const t = cellToWorld(builderTarget.gx, builderTarget.gz);
  const targetDisc = BABYLON.MeshBuilder.CreateGround('builderTarget', { width: STEP*0.85, height: STEP*0.85 }, scene);
  const tTex = new BABYLON.DynamicTexture('btT', { width: 256, height: 256 }, scene, false);
  const tCtx = tTex.getContext();
  tCtx.fillStyle = 'rgba(147,51,234,0.7)';
  tCtx.beginPath();
  tCtx.arc(128, 128, 110, 0, Math.PI*2);
  tCtx.fill();
  tCtx.fillStyle = '#4a1a6a';
  tCtx.font = 'bold 90px Arial';
  tCtx.textAlign = 'center';
  tCtx.textBaseline = 'middle';
  tCtx.fillText('🎯', 128, 128);
  tTex.update();
  tTex.hasAlpha = true;
  const tm = new BABYLON.StandardMaterial('btm', scene);
  tm.diffuseTexture = tTex;
  tm.diffuseTexture.hasAlpha = true;
  tm.useAlphaFromDiffuseTexture = true;
  targetDisc.material = tm;
  targetDisc.position = new BABYLON.Vector3(t.x, 0.02, t.z);
  targetDisc._builderType = 'target';
  builderMeshes.push(targetDisc);
}

function builderClearMeshes() {
  builderMeshes.forEach(m => m.dispose());
  builderMeshes = [];
}

function builderClearAll() {
  if (!confirm('確定要清空所有物件嗎?')) return;
  builderObstacles = [];
  builderCheckpoints = [];
  builderTreasures = [];
  builderCheckpointIdx = 0;
  builderClearMeshes();
  rebuildBuilderStart();
  rebuildBuilderTarget();
  updateBuilderInfo();
  toast('🗑️ 已清空', 'info');
}

function updateBuilderInfo() {
  document.getElementById('bInfoObs').textContent = builderObstacles.length;
  document.getElementById('bInfoCp').textContent = builderCheckpoints.length;
  document.getElementById('bInfoTr').textContent = builderTreasures.length;
  
  // Show current hover cell (updated via pointer move)
  scene.onPointerMove = (evt) => {
    if (!builderActive) return;
    const pickResult = scene.pick(evt.offsetX, evt.offsetY);
    if (pickResult.hit && pickResult.pickedMesh === defaultFloor) {
      const worldPos = pickResult.pickedPoint;
      const gx = Math.round(worldPos.x / STEP);
      const gz = Math.round(worldPos.z / STEP);
      document.getElementById('bInfoCell').textContent = `(${gx}, ${gz})`;
    }
  };
}

function builderTestRun() {
  if (builderObstacles.length === 0 && builderCheckpoints.length === 0 && builderTreasures.length === 0) {
    toast('⚠️ 請先放置一些物件', 'warn');
    return;
  }
  
  // Switch to programming mode with this level
  const testLevel = {
    name: '自訂關卡',
    desc: '你設計的關卡',
    start: builderStart,
    target: builderTarget,
    obstacles: builderObstacles,
    checkpoints: builderCheckpoints,
    treasures: builderTreasures,
    hint: '用 Blockly 編程到達終點!',
    solutionXml: () => '<block type="event_start"></block>'
  };
  
  // Temporarily add to LEVELS
  LEVELS.push(testLevel);
  const testIdx = LEVELS.length - 1;
  
  // Switch mode
  enterMode('programming');
  loadLevel(testIdx);
  
  toast('▶ 試玩模式!完成後返回選單', 'success');
}

function builderShowShare() {
  const code = encodeBuilderLevel();
  document.getElementById('shareCodeOut').value = code;
  document.getElementById('builderShareModal').classList.add('show');
}

function closeBuilderShare() {
  document.getElementById('builderShareModal').classList.remove('show');
}

function switchShareTab(tab) {
  document.querySelectorAll('.share-tab').forEach(t => t.classList.remove('active'));
  if (tab === 'code') {
    document.querySelector('.share-tab:first-child').classList.add('active');
    document.getElementById('shareTabCode').style.display = 'block';
    document.getElementById('shareTabImport').style.display = 'none';
  } else {
    document.querySelector('.share-tab:last-child').classList.add('active');
    document.getElementById('shareTabCode').style.display = 'none';
    document.getElementById('shareTabImport').style.display = 'block';
  }
}

function encodeBuilderLevel() {
  const data = {
    s: builderStart,
    t: builderTarget,
    o: builderObstacles,
