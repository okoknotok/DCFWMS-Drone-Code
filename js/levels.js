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
  { name: '之字形掃描', desc: '掃描整個田地!之字形路線。', goal: '完成之字形掃描並到達 (-3, -2) 降落', hint: '「🔁 重複 2 次」內放完整的 zigzag。', start: { gx: -3, gz: 2, dir: 0 }, target: { gx: -3, gz: -2 }, obstacles: [{ gx: 4, gz: 2, type: 'plant' }, { gx: -4, gz: 0, type: 'vase' }, { gx: 4, gz: -2, type: 'plant' }, { gx: -5, gz: 3, type: 'vase' }, { gx: 5, gz: -3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.totalMoves >= 28, solutionXml: () => chain(ST, TK, { type: 'control_repeat', fields: { TIMES: 2 }, statements: { DO: chain(F(6), TR, F(1), TR, F(6), TL, F(1), TL) } }, LD) },
  { name: '環島巡邏', desc: '繞過花圃飛一個大正方形。', goal: '繞花圃一周返回起點 (-1, 2) 降落', hint: '「🔁 重複 4 次」內放「⬆️前進 4 + ↪️右轉」。', start: { gx: -1, gz: 2, dir: 0 }, target: { gx: -1, gz: 2 }, obstacles: [{ gx: 0, gz: 0, type: 'plant' }, { gx: 1, gz: 0, type: 'plant' }, { gx: 0, gz: -1, type: 'vase' }, { gx: 1, gz: -1, type: 'vase' }, { gx: -3, gz: 3, type: 'vase' }, { gx: 5, gz: -3, type: 'plant' }], check: (s) => s.tookOff && s.landed && s.atTarget && !s.hitObstacle && s.totalMoves >= 16, solutionXml: () => chain(ST, TK, { type: 'control_repeat', fields: { TIMES: 4 }, statements: { DO: chain(F(4), TR) } }, LD) },
  { name: '障礙隧道', desc: '一排花瓶 🏺 高牆攔住路。使用條件判斷自動繞過。', goal: '穿越花瓶隧道到 (6, 0) 降落', hint: '迴圈 + 條件判斷做 U 形繞路。', start: { gx: -6, gz: 0, dir: 0 }, target: { gx: 6, gz: 0 }, obstacles: [{ gx: -3, gz: 0, type: 'vase' }, { gx: 0, gz: 0, type: 'vase' }, { gx: 3, gz: 0, type: 'vase' }, { gx: -5, gz: 2, type: 'plant' }, { gx: 5, gz: 2, type: 'plant' }, { gx: -5, gz: -3, type: 'plant' }, { gx: 5, gz: -3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, { type: 'control_repeat_until_target', statements: { DO: chain({ type: 'control_if_obstacle', statements: { DO: chain(TR, F(1), TL, F(2), TL, F(1), TR), ELSE: chain(F(1)) } }) } }, LD) },
  { name: '花園迷宮', desc: '穿越複雜的花園迷宮。', goal: '從 (-6, 4) 到 (6, -4) 降落', hint: '逐步繞過每組障礙物。', start: { gx: -6, gz: 4, dir: 0 }, target: { gx: 6, gz: -4 }, obstacles: [{ gx: -2, gz: 4, type: 'vase' }, { gx: -2, gz: 3, type: 'plant' }, { gx: -2, gz: 2, type: 'vase' }, { gx: -2, gz: 1, type: 'plant' }, { gx: -3, gz: -1, type: 'vase' }, { gx: -2, gz: -1, type: 'plant' }, { gx: 1, gz: 0, type: 'vase' }, { gx: 1, gz: -1, type: 'plant' }, { gx: 4, gz: -2, type: 'vase' }, { gx: 4, gz: -3, type: 'plant' }, { gx: 4, gz: -4, type: 'vase' }, { gx: 5, gz: 1, type: 'plant' }, { gx: 2, gz: 2, type: 'vase' }, { gx: -4, gz: 0, type: 'plant' }, { gx: -5, gz: -3, type: 'vase' }, { gx: -1, gz: -3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle, solutionXml: () => chain(ST, TK, F(3), TR, F(4), TL, F(3), TR, F(2), TL, F(3), TL, F(2), TR, F(3), TR, F(4), LD) },
  { name: '雙檢查點巡邏', desc: '依順序經過 2 個黃色檢查點 A → B,最後到終點。', goal: '依序 A → B → 到 (4, 0) 降落', hint: '北 2 → 東 2 (A) → 南 4 → 東 4 (B) → 北 2 → 東 2。', start: { gx: -4, gz: 0, dir: 0 }, target: { gx: 4, gz: 0 }, checkpoints: [{ gx: -2, gz: 2, label: 'A' }, { gx: 2, gz: -2, label: 'B' }], obstacles: [{ gx: 0, gz: 0, type: 'vase' }, { gx: 0, gz: 1, type: 'plant' }, { gx: 0, gz: -1, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.checkpointOrderCorrect && s.checkpointsVisitedCount === 2, solutionXml: () => chain(ST, TK, TL, F(2), TR, F(2), TR, F(4), TL, F(4), TL, F(2), TR, F(2), LD) },
  { name: '寶物獵人', desc: '收集 4 顆寶石後再到終點降落。', goal: '收集全部 4 顆寶石後到 (5, 0) 降落', hint: '4 顆寶石位置:(-3, 2)、(0, 2)、(0, -2)、(3, -2)。', start: { gx: -5, gz: 0, dir: 0 }, target: { gx: 5, gz: 0 }, treasures: [{ gx: -3, gz: 2 }, { gx: 0, gz: 2 }, { gx: 0, gz: -2 }, { gx: 3, gz: -2 }], obstacles: [{ gx: -2, gz: 0, type: 'vase' }, { gx: 2, gz: 0, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.treasuresCollectedCount === 4, solutionXml: () => chain(ST, TK, TL, F(2), TR, F(5), TR, F(4), TL, F(3), TL, F(2), TR, F(2), LD) },
  { name: '漸縮螺旋', desc: '飛出由外向內收縮的螺旋!', goal: '完成螺旋到 (0, 0) 降落', hint: '5 段路徑,每段右轉 90°,長度遞減 5→4→3→2→1。', start: { gx: -3, gz: 2, dir: 0 }, target: { gx: 0, gz: 0 }, obstacles: [{ gx: 3, gz: 0, type: 'plant' }, { gx: -3, gz: -3, type: 'vase' }, { gx: 5, gz: 3, type: 'plant' }], check: (s) => s.atTarget && s.landed && !s.hitObstacle && s.totalMoves >= 15, solutionXml: () => chain(ST, TK, F(5), TR, F(4), TR, F(3), TR, F(2), TR, F(1), LD) },
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
