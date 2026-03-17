let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = "square", vol = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function sfxShoot() {
  playTone(880, 0.06, "square", 0.08);
  playTone(1200, 0.04, "sawtooth", 0.05);
}

export function sfxHit() {
  playTone(200, 0.1, "sawtooth", 0.12);
  playTone(150, 0.15, "square", 0.08);
}

export function sfxKill() {
  playTone(400, 0.08, "square", 0.1);
  setTimeout(() => playTone(600, 0.08, "square", 0.1), 50);
  setTimeout(() => playTone(800, 0.1, "square", 0.1), 100);
}

export function sfxPickup() {
  playTone(523, 0.06, "sine", 0.12);
  setTimeout(() => playTone(659, 0.06, "sine", 0.12), 60);
  setTimeout(() => playTone(784, 0.08, "sine", 0.12), 120);
}

export function sfxDamage() {
  playTone(100, 0.2, "sawtooth", 0.2);
  playTone(80, 0.3, "square", 0.15);
}

export function sfxBossAppear() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => playTone(100 + i * 40, 0.15, "sawtooth", 0.12), i * 80);
  }
}

export function sfxBossDie() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      playTone(800 - i * 80, 0.1, "square", 0.12);
      playTone(200 + Math.random() * 400, 0.15, "sawtooth", 0.08);
    }, i * 60);
  }
}

export function sfxCombo() {
  playTone(1047, 0.05, "sine", 0.1);
  setTimeout(() => playTone(1319, 0.05, "sine", 0.1), 40);
}

export function sfxDash() {
  playTone(300, 0.08, "sawtooth", 0.06);
  playTone(500, 0.06, "sine", 0.08);
}

export function sfxLevelUp() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.12, "sine", 0.12), i * 80));
}

// Heartbeat sound for low HP
let heartbeatInterval = null;
export function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    playTone(50, 0.15, "sine", 0.15);
    setTimeout(() => playTone(45, 0.12, "sine", 0.12), 120);
  }, 800);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Creepy ambient drone for boss warning
export function sfxHorrorDrone() {
  playTone(55, 0.6, "sawtooth", 0.06);
  playTone(58, 0.5, "sine", 0.04);
  playTone(110, 0.4, "sawtooth", 0.03);
}
