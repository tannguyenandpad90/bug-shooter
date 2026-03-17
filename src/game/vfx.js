// ==================== VISUAL EFFECTS SYSTEM ====================

// ---- Code Rain (evolves to error messages at high levels) ----
const CODE_SNIPPETS = [
  "const x = 0;", "if (bug) fix();", "return null;", "async/await",
  "try { } catch", "npm install", "git push -f", "console.log",
  "undefined", "===", "() => {}", "import React", "useState()",
  "useEffect", "JSON.parse", ".map(fn)", ".filter()", "Promise.all",
  "export default", "throw Error", "while(true)", "break;", "yield*",
  "new Map()", "Object.keys", "Array.from", "fetch(url)", "res.json()",
];

const ERROR_SNIPPETS = [
  "SEGFAULT", "FATAL ERROR", "CORE DUMPED", "PANIC!", "stack overflow",
  "null ptr deref", "SIGKILL", "ENOMEM", "bus error", "abort trap",
  "heap corrupt", "use after free", "double free", "SIGSEGV",
  "undefined is not a function", "cannot read property of null",
  "maximum call stack exceeded", "out of memory", "EPERM", "EACCES",
  "broken pipe", "connection refused", "timeout", "DEAD", "KILL -9",
  "rm -rf /", ":(){ :|:& };:", "fork bomb", "kernel panic",
  "data loss", "unrecoverable", "CORRUPTION", "INFECTED",
];

export class CodeRain {
  constructor(w, h) {
    this.columns = [];
    this.w = w;
    this.h = h;
    this.horrorLevel = 0; // 0-1, increases with game level
    const colCount = Math.floor(w / 18);
    for (let i = 0; i < colCount; i++) {
      this.columns.push({
        x: i * 18,
        chars: [],
        speed: 0.3 + Math.random() * 0.8,
        nextSpawn: Math.random() * 100,
        timer: 0,
      });
    }
  }

  setHorrorLevel(level) {
    this.horrorLevel = Math.min(1, level / 15);
  }

  update() {
    for (const col of this.columns) {
      col.timer++;
      if (col.timer >= col.nextSpawn) {
        col.timer = 0;
        col.nextSpawn = 40 + Math.random() * 120;

        // Pick snippet based on horror level
        const useError = Math.random() < this.horrorLevel * 0.6;
        const pool = useError ? ERROR_SNIPPETS : CODE_SNIPPETS;
        const snippet = pool[Math.floor(Math.random() * pool.length)];
        const isError = useError;

        for (let i = 0; i < snippet.length; i++) {
          col.chars.push({
            char: snippet[i],
            y: -i * 14,
            alpha: 0.6 + Math.random() * 0.4,
            bright: i === 0,
            isError,
          });
        }
      }
      // Speed increases with horror
      const speedMult = 1 + this.horrorLevel * 0.8;
      for (const ch of col.chars) {
        ch.y += col.speed * speedMult;
        ch.alpha *= 0.999;
      }
      col.chars = col.chars.filter((ch) => ch.y < this.h + 20 && ch.alpha > 0.01);
    }
  }

