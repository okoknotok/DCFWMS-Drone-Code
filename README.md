# DCFWMS Drone Code

無人機編程教學平台 — Blockly 積木編程 + 3D 模擬 + Cyberpunk 射擊遊戲

## 🚁 功能

### 編程模式 (Programming)
- Blockly 視覺化積木編程控制無人機
- 18 個關卡（含 3 個 AI 自動駕駛大關）
- 積木分類：事件、動作、移動、控制、感測
- 提示系統 + 參考答案

### 無盡 Cyberpunk 模式 (Freeflight)
- WASD 手動操控 + 滑鼠射擊
- 5 個階段，難度遞增
- 射擊紅球、收集金幣、閃避能量牆
- Combo 系統、生命值、加速衝刺
- Power-up 道具系統

## 🛠️ 技術棧

- **Babylon.js** — 3D 渲染引擎
- **Blockly** — 視覺化編程框架
- **Web Audio API** — 程序化音效合成

## 📁 專案結構

```
├── index.html              # 主頁面
├── css/
│   └── style.css           # 所有樣式
├── js/
│   ├── mode.js             # 模式切換（選單 → 編程/自由飛行）
│   ├── blockly-blocks.js   # 自訂 Blockly 積木定義
│   ├── levels.js           # 18 關關卡資料 + 答案
│   ├── obstacles.js        # 障礙物/檢查點/寶物 3D 建模
│   ├── interpreter.js      # Blockly 積木解譯器（執行引擎）
│   ├── scene.js            # 3D 場景（Babylon.js 初始化、無人機、網格、小地圖）
│   ├── audio.js            # 音效系統（Web Audio 程序合成）
│   ├── freeflight.js       # Cyberpunk 模式（遊戲邏輯、道具、子彈、階段轉換）
│   └── blockly-init.js     # Blockly workspace 初始化 + 程式執行入口
└── README.md
```

## 🚀 使用

直接用瀏覽器打開 `index.html`（需要網路載入 CDN 資源）。

```bash
# 或用本地 server
npx serve .
# 或
python3 -m http.server 8080
```

## 📝 License

Private — Internal use only
