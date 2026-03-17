import { sfxShoot, sfxHit, sfxKill, sfxPickup, sfxDamage, sfxBossAppear, sfxBossDie, sfxCombo, sfxDash, sfxLevelUp, startHeartbeat, stopHeartbeat, sfxHorrorDrone, sfxDroneDeploy } from "./audio";
import { startMusic, stopMusic, setMusicIntensity, setBossMusic } from "./music";
import { CodeRain, DamageNumbers, Announcements, LevelBanner, BloodSplatter, ScreenCracks, FloatingErrors, DamageGlitch, HorrorMode, FogOfWar, BossEntrance, renderCRT, createRingExplosion, emitTrail, emitSparkle } from "./vfx";

const CANVAS_W = 800;
const CANVAS_H = 600;

const PLAYER_SIZE = 40;
const BULLET_W = 18;
const BULLET_H = 24;
const ENEMY_SIZE = 36;
const POWERUP_SIZE = 28;

const BASE_SPEED = 5;
const BULLET_SPEED = 8;
const ENEMY_BASE_SPEED = 1.5;
const SHOOT_COOLDOWN = 250;

const DASH_SPEED = 18;
const DASH_DURATION = 8;
const DASH_COOLDOWN = 60;

const COMBO_WINDOW = 120;

const DRONE_MAX = 3;
const DRONE_LIFETIME = 1500; // ~25 seconds at 60fps
const DRONE_ORBIT_RADIUS = 55;
const DRONE_SHOOT_COOLDOWN = 30; // frames
const DRONE_BULLET_SPEED = 7;

const BOSS_NAMES = [
  "MEMORY LEAK",
  "NULL POINTER",
  "INFINITE LOOP",
  "RACE CONDITION",
  "STACK OVERFLOW",
  "SEGFAULT",
  "DEADLOCK",
];

export function createInitialState() {
  return {
    player: {
      x: CANVAS_W / 2 - PLAYER_SIZE / 2,
      y: CANVAS_H - PLAYER_SIZE - 20,
      w: PLAYER_SIZE,
      h: PLAYER_SIZE,
      hp: 5,
      maxHp: 5,
      speed: BASE_SPEED,
      speedTimer: 0,
      bigBullet: false,
      bigBulletTimer: 0,
      dashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      dashDx: 0,
      dashDy: 0,
      afterimages: [],
      invincible: 0,
    },
    bullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    boss: null,
    bossWarning: 0,
    score: 0,
    level: 1,
    prevLevel: 1,
    enemiesKilled: 0,
    lastShot: 0,
    gameOver: false,
    spawnTimer: 0,
    spawnInterval: 90,
    keys: {},
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    comboPopups: [],
    screenShake: 0,
    weaponTier: 0,
    frame: 0,
    drones: [], // Docker container drones
    // VFX systems
    codeRain: new CodeRain(CANVAS_W, CANVAS_H),
    dmgNumbers: new DamageNumbers(),
    announcements: new Announcements(),
    levelBanner: new LevelBanner(),
    bloodSplatter: new BloodSplatter(),
    screenCracks: new ScreenCracks(CANVAS_W, CANVAS_H),
    floatingErrors: new FloatingErrors(CANVAS_W, CANVAS_H),
    damageGlitch: new DamageGlitch(),
    horrorMode: new HorrorMode(),
    fogOfWar: new FogOfWar(),
    bossEntrance: new BossEntrance(),
  };
}

// --- Enemy types ---

function createNormalEnemy(state) {
  const speed = ENEMY_BASE_SPEED + state.level * 0.3;
  return {
    x: Math.random() * (CANVAS_W - ENEMY_SIZE),
    y: -ENEMY_SIZE,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    speed: speed + Math.random() * 0.8,
    hp: 1 + Math.floor(state.level / 3),
    type: "normal",
    frame: 0,
  };
}

function createZigzagEnemy(state) {
  const speed = ENEMY_BASE_SPEED + state.level * 0.2;
  return {
    x: Math.random() * (CANVAS_W - ENEMY_SIZE),
    y: -ENEMY_SIZE,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    speed: speed + 0.5,
    hp: 1 + Math.floor(state.level / 4),
    type: "zigzag",
    frame: 0,
    amplitude: 2 + Math.random() * 2,
    startX: 0,
  };
}

function createSplitterEnemy(state) {
  const speed = ENEMY_BASE_SPEED + state.level * 0.15;
  return {
    x: Math.random() * (CANVAS_W - ENEMY_SIZE * 1.2),
    y: -ENEMY_SIZE * 1.2,
    w: ENEMY_SIZE * 1.2,
    h: ENEMY_SIZE * 1.2,
    speed,
    hp: 2 + Math.floor(state.level / 3),
    type: "splitter",
    frame: 0,
  };
}

function createMiniEnemy(x, y, dx) {
  return {
    x, y,
    w: ENEMY_SIZE * 0.7,
    h: ENEMY_SIZE * 0.7,
    speed: 2.5,
    hp: 1,
    type: "mini",
    frame: 0,
    dx,
  };
}

// TANK — big, slow, lots of HP, armored shell
function createTankEnemy(state) {
  return {
    x: Math.random() * (CANVAS_W - ENEMY_SIZE * 1.5),
    y: -ENEMY_SIZE * 1.5,
    w: ENEMY_SIZE * 1.5,
    h: ENEMY_SIZE * 1.5,
    speed: 0.6 + state.level * 0.05,
    hp: 5 + Math.floor(state.level / 2) * 2,
    type: "tank",
    frame: 0,
  };
}

// SHOOTER — stops midscreen and fires projectiles at player
function createShooterEnemy(state) {
  const targetY = 60 + Math.random() * 180;
  return {
    x: Math.random() * (CANVAS_W - ENEMY_SIZE),
    y: -ENEMY_SIZE,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    speed: 2 + state.level * 0.15,
    hp: 2 + Math.floor(state.level / 3),
    type: "shooter",
    frame: 0,
    targetY,
    parked: false,
    shootTimer: 0,
    shootInterval: 80 - Math.min(state.level * 3, 40),
    projectiles: [],
    parkTimer: 300 + Math.floor(Math.random() * 120),
  };
}

