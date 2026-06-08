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