  render(ctx) {
    ctx.font = "11px monospace";
    for (const col of this.columns) {
      for (const ch of col.chars) {
        const baseAlpha = 0.08 + this.horrorLevel * 0.06;
        ctx.globalAlpha = ch.alpha * baseAlpha;
        if (ch.isError) {
          ctx.fillStyle = ch.bright ? "#ff0040" : "#aa0030";
        } else {
          ctx.fillStyle = ch.bright ? "#00ff88" : "#00aa44";
        }
        ctx.fillText(ch.char, col.x, ch.y);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---- Floating Damage Numbers ----
export class DamageNumbers {
  constructor() {
    this.numbers = [];
  }

  add(x, y, value, color = "#fff", size = 14) {
    this.numbers.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      value: typeof value === "number" ? `-${value}` : value,
      color,
      size,
      life: 40,
      maxLife: 40,
      vy: -2 - Math.random(),
    });
  }

  update() {
    this.numbers = this.numbers.filter((n) => {
      n.y += n.vy;
      n.vy *= 0.96;
      n.life--;
      return n.life > 0;
    });
  }

  render(ctx) {
    for (const n of this.numbers) {
      const progress = 1 - n.life / n.maxLife;
      ctx.globalAlpha = n.life / n.maxLife;
      ctx.fillStyle = n.color;
      ctx.font = `bold ${n.size + progress * 4}px monospace`;
      ctx.textAlign = "center";
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 6;
      ctx.fillText(n.value, n.x, n.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}

// ---- Kill Streak Announcements ----
const STREAK_LABELS = [
  null, null, null,
  { text: "NICE!", color: "#00ff88" },
  null,
  { text: "KILLING SPREE!", color: "#f59e0b" },
  null, null,
  { text: "UNSTOPPABLE!", color: "#ff6600" },
  null,
  { text: "GODLIKE!", color: "#ff0040" },
  null, null, null, null,
  { text: "LEGENDARY!", color: "#a855f7" },
  null, null, null, null,
  { text: "BEYOND GODLIKE!", color: "#ff00ff" },
];

export class Announcements {
  constructor() {
    this.current = null;
  }

  check(combo) {
    const label = combo < STREAK_LABELS.length ? STREAK_LABELS[combo] : null;
    if (label) {
      this.current = { ...label, life: 80, maxLife: 80, scale: 2.5 };
    }
  }

  update() {
    if (this.current) {
      this.current.life--;
      this.current.scale *= 0.95;
      if (this.current.scale < 1) this.current.scale = 1;
      if (this.current.life <= 0) this.current = null;
    }
  }

  render(ctx, w, h) {
    if (!this.current) return;
    const a = this.current;
    const progress = 1 - a.life / a.maxLife;

    if (progress < 0.1) {
      ctx.globalAlpha = (0.1 - progress) * 2;
      ctx.fillStyle = a.color;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalAlpha = Math.min(1, a.life / 20);
    ctx.fillStyle = a.color;
    ctx.font = `bold ${28 * a.scale}px monospace`;
    ctx.textAlign = "center";
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 30;
    ctx.fillText(a.text, w / 2, h / 2);
    ctx.shadowBlur = 15;
    ctx.fillText(a.text, w / 2, h / 2);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

// ---- Level-up Banner ----
export class LevelBanner {
  constructor() {
    this.active = false;
    this.level = 0;
    this.life = 0;
    this.maxLife = 90;
  }

  show(level) {
    this.active = true;
    this.level = level;
    this.life = this.maxLife;
  }

  update() {
    if (!this.active) return;
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  render(ctx, w, h) {
    if (!this.active) return;
    const progress = 1 - this.life / this.maxLife;

    const slideY = progress < 0.15
      ? h * 0.35 * (progress / 0.15)
      : progress > 0.7
        ? h * 0.35 * (1 - (progress - 0.7) / 0.3)
        : h * 0.35;

    ctx.globalAlpha = Math.min(0.8, this.life / 20);
    ctx.fillStyle = "rgba(0, 255, 136, 0.05)";
    ctx.fillRect(0, slideY - 30, w, 60);

    ctx.strokeStyle = "rgba(0, 255, 136, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, slideY - 30); ctx.lineTo(w, slideY - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, slideY + 30); ctx.lineTo(w, slideY + 30); ctx.stroke();

    ctx.globalAlpha = Math.min(1, this.life / 15);
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 20;
    ctx.fillText(`LEVEL ${this.level}`, w / 2, slideY + 10);
    ctx.shadowBlur = 0;

    const tierNames = ["", "◆◆ DOUBLE SHOT UNLOCKED!", "◆◆◆ TRIPLE SHOT UNLOCKED!"];
    const tier = this.level >= 8 ? 2 : this.level >= 4 ? 1 : 0;
    if (this.level === 4 || this.level === 8) {
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 14px monospace";
      ctx.fillText(tierNames[tier], w / 2, slideY + 30);
    }
    if (this.level % 5 === 0) {
      ctx.fillStyle = "#ff0040";
      ctx.font = "bold 14px monospace";
      ctx.fillText("⚠ BOSS APPROACHING...", w / 2, slideY + 30);
    }

    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

// ---- Blood Splatters (persist on canvas) ----
export class BloodSplatter {
  constructor() {
    this.splatters = [];
  }

  add(x, y, intensity = 1) {
    const count = 3 + Math.floor(Math.random() * 4 * intensity);
    for (let i = 0; i < count; i++) {
      this.splatters.push({
        x: x + (Math.random() - 0.5) * 40 * intensity,
        y: y + (Math.random() - 0.5) * 40 * intensity,
        size: 4 + Math.random() * 12 * intensity,
        alpha: 0.25 + Math.random() * 0.2,
        // Green bug blood — toxic looking
        hue: Math.random() < 0.3 ? 0 : 120 + Math.random() * 20,
        decay: 0.997,
      });
    }
    // Keep max splatters reasonable
    if (this.splatters.length > 150) {
      this.splatters = this.splatters.slice(-100);
    }
  }

  update() {
    this.splatters = this.splatters.filter((s) => {
      s.alpha *= s.decay;
      return s.alpha > 0.01;
    });
  }

  render(ctx) {
    for (const s of this.splatters) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.hue === 0
        ? `rgba(180, 0, 30, 1)`
        : `hsl(${s.hue}, 100%, 30%)`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.size, s.size * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ---- Screen Cracks (accumulate when taking damage) ----
export class ScreenCracks {
  constructor(w, h) {
    this.cracks = [];
    this.w = w;
    this.h = h;
  }

  addCrack() {
    // Random origin near edges or center
    const edge = Math.random();
    let ox, oy;
    if (edge < 0.25) { ox = Math.random() * this.w; oy = 0; }
    else if (edge < 0.5) { ox = Math.random() * this.w; oy = this.h; }
    else if (edge < 0.75) { ox = 0; oy = Math.random() * this.h; }
    else { ox = this.w; oy = Math.random() * this.h; }

    const segments = [];
    let x = ox, y = oy;
    const len = 4 + Math.floor(Math.random() * 8);
    for (let i = 0; i < len; i++) {
      const nx = x + (Math.random() - 0.5) * 80;
      const ny = y + (Math.random() - 0.5) * 80;
      segments.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
      // Branch
      if (Math.random() < 0.3) {
        const bx = x + (Math.random() - 0.5) * 40;
        const by = y + (Math.random() - 0.5) * 40;
        segments.push({ x1: x, y1: y, x2: bx, y2: by });
      }
    }

    this.cracks.push({ segments, alpha: 0.6, decay: 0.998 });

    if (this.cracks.length > 8) {
      this.cracks = this.cracks.slice(-6);
    }
  }

  update() {
    this.cracks = this.cracks.filter((c) => {
      c.alpha *= c.decay;
      return c.alpha > 0.02;
    });
  }

  render(ctx) {
    for (const crack of this.cracks) {
      ctx.globalAlpha = crack.alpha;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 3;

      for (const seg of crack.segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }

      // Thin inner glow
      ctx.strokeStyle = "rgba(200, 220, 255, 0.4)";
      ctx.lineWidth = 0.5;
      for (const seg of crack.segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1 + 1, seg.y1 + 1);
        ctx.lineTo(seg.x2 + 1, seg.y2 + 1);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}

// ---- Floating Error Messages (background horror) ----
export class FloatingErrors {
  constructor(w, h) {
    this.errors = [];
    this.w = w;
    this.h = h;
  }

  maybeSpawn(level) {
    if (level < 3) return;
    if (Math.random() > 0.008 * level) return;

    this.errors.push({
      text: ERROR_SNIPPETS[Math.floor(Math.random() * ERROR_SNIPPETS.length)],
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      alpha: 0,
      maxAlpha: 0.06 + Math.random() * 0.08,
      fadeIn: true,
      life: 120 + Math.random() * 180,
      size: 10 + Math.random() * 14,
      rot: (Math.random() - 0.5) * 0.3,
    });

    if (this.errors.length > 12) this.errors.shift();
  }

  update() {
    this.errors = this.errors.filter((e) => {
      e.life--;
      if (e.fadeIn) {
        e.alpha += 0.003;
        if (e.alpha >= e.maxAlpha) e.fadeIn = false;
      }
      if (e.life < 30) {
        e.alpha -= e.maxAlpha / 30;
      }
      return e.life > 0 && e.alpha > 0;
    });
  }

  render(ctx) {
    for (const e of this.errors) {
      ctx.save();
      ctx.globalAlpha = e.alpha;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      ctx.fillStyle = "#ff0040";
      ctx.font = `bold ${e.size}px monospace`;
      ctx.fillText(e.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

// ---- Damage Glitch Effect (screen corruption on hit) ----
export class DamageGlitch {
  constructor() {
    this.intensity = 0;
    this.slices = [];
  }

  trigger(power = 1) {
    this.intensity = 0.8 * power;
    // Create horizontal slice distortions
    this.slices = [];
    const count = 3 + Math.floor(Math.random() * 5 * power);
    for (let i = 0; i < count; i++) {
      this.slices.push({
        y: Math.random() * 600,
        h: 2 + Math.random() * 15,
        offset: (Math.random() - 0.5) * 30 * power,
        life: 8 + Math.random() * 10,
      });
    }
  }

  update() {
    this.intensity *= 0.88;
    if (this.intensity < 0.01) this.intensity = 0;
    this.slices = this.slices.filter((s) => { s.life--; return s.life > 0; });
  }

  render(ctx, w, h) {
    if (this.intensity <= 0 && this.slices.length === 0) return;

    // RGB channel split
    if (this.intensity > 0.1) {
      const shift = this.intensity * 12;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = this.intensity * 0.4;

      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-shift, 0, w, h);
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(shift, 0, w, h);
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(0, -shift * 0.5, w, h);

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    // Horizontal slice displacement
    for (const s of this.slices) {
      const alpha = s.life / 15;
      // Copy a horizontal strip and offset it
      try {
        const imgData = ctx.getImageData(0, Math.max(0, Math.floor(s.y)), w, Math.max(1, Math.floor(s.h)));
        ctx.globalAlpha = alpha;
        ctx.putImageData(imgData, Math.floor(s.offset), Math.max(0, Math.floor(s.y)));
        ctx.globalAlpha = 1;
      } catch {
        // getImageData may fail in some contexts
      }
    }

    // Random noise blocks
    if (this.intensity > 0.15) {
      const blockCount = Math.floor(this.intensity * 8);
      for (let i = 0; i < blockCount; i++) {
        ctx.globalAlpha = this.intensity * 0.3;
        ctx.fillStyle = Math.random() > 0.5 ? "#ff0040" : "#00ff88";
        const bx = Math.random() * w;
        const by = Math.random() * h;
        ctx.fillRect(bx, by, Math.random() * 40, Math.random() * 5);
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ---- Heartbeat / Low HP Horror ----
export class HorrorMode {
  constructor() {
    this.active = false;
    this.beat = 0;
    this.beatSpeed = 0.04;
    this.noiseCanvas = null;
    this.noiseCtx = null;
  }

  _initNoise(w, h) {
    if (this.noiseCanvas) return;
    this.noiseCanvas = document.createElement("canvas");
    this.noiseCanvas.width = w;
    this.noiseCanvas.height = h;
    this.noiseCtx = this.noiseCanvas.getContext("2d");
  }

  _generateNoise(w, h, intensity) {
    this._initNoise(w, h);
    const ctx = this.noiseCtx;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    // Sparse noise for performance
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (Math.random() < intensity * 0.3) {
          const val = Math.random() * 255;
          for (let dy = 0; dy < step && y + dy < h; dy++) {
            for (let dx = 0; dx < step && x + dx < w; dx++) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              data[idx] = val;
              data[idx + 1] = val;
              data[idx + 2] = val;
              data[idx + 3] = Math.floor(intensity * 40);
            }
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  update(hpRatio) {
    this.active = hpRatio < 0.45;
    if (this.active) {
      // Heartbeat speeds up as HP drops
      this.beatSpeed = 0.04 + (1 - hpRatio) * 0.06;
      this.beat += this.beatSpeed;
    }
  }

  render(ctx, w, h, hpRatio) {
    if (!this.active) return;

    const danger = 1 - (hpRatio / 0.45); // 0 to 1

    // Heartbeat red pulse (entire screen edges)
    const pulse = Math.pow(Math.sin(this.beat), 8); // sharp pulse
    const pulseAlpha = pulse * 0.2 * danger;

    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.65);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, "transparent");
    grad.addColorStop(1, `rgba(180, 0, 0, ${pulseAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // TV static noise (increases with danger)
    if (danger > 0.3) {
      this._generateNoise(w, h, danger);
      ctx.globalAlpha = danger * 0.15;
      ctx.drawImage(this.noiseCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Subtle screen warp (achieved via random horizontal line offsets)
    if (danger > 0.5) {
      const warpLines = Math.floor(danger * 4);
      for (let i = 0; i < warpLines; i++) {
        const sy = Math.floor(Math.random() * h);
        const sh = 1 + Math.floor(Math.random() * 3);
        const offset = (Math.random() - 0.5) * danger * 8;
        try {
          const strip = ctx.getImageData(0, sy, w, sh);
          ctx.putImageData(strip, Math.floor(offset), sy);
        } catch {}
      }
    }

    // Flickering darkness
    if (danger > 0.6 && Math.random() < danger * 0.05) {
      ctx.globalAlpha = 0.1 + Math.random() * 0.15;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

// ---- Fog of War ----
export class FogOfWar {
  constructor() {
    this.enabled = false;
    this.radius = 200;
  }

  render(ctx, w, h, px, py, playerW, playerH, level) {
    // Fog appears from level 5+, gets thicker
    if (level < 5) return;

    const cx = px + playerW / 2;
    const cy = py + playerH / 2;
    const fogDensity = Math.min(0.7, 0.15 + (level - 5) * 0.04);
    const radius = Math.max(100, 220 - level * 5);

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.6, "transparent");
    grad.addColorStop(1, `rgba(0, 0, 0, ${fogDensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Extra dark corners
    const cornerGrad = ctx.createRadialGradient(cx, cy, radius, cx, cy, w);
    cornerGrad.addColorStop(0, "transparent");
    cornerGrad.addColorStop(1, `rgba(0, 0, 0, ${fogDensity * 0.5})`);
    ctx.fillStyle = cornerGrad;
    ctx.fillRect(0, 0, w, h);
  }
}

// ---- Boss Horror Entrance ----
export class BossEntrance {
  constructor() {
    this.active = false;
    this.life = 0;
    this.maxLife = 40;
  }

  trigger() {
    this.active = true;
    this.life = this.maxLife;
  }

  update() {
    if (!this.active) return;
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  render(ctx, w, h) {
    if (!this.active) return;
    const progress = 1 - this.life / this.maxLife;

    // White flash at start
    if (progress < 0.15) {
      ctx.globalAlpha = (0.15 - progress) * 4;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    }

    // Heavy screen tear
    if (progress < 0.5) {
      const tearIntensity = (0.5 - progress) * 2;
      const tearCount = Math.floor(tearIntensity * 12);
      for (let i = 0; i < tearCount; i++) {
        const ty = Math.random() * h;
        const th = 2 + Math.random() * 8;
        const tOffset = (Math.random() - 0.5) * 60 * tearIntensity;
        try {
          const strip = ctx.getImageData(0, Math.max(0, Math.floor(ty)), w, Math.max(1, Math.floor(th)));
          ctx.putImageData(strip, Math.floor(tOffset), Math.max(0, Math.floor(ty)));
        } catch {}
      }

      // Heavy RGB split
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = tearIntensity * 0.3;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-15 * tearIntensity, 0, w, h);
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(15 * tearIntensity, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    // Red vignette building
    const vigAlpha = Math.min(0.3, progress * 0.4);
    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, `rgba(100, 0, 0, ${vigAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 1;
  }
}

// ---- CRT Scanline Effect ----
export function renderCRT(ctx, w, h, horrorLevel = 0) {
  // Scanlines (denser when horror)
  const scanGap = horrorLevel > 0.5 ? 2 : 3;
  ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + horrorLevel * 0.04})`;
  for (let y = 0; y < h; y += scanGap) {
    ctx.fillRect(0, y, w, 1);
  }

  // Vignette (darker when horror)
  const vigDark = 0.35 + horrorLevel * 0.2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(1, `rgba(0, 0, 0, ${vigDark})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Chromatic aberration (stronger when horror)
  const aberration = 2 + horrorLevel * 4;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.015 + horrorLevel * 0.01;
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(aberration, 0, w, h);
  ctx.fillStyle = "#0000ff";
  ctx.fillRect(-aberration, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// ---- Utility Particle Effects ----
export function createRingExplosion(particles, x, y, color, radius = 40) {
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (radius / 10),
      vy: Math.sin(angle) * (radius / 10),
      life: 25,
      color,
      size: 2,
    });
  }
}

export function emitTrail(particles, x, y, color) {
  particles.push({
    x: x + Math.random() * 6 - 3,
    y: y + Math.random() * 4,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.5 + Math.random() * 0.5,
    life: 12 + Math.random() * 8,
    color,
    size: 1.5 + Math.random() * 2,
  });
}

export function emitSparkle(particles, x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 3 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 15,
      color,
      size: 1.5 + Math.random() * 2.5,
      sparkle: true,
    });
  }
}