// SWARM — tiny, fast, always spawns in a group of 4-5
function createSwarmGroup(state) {
  const baseX = 50 + Math.random() * (CANVAS_W - 100);
  const count = 4 + Math.floor(Math.random() * 2);
  const bugs = [];
  for (let i = 0; i < count; i++) {
    bugs.push({
      x: baseX + (i - count / 2) * 22,
      y: -ENEMY_SIZE * 0.6 - i * 12,
      w: ENEMY_SIZE * 0.6,
      h: ENEMY_SIZE * 0.6,
      speed: 3 + state.level * 0.2 + Math.random() * 0.5,
      hp: 1,
      type: "swarm",
      frame: Math.floor(Math.random() * 60),
      swarmIndex: i,
      swarmBaseX: baseX,
    });
  }
  return bugs;
}

// TELEPORTER — moves down, then teleports to random x every few seconds
function createTeleporterEnemy(state) {
  return {
    x: Math.random() * (CANVAS_W - ENEMY_SIZE),
    y: -ENEMY_SIZE,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    speed: 1 + state.level * 0.1,
    hp: 2 + Math.floor(state.level / 4),
    type: "teleporter",
    frame: 0,
    teleportTimer: 90 + Math.floor(Math.random() * 60),
    teleportCooldown: 0,
    ghostAlpha: 1,
  };
}

// --- Boss ---

function createBoss(state) {
  const lvl = state.level;
  const nameIdx = Math.floor((lvl / 5 - 1) % BOSS_NAMES.length);
  return {
    x: CANVAS_W / 2 - 60,
    y: -120,
    w: 120,
    h: 80,
    hp: 20 + lvl * 8,
    maxHp: 20 + lvl * 8,
    speed: 1,
    name: BOSS_NAMES[nameIdx],
    phase: "enter",
    moveDir: 1,
    shootTimer: 0,
    shootInterval: 60 - Math.min(lvl * 2, 30),
    projectiles: [],
    flashTimer: 0,
  };
}

export function spawnEnemy(state) {
  if (state.boss) return;
  const roll = Math.random();
  const lvl = state.level;

  if (lvl >= 7 && roll < 0.06) {
    // Swarm — group of tiny fast bugs
    state.enemies.push(...createSwarmGroup(state));
  } else if (lvl >= 6 && roll < 0.12) {
    // Teleporter — blinks around
    state.enemies.push(createTeleporterEnemy(state));
  } else if (lvl >= 5 && roll < 0.18) {
    // Shooter — parks and fires at player
    state.enemies.push(createShooterEnemy(state));
  } else if (lvl >= 4 && roll < 0.25) {
    // Tank — big slow armored
    state.enemies.push(createTankEnemy(state));
  } else if (lvl >= 3 && roll < 0.35) {
    state.enemies.push(createSplitterEnemy(state));
  } else if (lvl >= 2 && roll < 0.50) {
    state.enemies.push(createZigzagEnemy(state));
  } else {
    state.enemies.push(createNormalEnemy(state));
  }
}

export function spawnPowerup(x, y) {
  if (Math.random() > 0.25) return null;
  const roll = Math.random();
  let type;
  if (roll < 0.15) {
    type = "docker"; // 15% chance
  } else if (roll < 0.575) {
    type = "refactor";
  } else {
    type = "coffee";
  }
  return { x, y, w: POWERUP_SIZE, h: POWERUP_SIZE, type, life: 360 };
}

function createDrone(state) {
  // Each drone orbits at a different angle offset
  const count = state.drones.length;
  const angleOffset = (Math.PI * 2 / DRONE_MAX) * count;
  return {
    angle: angleOffset,
    orbitSpeed: 0.03,
    life: DRONE_LIFETIME,
    maxLife: DRONE_LIFETIME,
    shootCooldown: 0,
    x: 0, // computed each frame
    y: 0,
  };
}

function findNearestEnemy(state, x, y) {
  let nearest = null;
  let minDist = Infinity;
  for (const e of state.enemies) {
    const dx = (e.x + e.w / 2) - x;
    const dy = (e.y + e.h / 2) - y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  }
  // Also target boss
  if (state.boss && state.boss.phase === "fight") {
    const b = state.boss;
    const dx = (b.x + b.w / 2) - x;
    const dy = (b.y + b.h / 2) - y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      nearest = b;
    }
  }
  return nearest;
}

