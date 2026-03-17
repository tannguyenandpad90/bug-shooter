// ==================== PROCEDURAL MUSIC ENGINE ====================
// Generates adaptive chiptune music that responds to game state.
// No audio files needed — everything is synthesized with Web Audio API.

let ctx = null;
let masterGain = null;
let playing = false;
let currentBpm = 140;
let beatIndex = 0;
let nextNoteTime = 0;
let timerId = null;
let intensity = 0; // 0 = chill, 1 = intense
let bossMode = false;

// Musical scales
const SCALE_NORMAL = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63]; // C minor-ish
const SCALE_BOSS = [130.81, 138.59, 164.81, 174.61, 196.00, 207.65, 246.94, 261.63]; // darker

// Patterns (indices into scale) — 16-step sequences
const BASS_PATTERNS = [
  [0, -1, 0, -1, 3, -1, 3, -1, 4, -1, 4, -1, 3, -1, -1, -1],
  [0, -1, -1, 0, -1, -1, 3, -1, 4, -1, -1, 4, 3, -1, -1, -1],
  [0, 0, -1, 0, 3, -1, 4, -1, 5, -1, 4, -1, 3, -1, 0, -1],
];

const MELODY_PATTERNS = [
  [7, -1, 5, -1, 4, -1, 3, -1, 5, -1, 7, -1, -1, -1, -1, -1],
  [-1, -1, 7, -1, -1, 5, -1, 4, -1, -1, 3, -1, 5, -1, 7, -1],
  [4, 5, 7, -1, 4, 3, -1, -1, 5, 7, -1, 4, -1, 3, -1, -1],
  [7, -1, 7, 5, -1, 4, 3, -1, 4, -1, 5, -1, 7, -1, -1, -1],
];

const BOSS_MELODY = [
  [0, -1, 0, 3, -1, 0, 4, -1, 0, -1, 0, 5, -1, 4, 3, -1],
  [3, 4, 5, -1, 3, 4, 5, 7, -1, 5, 4, 3, -1, -1, 0, -1],
];

const DRUM_PATTERN_NORMAL = [
  // k=kick, s=snare, h=hihat, -=rest
  "k", "h", "h", "h", "s", "h", "h", "h", "k", "h", "k", "h", "s", "h", "h", "h",
];

const DRUM_PATTERN_INTENSE = [
  "k", "h", "k", "h", "s", "h", "k", "h", "k", "k", "h", "h", "s", "h", "k", "s",
];

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function playNote(freq, time, duration, type = "square", vol = 0.12) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(time);
  osc.stop(time + duration);
}

function playDrum(type, time) {
  const c = getCtx();

  if (type === "k") {
    // Kick
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.15);
  } else if (type === "s") {
    // Snare (noise burst)
    const bufferSize = c.sampleRate * 0.08;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    // Add a tonal element
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, time);
    const oscGain = c.createGain();
    oscGain.gain.setValueAtTime(0.08, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    noise.connect(gain);
    gain.connect(masterGain);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    noise.start(time);
    osc.start(time);
    osc.stop(time + 0.06);
  } else if (type === "h") {
    // Hi-hat (short noise)
    const bufferSize = c.sampleRate * 0.03;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    // Highpass feel
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8000;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(time);
  }
}

function scheduleNotes() {
  const c = getCtx();
  const secondsPerBeat = 60.0 / currentBpm / 4; // 16th notes

  while (nextNoteTime < c.currentTime + 0.1) {
    const step = beatIndex % 16;
    const bar = Math.floor(beatIndex / 16);
    const scale = bossMode ? SCALE_BOSS : SCALE_NORMAL;

    // Drums
    const drumPattern = intensity > 0.5 || bossMode ? DRUM_PATTERN_INTENSE : DRUM_PATTERN_NORMAL;
    const drum = drumPattern[step];
    if (drum !== "-") {
      playDrum(drum, nextNoteTime);
    }

    // Bass
    const bassPattern = BASS_PATTERNS[bar % BASS_PATTERNS.length];
    const bassNote = bassPattern[step];
    if (bassNote >= 0) {
      const freq = scale[bassNote] * 0.5;
      playNote(freq, nextNoteTime, secondsPerBeat * 1.5, "sawtooth", 0.1);
    }

    // Melody
    let melodyPatterns;
    if (bossMode) {
      melodyPatterns = BOSS_MELODY;
    } else {
      melodyPatterns = MELODY_PATTERNS;
    }
    const melodyPattern = melodyPatterns[bar % melodyPatterns.length];
    const melodyNote = melodyPattern[step];
    if (melodyNote >= 0) {
      const freq = scale[melodyNote] * (bossMode ? 1 : 2);
      const vol = bossMode ? 0.08 : 0.06;
      playNote(freq, nextNoteTime, secondsPerBeat * 0.8, "square", vol);

      // Harmony on some beats when intense
      if (intensity > 0.6 && step % 4 === 0 && melodyNote >= 2) {
        playNote(scale[melodyNote - 2] * 2, nextNoteTime, secondsPerBeat * 0.6, "triangle", 0.03);
      }
    }

    // Arpeggio layer (intensity > 0.3)
    if (intensity > 0.3 && step % 2 === 0) {
      const arpNote = scale[(step / 2 + bar) % scale.length];
      playNote(arpNote * 4, nextNoteTime, secondsPerBeat * 0.3, "sine", 0.02 * intensity);
    }

    beatIndex++;
    nextNoteTime += secondsPerBeat;
  }
}

function scheduler() {
  if (!playing) return;
  scheduleNotes();
  timerId = setTimeout(scheduler, 25);
}

export function startMusic() {
  if (playing) return;
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  playing = true;
  nextNoteTime = c.currentTime;
  beatIndex = 0;
  scheduler();
}

export function stopMusic() {
  playing = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export function setMusicIntensity(value) {
  // value: 0 to 1
  intensity = Math.max(0, Math.min(1, value));
  // BPM scales with intensity
  currentBpm = 130 + Math.floor(intensity * 40);
}

export function setBossMusic(on) {
  bossMode = on;
  if (on) {
    currentBpm = 160;
    intensity = 1;
  }
}

export function setMusicVolume(vol) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(0.4, vol));
}
