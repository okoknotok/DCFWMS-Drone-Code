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