function spawnParticles(state, x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20 + Math.random() * 15,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnExplosion(state, x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 2 + Math.random() * 4;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getWeaponTier(level) {
  if (level >= 8) return 2;
  if (level >= 4) return 1;
  return 0;
}

function getComboMultiplier(combo) {
  if (combo >= 20) return 5;
  if (combo >= 10) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function shoot(state) {
  const now = Date.now();
  if (now - state.lastShot < SHOOT_COOLDOWN) return;
  state.lastShot = now;
  sfxShoot();

  const p = state.player;
  const big = p.bigBullet;
  const w = big ? BULLET_W * 2 : BULLET_W;
  const h = big ? BULLET_H * 1.5 : BULLET_H;
  const damage = big ? 3 : 1;
  const cx = p.x + p.w / 2;
  const tier = state.weaponTier;

  if (tier === 0) {
    state.bullets.push({ x: cx - w / 2, y: p.y - h, w, h, big, damage, vx: 0 });
  } else if (tier === 1) {
    state.bullets.push({ x: cx - w / 2 - 10, y: p.y - h, w, h, big, damage, vx: 0 });
    state.bullets.push({ x: cx - w / 2 + 10, y: p.y - h, w, h, big, damage, vx: 0 });
  } else {
    state.bullets.push({ x: cx - w / 2, y: p.y - h, w, h, big, damage, vx: 0 });
    state.bullets.push({ x: cx - w / 2 - 14, y: p.y - h + 6, w, h, big, damage, vx: -0.8 });
    state.bullets.push({ x: cx - w / 2 + 14, y: p.y - h + 6, w, h, big, damage, vx: 0.8 });
  }
}

function addCombo(state, x, y) {
  state.combo++;
  state.comboTimer = COMBO_WINDOW;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  if (state.combo >= 3) {
    sfxCombo();
    state.comboPopups.push({
      x, y,
      text: `${state.combo}x COMBO!`,
      life: 45,
      multiplier: getComboMultiplier(state.combo),
    });
  }
  state.announcements.check(state.combo);
}

function tryDash(state) {
  const p = state.player;
  if (p.dashCooldown > 0 || p.dashing) return;

  let dx = 0, dy = 0;
  if (state.keys["ArrowLeft"] || state.keys["KeyA"]) dx -= 1;
  if (state.keys["ArrowRight"] || state.keys["KeyD"]) dx += 1;
  if (state.keys["ArrowUp"] || state.keys["KeyW"]) dy -= 1;
  if (state.keys["ArrowDown"] || state.keys["KeyS"]) dy += 1;
  if (dx === 0 && dy === 0) return;

  const len = Math.sqrt(dx * dx + dy * dy);
  p.dashDx = (dx / len) * DASH_SPEED;
  p.dashDy = (dy / len) * DASH_SPEED;
  p.dashing = true;
  p.dashTimer = DASH_DURATION;
  p.dashCooldown = DASH_COOLDOWN;
  p.invincible = DASH_DURATION;
  sfxDash();
}

export function update(state) {
  if (state.gameOver) return state;
  state.frame++;
  // Start music on first frame
  if (state.frame === 1) startMusic();
  // Adapt music intensity to game state
  const hpRatio = state.player.hp / state.player.maxHp;
  const levelIntensity = Math.min(1, state.level / 12);
  const dangerIntensity = hpRatio < 0.4 ? (1 - hpRatio) * 0.5 : 0;
  setMusicIntensity(Math.min(1, levelIntensity + dangerIntensity));
  setBossMusic(!!state.boss && state.boss.phase === "fight");

  const p = state.player;

  // Update VFX systems
  state.codeRain.update();
  state.codeRain.setHorrorLevel(state.level);
  state.dmgNumbers.update();
  state.announcements.update();
  state.levelBanner.update();
  state.bloodSplatter.update();
  state.screenCracks.update();
  state.floatingErrors.update();
  state.floatingErrors.maybeSpawn(state.level);
  state.damageGlitch.update();
  state.horrorMode.update(p.hp / p.maxHp);
  // Heartbeat audio
  if (p.hp / p.maxHp < 0.45) { startHeartbeat(); } else { stopHeartbeat(); }
  state.bossEntrance.update();

  // Dash cooldown
  if (p.dashCooldown > 0) p.dashCooldown--;
  if (p.invincible > 0) p.invincible--;

  if ((state.keys["ShiftLeft"] || state.keys["ShiftRight"]) && !p.dashing) {
    tryDash(state);
  }

  // Movement
  if (p.dashing) {
    p.x += p.dashDx;
    p.y += p.dashDy;
    p.dashTimer--;
    p.afterimages.push({ x: p.x, y: p.y, life: 8 });
    if (p.dashTimer <= 0) p.dashing = false;
  } else {
    if (state.keys["ArrowLeft"] || state.keys["KeyA"]) p.x -= p.speed;
    if (state.keys["ArrowRight"] || state.keys["KeyD"]) p.x += p.speed;
    if (state.keys["ArrowUp"] || state.keys["KeyW"]) p.y -= p.speed;
    if (state.keys["ArrowDown"] || state.keys["KeyS"]) p.y += p.speed;
  }

  p.x = Math.max(0, Math.min(CANVAS_W - p.w, p.x));
  p.y = Math.max(0, Math.min(CANVAS_H - p.h, p.y));

  // Player trail
  if (state.frame % 2 === 0) {
    const trailColor = p.speedTimer > 0 ? "#f59e0b" : p.bigBulletTimer > 0 ? "#a855f7" : "#00ff8844";
    emitTrail(state.particles, p.x + p.w / 2, p.y + p.h, trailColor);
  }

  p.afterimages = p.afterimages.filter((a) => { a.life--; return a.life > 0; });

  if (state.keys["Space"]) shoot(state);

  if (p.speedTimer > 0) { p.speedTimer--; if (p.speedTimer === 0) p.speed = BASE_SPEED; }
  if (p.bigBulletTimer > 0) { p.bigBulletTimer--; if (p.bigBulletTimer === 0) p.bigBullet = false; }

  if (state.comboTimer > 0) {
    state.comboTimer--;
    if (state.comboTimer === 0) state.combo = 0;
  }

  state.comboPopups = state.comboPopups.filter((cp) => { cp.y -= 0.8; cp.life--; return cp.life > 0; });

  if (state.screenShake > 0) state.screenShake *= 0.85;
  if (state.screenShake < 0.5) state.screenShake = 0;

  state.weaponTier = getWeaponTier(state.level);

  // Bullets
  state.bullets = state.bullets.filter((b) => {
    if (b.isDrone) {
      b.x += (b.vx || 0);
      b.y += (b.vy || 0);
    } else {
      b.y -= BULLET_SPEED;
      b.x += (b.vx || 0);
    }
    return b.y + b.h > -20 && b.y < CANVAS_H + 20 && b.x > -20 && b.x < CANVAS_W + 20;
  });

  // Boss warning
  if (state.bossWarning > 0) {
    state.bossWarning--;
    if (state.bossWarning % 30 === 0) sfxHorrorDrone();
    if (state.bossWarning === 0 && !state.boss) {
      state.boss = createBoss(state);
      sfxBossAppear();
      state.bossEntrance.trigger();
      state.damageGlitch.trigger(1.5);
    }
    return state;
  }

  // --- Boss logic ---
  if (state.boss) {
    const boss = state.boss;

    if (boss.phase === "enter") {
      boss.y += 1.5;
      if (boss.y >= 30) { boss.y = 30; boss.phase = "fight"; }
    } else if (boss.phase === "fight") {
      boss.x += boss.speed * boss.moveDir;
      if (boss.x <= 10) boss.moveDir = 1;
      if (boss.x + boss.w >= CANVAS_W - 10) boss.moveDir = -1;

      boss.shootTimer++;
      if (boss.shootTimer >= boss.shootInterval) {
        boss.shootTimer = 0;
        const bcx = boss.x + boss.w / 2;
        const bcy = boss.y + boss.h;
        boss.projectiles.push({ x: bcx - 4, y: bcy, w: 8, h: 8, speed: 3.5 });
        if (state.level >= 10) {
          boss.projectiles.push({ x: bcx - 4, y: bcy, w: 8, h: 8, speed: 3.5, vx: -1.5 });
          boss.projectiles.push({ x: bcx - 4, y: bcy, w: 8, h: 8, speed: 3.5, vx: 1.5 });
        }
      }

      if (boss.flashTimer > 0) boss.flashTimer--;

      state.bullets = state.bullets.filter((b) => {
        if (rectsCollide(b, boss)) {
          boss.hp -= b.damage;
          boss.flashTimer = 4;
          spawnParticles(state, b.x, b.y, "#ffaa00", 3);
          state.dmgNumbers.add(b.x, b.y, b.damage, "#ffaa00");
          sfxHit();

          if (boss.hp <= 0) {
            boss.phase = "dying";
            state.score += 100 * state.level;
            state.screenShake = 15;
            spawnExplosion(state, boss.x + boss.w / 2, boss.y + boss.h / 2, "#ff0040", 30);
            spawnExplosion(state, boss.x + boss.w / 2, boss.y + boss.h / 2, "#ffaa00", 20);
            createRingExplosion(state.particles, boss.x + boss.w / 2, boss.y + boss.h / 2, "#ff0040", 80);
            createRingExplosion(state.particles, boss.x + boss.w / 2, boss.y + boss.h / 2, "#ffaa00", 50);
            state.dmgNumbers.add(boss.x + boss.w / 2, boss.y, "DESTROYED!", "#ff0040", 22);
            sfxBossDie();
            state.bloodSplatter.add(boss.x + boss.w / 2, boss.y + boss.h / 2, 3);
            state.damageGlitch.trigger(2);
            for (let i = 0; i < 3; i++) {
              const pu = spawnPowerup(boss.x + i * 30, boss.y + boss.h);
              if (pu) state.powerups.push(pu);
            }
          }
          return false;
        }
        return true;
      });
    } else if (boss.phase === "dying") {
      boss.y += 0.5;
      // Dying explosions
      if (state.frame % 5 === 0) {
        const rx = boss.x + Math.random() * boss.w;
        const ry = boss.y + Math.random() * boss.h;
        spawnExplosion(state, rx, ry, "#ff4400", 6);
      }
      if (boss.y > CANVAS_H) state.boss = null;
    }

    if (boss) {
      boss.projectiles = boss.projectiles.filter((proj) => {
        proj.y += proj.speed;
        proj.x += (proj.vx || 0);
        if (proj.y > CANVAS_H) return false;

        if (!p.dashing && p.invincible <= 0 && rectsCollide(proj, p)) {
          p.hp--;
          state.screenShake = 8;
          sfxDamage();
          spawnParticles(state, p.x + p.w / 2, p.y + p.h / 2, "#ff4444", 8);
          state.dmgNumbers.add(p.x + p.w / 2, p.y, 1, "#ff4444", 18);
          state.damageGlitch.trigger(1);
          state.screenCracks.addCrack();
          if (p.hp <= 0) { state.gameOver = true; stopHeartbeat(); stopMusic(); }
          return false;
        }
        return true;
      });
    }
  }

  // Enemies spawn
  if (!state.boss && state.bossWarning === 0) {
    state.spawnTimer++;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnEnemy(state);
    }
  }

  const newEnemies = [];
  state.enemies = state.enemies.filter((e) => {
    e.frame++;

    // --- Movement by type ---
    if (e.type === "zigzag") {
      e.y += e.speed;
      if (e.startX === 0) e.startX = e.x;
      e.x = e.startX + Math.sin(e.frame * 0.08) * 60 * e.amplitude * 0.5;
    } else if (e.type === "mini") {
      e.y += e.speed;
      e.x += (e.dx || 0);
    } else if (e.type === "tank") {
      e.y += e.speed;
    } else if (e.type === "shooter") {
      if (!e.parked) {
        e.y += e.speed;
        if (e.y >= e.targetY) {
          e.y = e.targetY;
          e.parked = true;
        }
      } else {
        // Parked — shoot at player
        e.shootTimer++;
        e.parkTimer--;
        if (e.shootTimer >= e.shootInterval) {
          e.shootTimer = 0;
          const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
          const dy = (p.y + p.h / 2) - (e.y + e.h / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            e.projectiles.push({
              x: e.x + e.w / 2 - 3, y: e.y + e.h,
              w: 6, h: 6, speed: 3.5,
              vx: (dx / dist) * 3.5, vy: (dy / dist) * 3.5,
            });
          }
        }
        if (e.parkTimer <= 0) {
          e.parked = false;
          e.speed = 3;
        }
      }
      // Shooter projectiles
      e.projectiles = (e.projectiles || []).filter((proj) => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        if (proj.x < -10 || proj.x > CANVAS_W + 10 || proj.y > CANVAS_H + 10) return false;
        if (!p.dashing && p.invincible <= 0 && rectsCollide(proj, p)) {
          p.hp--;
          state.screenShake = 6;
          sfxDamage();
          spawnParticles(state, p.x + p.w / 2, p.y + p.h / 2, "#ff4444", 6);
          state.dmgNumbers.add(p.x + p.w / 2, p.y, 1, "#ff4444", 16);
          state.damageGlitch.trigger(0.8);
          if (p.hp <= 0) { state.gameOver = true; stopHeartbeat(); stopMusic(); }
          return false;
        }
        return true;
      });
    } else if (e.type === "swarm") {
      e.y += e.speed;
      // Wave formation
      e.x = e.swarmBaseX + Math.sin(e.frame * 0.06 + e.swarmIndex) * 40;
    } else if (e.type === "teleporter") {
      e.y += e.speed;
      e.teleportCooldown--;
      if (e.teleportCooldown <= 0) {
        e.teleportCooldown = e.teleportTimer;
        // Teleport effect
        spawnParticles(state, e.x + e.w / 2, e.y + e.h / 2, "#ff00ff", 8);
        e.x = Math.random() * (CANVAS_W - e.w);
        e.ghostAlpha = 0.2;
      }
      // Fade back in after teleport
      if (e.ghostAlpha < 1) e.ghostAlpha = Math.min(1, e.ghostAlpha + 0.04);
    } else {
      e.y += e.speed;
    }

    if (!p.dashing && p.invincible <= 0 && rectsCollide(e, p)) {
      p.hp--;
      state.screenShake = 8;
      sfxDamage();
      spawnParticles(state, e.x + e.w / 2, e.y + e.h / 2, "#ff4444", 8);
      state.dmgNumbers.add(p.x + p.w / 2, p.y, 1, "#ff4444", 18);
      state.damageGlitch.trigger(1.2);
      state.screenCracks.addCrack();
      state.bloodSplatter.add(e.x + e.w / 2, e.y + e.h / 2, 0.8);
      if (p.hp <= 0) { state.gameOver = true; stopHeartbeat(); stopMusic(); }
      return false;
    }

    if (e.y > CANVAS_H + 20) return false;
    return true;
  });

  // Bullet-enemy collision
  state.bullets = state.bullets.filter((b) => {
    let alive = true;
    state.enemies = state.enemies.filter((e) => {
      if (!alive) return true;
      if (rectsCollide(b, e)) {
        e.hp -= b.damage;
        alive = false;
        if (e.hp <= 0) {
          const mult = getComboMultiplier(state.combo);
          const pts = 10 * state.level * mult;
          state.score += pts;
          state.enemiesKilled++;
          addCombo(state, e.x + e.w / 2, e.y);
          spawnParticles(state, e.x + e.w / 2, e.y + e.h / 2, "#ff0040", 10);
          createRingExplosion(state.particles, e.x + e.w / 2, e.y + e.h / 2, "#ff0040");
          state.dmgNumbers.add(e.x + e.w / 2, e.y, `+${pts}`, mult >= 3 ? "#f59e0b" : "#00ff88", 12 + mult * 2);
          sfxKill();
          state.bloodSplatter.add(e.x + e.w / 2, e.y + e.h / 2, e.type === "splitter" ? 1.5 : 1);

          if (e.type === "splitter") {
            newEnemies.push(createMiniEnemy(e.x - 10, e.y, -1.2));
            newEnemies.push(createMiniEnemy(e.x + e.w, e.y, 1.2));
            spawnExplosion(state, e.x + e.w / 2, e.y + e.h / 2, "#ff6600", 12);
          }

          const pu = spawnPowerup(e.x, e.y);
          if (pu) state.powerups.push(pu);
          return false;
        }
        spawnParticles(state, b.x, b.y, "#00ff88", 3);
        state.dmgNumbers.add(b.x, b.y, b.damage, "#00ff88");
        sfxHit();
        return true;
      }
      return true;
    });
    return alive;
  });

  state.enemies.push(...newEnemies);

  // Powerups
  state.powerups = state.powerups.filter((pu) => {
    pu.y += 1.2;
    pu.life--;
    if (pu.life <= 0 || pu.y > CANVAS_H) return false;

    if (rectsCollide(pu, p)) {
      sfxPickup();
      if (pu.type === "refactor") {
        p.bigBullet = true;
        p.bigBulletTimer = 600;
        emitSparkle(state.particles, pu.x + pu.w / 2, pu.y + pu.h / 2, "#a855f7");
        state.dmgNumbers.add(pu.x, pu.y, "REFACTOR!", "#a855f7", 16);
      } else if (pu.type === "docker") {
        if (state.drones.length < DRONE_MAX) {
          state.drones.push(createDrone(state));
          sfxDroneDeploy();
          emitSparkle(state.particles, pu.x + pu.w / 2, pu.y + pu.h / 2, "#2496ed", 16);
          state.dmgNumbers.add(pu.x, pu.y, "DOCKER DEPLOYED!", "#2496ed", 16);
        } else {
          // Refresh all drone lifetimes
          state.drones.forEach((d) => { d.life = d.maxLife; });
          emitSparkle(state.particles, pu.x + pu.w / 2, pu.y + pu.h / 2, "#2496ed", 10);
          state.dmgNumbers.add(pu.x, pu.y, "DRONES REFRESHED!", "#2496ed", 14);
        }
      } else {
        p.speed = BASE_SPEED * 1.8;
        p.speedTimer = 480;
        emitSparkle(state.particles, pu.x + pu.w / 2, pu.y + pu.h / 2, "#f59e0b");
        state.dmgNumbers.add(pu.x, pu.y, "COFFEE!", "#f59e0b", 16);
      }
      return false;
    }
    return true;
  });

  // Drones
  const pcx = p.x + p.w / 2;
  const pcy = p.y + p.h / 2;
  state.drones = state.drones.filter((drone) => {
    drone.life--;
    if (drone.life <= 0) {
      spawnParticles(state, drone.x, drone.y, "#2496ed", 8);
      return false;
    }

    // Orbit
    drone.angle += drone.orbitSpeed;
    drone.x = pcx + Math.cos(drone.angle) * DRONE_ORBIT_RADIUS;
    drone.y = pcy + Math.sin(drone.angle) * DRONE_ORBIT_RADIUS;

    // Trail
    if (state.frame % 3 === 0) {
      emitTrail(state.particles, drone.x, drone.y, "#2496ed44");
    }

    // Auto-shoot at nearest enemy
    drone.shootCooldown--;
    if (drone.shootCooldown <= 0) {
      const target = findNearestEnemy(state, drone.x, drone.y);
      if (target) {
        const tx = target.x + target.w / 2;
        const ty = target.y + target.h / 2;
        const dx = tx - drone.x;
        const dy = ty - drone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          state.bullets.push({
            x: drone.x - 6,
            y: drone.y - 6,
            w: 12,
            h: 12,
            big: false,
            damage: 1,
            vx: (dx / dist) * DRONE_BULLET_SPEED * 0.5,
            vy: (dy / dist) * DRONE_BULLET_SPEED,
            isDrone: true,
          });
        }
        drone.shootCooldown = DRONE_SHOOT_COOLDOWN;
      }
    }

    return true;
  });

  // Particles
  state.particles = state.particles.filter((pt) => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    pt.vx *= 0.97;
    pt.vy *= 0.97;
    return pt.life > 0;
  });

  // Level up
  if (state.enemiesKilled >= state.level * 8) {
    state.prevLevel = state.level;
    state.level++;
    state.spawnInterval = Math.max(25, 90 - state.level * 7);
    state.levelBanner.show(state.level);
    sfxLevelUp();

    if (state.level % 5 === 0) {
      state.bossWarning = 120;
      state.enemies = [];
    }
  }

  return state;
}

