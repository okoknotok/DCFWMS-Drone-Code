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
