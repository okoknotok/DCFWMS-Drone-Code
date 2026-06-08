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

window.addEventListener('DOMContentLoaded', () => {
  init3D(); initBlockly();
  initResizer();
  buildLevelSelector();
  loadLevel(0);
  window.addEventListener('resize', () => Blockly.svgResize(workspace));
});