// ==================== RENDER ====================

export function render(ctx, state) {
  const W = CANVAS_W;
  const H = CANVAS_H;

  ctx.save();

  // Screen shake
  if (state.screenShake > 0) {
    const sx = (Math.random() - 0.5) * state.screenShake * 2;
    const sy = (Math.random() - 0.5) * state.screenShake * 2;
    ctx.translate(sx, sy);
  }

  // Background
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(-10, -10, W + 20, H + 20);

  // Code rain background
  state.codeRain.render(ctx);

  // Floating error messages (background horror)
  state.floatingErrors.render(ctx);

  // Grid lines
  ctx.strokeStyle = "rgba(0, 255, 100, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Blood splatters (on ground, behind entities)
  state.bloodSplatter.render(ctx);

  // Particles (behind entities)
  state.particles.forEach((pt) => {
    ctx.globalAlpha = pt.life / 35;
    ctx.fillStyle = pt.color;
    if (pt.sparkle) {
      // Star shape for sparkle particles
      const s = pt.size;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.life * 0.3);
      ctx.fillRect(-s / 2, -s / 6, s, s / 3);
      ctx.fillRect(-s / 6, -s / 2, s / 3, s);
      ctx.restore();
    } else {
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
  });
  ctx.globalAlpha = 1;

  // Player afterimages
  const p = state.player;
  const pcx = p.x + p.w / 2;
  const pcy = p.y + p.h / 2;
  p.afterimages.forEach((ai) => {
    ctx.globalAlpha = ai.life / 12;
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 1;
    ctx.strokeRect(ai.x, ai.y, p.w, p.h);
    ctx.fillStyle = "rgba(0, 255, 136, 0.05)";
    ctx.fillRect(ai.x, ai.y, p.w, p.h);
  });
  ctx.globalAlpha = 1;

  // Player
  if (p.invincible > 0 && Math.floor(state.frame / 2) % 2 === 0) {
    // blink
  } else {
    const playerColor = p.speedTimer > 0 ? "#f59e0b" : "#00ff88";
    const borderColor = p.bigBulletTimer > 0 ? "#a855f7" : "#00ff88";

    // Glow circle behind player
    const grad = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 0, p.x + p.w / 2, p.y + p.h / 2, 50);
    grad.addColorStop(0, `${playerColor}15`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - 30, p.y - 30, p.w + 60, p.h + 60);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "rgba(0, 255, 136, 0.1)";
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.fillStyle = playerColor;
    ctx.fillRect(p.x, p.y, p.w, 8);

    // Three dots on title bar
    ctx.fillStyle = "#ff4444";
    ctx.beginPath(); ctx.arc(p.x + 8, p.y + 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath(); ctx.arc(p.x + 15, p.y + 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#00ff88";
    ctx.beginPath(); ctx.arc(p.x + 22, p.y + 4, 2, 0, Math.PI * 2); ctx.fill();

    // Blinking cursor
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 16px monospace";
    const cursorBlink = Math.floor(state.frame / 20) % 2 === 0;
    ctx.fillText(cursorBlink ? ">_" : "> ", p.x + 8, p.y + 28);

    ctx.shadowColor = borderColor;
    ctx.shadowBlur = p.bigBulletTimer > 0 ? 18 : 10;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.shadowBlur = 0;
  }

  // Dash cooldown
  if (p.dashCooldown > 0) {
    const pct = 1 - p.dashCooldown / DASH_COOLDOWN;
    ctx.fillStyle = "rgba(0, 255, 136, 0.15)";
    ctx.fillRect(p.x, p.y + p.h + 4, p.w, 3);
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(p.x, p.y + p.h + 4, p.w * pct, 3);
  } else {
    ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
    ctx.font = "8px monospace";
    ctx.fillText("⇧ DASH", p.x, p.y + p.h + 12);
  }

  // Drones (Docker containers)
  state.drones.forEach((drone, i) => {
    const dx = drone.x;
    const dy = drone.y;
    const dying = drone.life < 180; // blink when about to expire
    if (dying && Math.floor(state.frame / 4) % 2 === 0) return;

    // Drone glow
    const dGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 20);
    dGrad.addColorStop(0, "rgba(36, 150, 237, 0.12)");
    dGrad.addColorStop(1, "transparent");
    ctx.fillStyle = dGrad;
    ctx.fillRect(dx - 20, dy - 20, 40, 40);

    // Drone body (mini terminal)
    ctx.strokeStyle = "#2496ed";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#2496ed";
    ctx.shadowBlur = 8;
    ctx.strokeRect(dx - 10, dy - 8, 20, 16);
    ctx.fillStyle = "rgba(36, 150, 237, 0.1)";
    ctx.fillRect(dx - 10, dy - 8, 20, 16);

    // Docker whale icon
    ctx.fillStyle = "#2496ed";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("🐳", dx, dy + 4);
    ctx.textAlign = "left";

    ctx.shadowBlur = 0;

    // Lifetime bar
    const lifePct = drone.life / drone.maxLife;
    ctx.fillStyle = "rgba(36, 150, 237, 0.2)";
    ctx.fillRect(dx - 10, dy + 10, 20, 2);
    ctx.fillStyle = dying ? "#ff6600" : "#2496ed";
    ctx.fillRect(dx - 10, dy + 10, 20 * lifePct, 2);

    // Orbit line (subtle)
    ctx.strokeStyle = "rgba(36, 150, 237, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pcx, pcy, DRONE_ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Bullets
  state.bullets.forEach((b) => {
    if (b.isDrone) {
      // Drone bullets — small blue "</>"
      ctx.fillStyle = "#2496ed";
      ctx.font = "bold 9px monospace";
      ctx.shadowColor = "#2496ed";
      ctx.shadowBlur = 6;
      ctx.fillText("</>", b.x, b.y + b.h / 2);
      ctx.shadowBlur = 0;
      return;
    }

    ctx.fillStyle = b.big ? "#a855f7" : "#00ff88";
    ctx.font = b.big ? "bold 14px monospace" : "bold 10px monospace";
    ctx.shadowColor = b.big ? "#a855f7" : "#00ff88";
    ctx.shadowBlur = 8;

    // Bullet trail
    ctx.globalAlpha = 0.3;
    ctx.fillRect(b.x + 4, b.y + b.h / 2, 8, 12);
    ctx.globalAlpha = 1;

    ctx.fillText("{}", b.x, b.y + b.h / 2);
    ctx.shadowBlur = 0;
  });

  // Enemies
  state.enemies.forEach((e) => renderEnemy(ctx, e, state.frame));

  // Boss
  if (state.boss) renderBoss(ctx, state.boss, state);

  // Boss warning
  if (state.bossWarning > 0) {
    // Red vignette
    const warnAlpha = 0.1 + Math.sin(state.frame * 0.2) * 0.05;
    const warnGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.6);
    warnGrad.addColorStop(0, "transparent");
    warnGrad.addColorStop(1, `rgba(255, 0, 64, ${warnAlpha})`);
    ctx.fillStyle = warnGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.5 + Math.sin(state.frame * 0.3) * 0.3;
    ctx.fillStyle = "#ff0040";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff0040";
    ctx.shadowBlur = 20;
    ctx.fillText("⚠ WARNING: BOSS INCOMING ⚠", W / 2, H / 2 - 10);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#ff6644";
    const bossName = BOSS_NAMES[Math.floor(((state.level) / 5 - 1) % BOSS_NAMES.length)];
    ctx.fillText(bossName, W / 2, H / 2 + 20);
    ctx.textAlign = "left";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Powerups
  state.powerups.forEach((pu) => {
    const blinking = pu.life < 60 && Math.floor(pu.life / 5) % 2 === 0;
    if (blinking) return;

    // Floating animation
    const floatY = Math.sin(pu.life * 0.1) * 3;

    const pux = pu.x + pu.w / 2;
    const puy = pu.y + pu.h / 2 + floatY;
    const puGrad = ctx.createRadialGradient(pux, puy, 0, pux, puy, 20);

    if (pu.type === "refactor") {
      puGrad.addColorStop(0, "rgba(168, 85, 247, 0.15)");
      puGrad.addColorStop(1, "transparent");
      ctx.fillStyle = puGrad;
      ctx.fillRect(pu.x - 10, pu.y - 10 + floatY, pu.w + 20, pu.h + 20);

      ctx.fillStyle = "#a855f7";
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 12;
      ctx.font = "bold 13px monospace";
      ctx.fillText("{ }", pu.x, puy);
      ctx.font = "8px monospace";
      ctx.fillStyle = "#a855f7aa";
      ctx.fillText("Refactor", pu.x - 6, pu.y + pu.h + 10 + floatY);
    } else if (pu.type === "docker") {
      puGrad.addColorStop(0, "rgba(36, 150, 237, 0.2)");
      puGrad.addColorStop(1, "transparent");
      ctx.fillStyle = puGrad;
      ctx.fillRect(pu.x - 10, pu.y - 10 + floatY, pu.w + 20, pu.h + 20);

      ctx.fillStyle = "#2496ed";
      ctx.shadowColor = "#2496ed";
      ctx.shadowBlur = 14;
      ctx.font = "22px monospace";
      ctx.fillText("🐳", pu.x - 2, puy + 6);
      ctx.font = "8px monospace";
      ctx.fillStyle = "#2496edaa";
      ctx.fillText("Docker", pu.x - 2, pu.y + pu.h + 10 + floatY);
    } else {
      puGrad.addColorStop(0, "rgba(245, 158, 11, 0.15)");
      puGrad.addColorStop(1, "transparent");
      ctx.fillStyle = puGrad;
      ctx.fillRect(pu.x - 10, pu.y - 10 + floatY, pu.w + 20, pu.h + 20);

      ctx.fillStyle = "#f59e0b";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 12;
      ctx.font = "20px monospace";
      ctx.fillText("☕", pu.x, puy + 4);
      ctx.font = "8px monospace";
      ctx.fillStyle = "#f59e0baa";
      ctx.fillText("Coffee", pu.x - 2, pu.y + pu.h + 10 + floatY);
    }
    ctx.shadowBlur = 0;
  });

  // Damage numbers
  state.dmgNumbers.render(ctx);

  // Combo popups
  state.comboPopups.forEach((cp) => {
    ctx.globalAlpha = cp.life / 45;
    ctx.fillStyle = cp.multiplier >= 4 ? "#ff0040" : cp.multiplier >= 3 ? "#f59e0b" : "#00ff88";
    ctx.font = `bold ${14 + cp.multiplier * 2}px monospace`;
    ctx.textAlign = "center";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillText(cp.text, cp.x, cp.y);
    if (cp.multiplier >= 2) {
      ctx.font = "10px monospace";
      ctx.fillText(`x${cp.multiplier} SCORE`, cp.x, cp.y + 16);
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  });
  ctx.globalAlpha = 1;

  // Announcements (NICE!, GODLIKE!, etc.)
  state.announcements.render(ctx, W, H);

  // Level banner
  state.levelBanner.render(ctx, W, H);

  // Combo counter (bottom-right)
  if (state.combo >= 2) {
    const comboColor = state.combo >= 10 ? "#ff0040" : state.combo >= 5 ? "#f59e0b" : "#00ff88";
    ctx.fillStyle = comboColor;
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "right";
    ctx.shadowColor = comboColor;
    ctx.shadowBlur = 10;
    ctx.fillText(`${state.combo}x`, W - 15, H - 35);
    ctx.font = "11px monospace";
    ctx.fillText(`x${getComboMultiplier(state.combo)} MULTI`, W - 15, H - 18);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";

    // Combo timer arc
    const arcX = W - 50;
    const arcY = H - 32;
    const pct = state.comboTimer / COMBO_WINDOW;
    ctx.strokeStyle = `${comboColor}44`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(arcX, arcY, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = comboColor;
    ctx.beginPath();
    ctx.arc(arcX, arcY, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
  }

  // Weapon tier (bottom-left)
  const tierNames = ["SINGLE", "DOUBLE", "TRIPLE"];
  const tierColors = ["#00ff8866", "#00ff88aa", "#00ff88"];
  ctx.fillStyle = tierColors[state.weaponTier];
  ctx.font = "10px monospace";
  ctx.fillText(`◆ ${tierNames[state.weaponTier]} SHOT`, 10, H - 10);

  // Fog of War (before restore to respect shake)
  state.fogOfWar.render(ctx, W, H, state.player.x, state.player.y, state.player.w, state.player.h, state.level);

  ctx.restore();

  // Horror overlays (after restore — screen-space effects)
  const horrorLevel = Math.min(1, state.level / 15);

  // Screen cracks
  state.screenCracks.render(ctx);

  // Damage glitch (RGB split, scan displacement)
  state.damageGlitch.render(ctx, W, H);

  // Boss entrance horror
  state.bossEntrance.render(ctx, W, H);

  // Low HP horror mode (heartbeat, static, warp)
  state.horrorMode.render(ctx, W, H, state.player.hp / state.player.maxHp);

  // CRT overlay (final pass)
  renderCRT(ctx, W, H, horrorLevel);
}

function renderEnemy(ctx, e, frame) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const r = e.w / 2;

  let color = "#ff0040";
  let label = "BUG";
  if (e.type === "zigzag") { color = "#ff8800"; label = "ZIGBUG"; }
  if (e.type === "splitter") { color = "#ff00aa"; label = "SPLIT"; }
  if (e.type === "mini") { color = "#ff6600"; label = "mini"; }
  if (e.type === "tank") { color = "#884400"; label = "TANK"; }
  if (e.type === "shooter") { color = "#aa00ff"; label = "SNIPER"; }
  if (e.type === "swarm") { color = "#ffcc00"; label = ""; }
  if (e.type === "teleporter") { color = "#ff00ff"; label = "GLITCH"; }

  // Teleporter ghost effect
  if (e.type === "teleporter" && e.ghostAlpha < 1) {
    ctx.globalAlpha = e.ghostAlpha;
  }

  // Enemy glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
  grad.addColorStop(0, `${color}20`);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // Body
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.7, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs with animation
  ctx.strokeStyle = color;
  ctx.lineWidth = e.type === "mini" ? 1 : 2;
  for (let i = -1; i <= 1; i++) {
    const legAnim = Math.sin(frame * 0.15 + i * 2) * 3;
    const ly = cy + i * (e.type === "mini" ? 5 : 8);
    const legLen = r * (e.type === "splitter" ? 1.3 : 1.2);
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, ly); ctx.lineTo(cx - legLen, ly + (i === 0 ? legAnim : i * 5 + legAnim)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.7, ly); ctx.lineTo(cx + legLen, ly + (i === 0 ? -legAnim : i * 5 - legAnim)); ctx.stroke();
  }

  // Antennae with animation
  const antennaWave = Math.sin(frame * 0.1) * 2;
  ctx.beginPath(); ctx.moveTo(cx - 4, cy - r * 0.8); ctx.lineTo(cx - 10 + antennaWave, cy - r * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 4, cy - r * 0.8); ctx.lineTo(cx + 10 - antennaWave, cy - r * 1.4); ctx.stroke();

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  const eyeSize = e.type === "mini" ? 2 : 3;
  ctx.beginPath(); ctx.arc(cx - 5, cy - 3, eyeSize, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 3, eyeSize, 0, Math.PI * 2); ctx.fill();
  // Pupils
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx - 4, cy - 2, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 6, cy - 2, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0;

  // Type-specific decorations
  if (e.type === "splitter") {
    ctx.strokeStyle = `${color}44`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.0 + Math.sin(frame * 0.05) * 2, r * 1.1 + Math.sin(frame * 0.05) * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (e.type === "tank") {
    // Armor shell — thick border
    ctx.strokeStyle = "#664400";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.8, r * 1.0, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Shield icon
    ctx.fillStyle = "#664400";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⛊", cx, cy + 4);
    ctx.textAlign = "left";
  }

  if (e.type === "shooter") {
    // Crosshair
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 1;
    const aimLen = r * 1.5;
    if (e.parked) {
      ctx.beginPath(); ctx.moveTo(cx, cy - aimLen); ctx.lineTo(cx, cy + aimLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - aimLen, cy); ctx.lineTo(cx + aimLen, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, aimLen * 0.6, 0, Math.PI * 2); ctx.stroke();
    }
    // Render shooter projectiles
    (e.projectiles || []).forEach((proj) => {
      ctx.fillStyle = "#aa00ff";
      ctx.shadowColor = "#aa00ff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  if (e.type === "swarm") {
    // Swarm: tiny, no extra decoration, just a smaller brighter bug
  }

  if (e.type === "teleporter") {
    // Glitch scanlines
    ctx.strokeStyle = `${color}66`;
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      const offset = Math.sin(frame * 0.2 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(cx - r + offset, cy + i * 4);
      ctx.lineTo(cx + r + offset, cy + i * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; // Reset after ghost alpha
  }

  // HP indicator
  if (e.hp > 1) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${e.hp}`, cx, cy + 4);
    ctx.textAlign = "left";
  }

  // Label
  ctx.fillStyle = `${color}cc`;
  ctx.font = `bold ${e.type === "mini" ? 7 : 9}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(label, cx, e.y + e.h + (e.type === "mini" ? 8 : 12));
  ctx.textAlign = "left";
}

function renderBoss(ctx, boss, state) {
  if (boss.phase === "dying") {
    ctx.globalAlpha = 0.3 + Math.random() * 0.3;
  }

  const bx = boss.x;
  const by = boss.y;
  const bw = boss.w;
  const bh = boss.h;

  // Boss aura
  const auraGrad = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 0, bx + bw / 2, by + bh / 2, 100);
  auraGrad.addColorStop(0, "rgba(255, 0, 64, 0.08)");
  auraGrad.addColorStop(1, "transparent");
  ctx.fillStyle = auraGrad;
  ctx.fillRect(bx - 50, by - 50, bw + 100, bh + 100);

  const flashColor = boss.flashTimer > 0 ? "#ffffff" : "#cc0030";
  ctx.fillStyle = flashColor;
  ctx.shadowColor = "#ff0040";
  ctx.shadowBlur = 25;

  ctx.fillRect(bx + 10, by + 10, bw - 20, bh - 10);

  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + 15, bw / 2 - 5, 20, 0, Math.PI, 0);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  const eyeY = by + 25;
  ctx.fillRect(bx + bw / 2 - 25, eyeY, 12, 10);
  ctx.fillRect(bx + bw / 2 + 13, eyeY, 12, 10);

  // Animated pupils
  const pupilOffset = Math.sin(state.frame * 0.05) * 2;
  ctx.fillStyle = "#ff0040";
  ctx.fillRect(bx + bw / 2 - 22 + pupilOffset, eyeY + 3, 6, 4);
  ctx.fillRect(bx + bw / 2 + 16 + pupilOffset, eyeY + 3, 6, 4);

  // Legs
  ctx.strokeStyle = flashColor;
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const lx = bx + 15 + i * ((bw - 30) / 3);
    const wobble = Math.sin(state.frame * 0.1 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(lx, by + bh);
    ctx.lineTo(lx + wobble, by + bh + 18);
    ctx.stroke();
  }

  // Boss name with glow
  ctx.fillStyle = "#ff0040";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.shadowColor = "#ff0040";
  ctx.shadowBlur = 15;
  ctx.fillText(boss.name, bx + bw / 2, by - 28);
  ctx.shadowBlur = 0;

  // HP bar (enhanced)
  const hpPct = Math.max(0, boss.hp / boss.maxHp);
  const barW = bw + 20;
  const barX = bx - 10;
  const barY = by - 15;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(barX - 1, barY - 1, barW + 2, 8);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(barX, barY, barW, 6);

  // HP gradient
  const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW * hpPct, 0);
  hpGrad.addColorStop(0, hpPct > 0.5 ? "#ff0040" : "#ff0000");
  hpGrad.addColorStop(1, hpPct > 0.5 ? "#ff4466" : "#ff2200");
  ctx.fillStyle = hpGrad;
  ctx.fillRect(barX, barY, barW * hpPct, 6);

  // HP bar glow
  ctx.shadowColor = "#ff0040";
  ctx.shadowBlur = 6;
  ctx.fillRect(barX, barY, barW * hpPct, 6);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255, 0, 64, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 6);

  ctx.fillStyle = "#fff";
  ctx.font = "9px monospace";
  ctx.fillText(`${Math.max(0, boss.hp)}/${boss.maxHp}`, bx + bw / 2, barY - 4);
  ctx.textAlign = "left";

  // Projectiles
  boss.projectiles.forEach((proj) => {
    // Projectile trail
    ctx.fillStyle = "rgba(255, 68, 68, 0.2)";
    ctx.beginPath();
    ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2 - 6, proj.w / 2 + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff4444";
    ctx.shadowColor = "#ff0040";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = "#ff8888";
    ctx.beginPath();
    ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  });

  ctx.globalAlpha = 1;
}

export { CANVAS_W, CANVAS_H };
