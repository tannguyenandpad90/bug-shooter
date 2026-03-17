// ==================== VISUAL EFFECTS SYSTEM ====================

// Scrolling code rain (Matrix-style but with real code)
const CODE_SNIPPETS = [
  "const x = 0;",
  "if (bug) fix();",
  "return null;",
  "async/await",
  "try { } catch",
  "npm install",
  "git push -f",
  "console.log",
  "undefined",
  "===",
  "() => {}",
  "import React",
  "useState()",
  "useEffect",
  "JSON.parse",
  ".map(fn)",
  ".filter()",
  "Promise.all",
  "export default",
  "throw Error",
  "while(true)",
  "break;",
  "yield*",
  "new Map()",
  "Object.keys",
  "Array.from",
  "Set.has()",
  "RegExp",
  "fetch(url)",
  "res.json()",
];

export class CodeRain {
  constructor(w, h) {
    this.columns = [];
    this.w = w;
    this.h = h;
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

  update() {
    for (const col of this.columns) {
      col.timer++;
      if (col.timer >= col.nextSpawn) {
        col.timer = 0;
        col.nextSpawn = 40 + Math.random() * 120;
        const snippet = CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
        for (let i = 0; i < snippet.length; i++) {
          col.chars.push({
            char: snippet[i],
            y: -i * 14,
            alpha: 0.6 + Math.random() * 0.4,
            bright: i === 0,
          });
        }
      }
      for (const ch of col.chars) {
        ch.y += col.speed;
        ch.alpha *= 0.999;
      }
      col.chars = col.chars.filter((ch) => ch.y < this.h + 20 && ch.alpha > 0.01);
    }
  }

  render(ctx) {
    ctx.font = "11px monospace";
    for (const col of this.columns) {
      for (const ch of col.chars) {
        ctx.globalAlpha = ch.alpha * 0.08;
        ctx.fillStyle = ch.bright ? "#00ff88" : "#00aa44";
        ctx.fillText(ch.char, col.x, ch.y);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Floating damage numbers
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

// Kill streak announcements
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

    // Background flash
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

// Level-up banner
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

    // Slide in from top
    const slideY = progress < 0.15
      ? h * 0.35 * (progress / 0.15)
      : progress > 0.7
        ? h * 0.35 * (1 - (progress - 0.7) / 0.3)
        : h * 0.35;

    // Background bar
    ctx.globalAlpha = Math.min(0.8, this.life / 20);
    ctx.fillStyle = "rgba(0, 255, 136, 0.05)";
    ctx.fillRect(0, slideY - 30, w, 60);

    // Lines
    ctx.strokeStyle = "rgba(0, 255, 136, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, slideY - 30); ctx.lineTo(w, slideY - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, slideY + 30); ctx.lineTo(w, slideY + 30); ctx.stroke();

    // Text
    ctx.globalAlpha = Math.min(1, this.life / 15);
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 20;
    ctx.fillText(`LEVEL ${this.level}`, w / 2, slideY + 10);
    ctx.shadowBlur = 0;

    // Subtitle
    const tierNames = ["", "◆◆ DOUBLE SHOT UNLOCKED!", "◆◆◆ TRIPLE SHOT UNLOCKED!"];
    const tier = this.level >= 8 ? 2 : this.level >= 4 ? 1 : 0;
    if ((this.level === 4 || this.level === 8)) {
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

// CRT Scanline effect
export function renderCRT(ctx, w, h) {
  // Scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }

  // Vignette (corner darkness)
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle chromatic aberration on edges
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.015;
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(2, 0, w, h);
  ctx.fillStyle = "#0000ff";
  ctx.fillRect(-2, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// Ring explosion effect
export function createRingExplosion(particles, x, y, color, radius = 40) {
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * (radius / 10),
      vy: Math.sin(angle) * (radius / 10),
      life: 25,
      color,
      size: 2,
    });
  }
}

// Player trail particles
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

// Star/sparkle for powerup pickup
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
