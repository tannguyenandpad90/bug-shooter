import { useRef, useEffect, useCallback, useState } from "react";
import { createInitialState, update, render, shoot, CANVAS_W, CANVAS_H } from "../game/engine";
import HUD from "./HUD";
import GameOver from "./GameOver";
import styles from "./GameCanvas.module.css";

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [hudData, setHudData] = useState({
    hp: 5, maxHp: 5, score: 0, level: 1,
    speedActive: false, refactorActive: false,
    combo: 0, weaponTier: 0, dashReady: true,
  });
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [finalCombo, setFinalCombo] = useState(0);
  const [started, setStarted] = useState(false);

  const initGame = useCallback(() => {
    stateRef.current = createInitialState();
    setGameOver(false);
    setFinalScore(0);
    setFinalLevel(1);
    setFinalCombo(0);
    setHudData({
      hp: 5, maxHp: 5, score: 0, level: 1,
      speedActive: false, refactorActive: false,
      combo: 0, weaponTier: 0, dashReady: true,
    });
  }, []);

  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;

    update(state);

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) render(ctx, state);

    setHudData({
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      score: state.score,
      level: state.level,
      speedActive: state.player.speedTimer > 0,
      refactorActive: state.player.bigBulletTimer > 0,
      combo: state.combo,
      weaponTier: state.weaponTier,
      dashReady: state.player.dashCooldown <= 0,
      droneCount: state.drones.length,
    });

    if (state.gameOver) {
      setGameOver(true);
      setFinalScore(state.score);
      setFinalLevel(state.level);
      setFinalCombo(state.maxCombo);
      return;
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setStarted(true);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [initGame, gameLoop]);

  const restartGame = useCallback(() => {
    initGame();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [initGame, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!stateRef.current) return;
      stateRef.current.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      if (!stateRef.current) return;
      stateRef.current.keys[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Animated title screen
  useEffect(() => {
    if (started) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let titleRaf;

    // Floating bugs on title
    const titleBugs = Array.from({ length: 8 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: 10 + Math.random() * 15,
    }));

    function drawTitle() {
      frame++;
      const W = CANVAS_W;
      const H = CANVAS_H;

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      // Animated grid
      ctx.strokeStyle = "rgba(0, 255, 100, 0.03)";
      ctx.lineWidth = 1;
      const gridOffset = (frame * 0.3) % 50;
      for (let x = -50 + gridOffset; x < W + 50; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = -50 + gridOffset; y < H + 50; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Code rain on title
      ctx.fillStyle = "rgba(0, 255, 70, 0.04)";
      ctx.font = "11px monospace";
      const snippets = ["const", "let", "=>", "{}", "null", "fix()", "git", "npm", "===", "[]"];
      for (let i = 0; i < 20; i++) {
        const x = ((frame * 0.3 + i * 47) % W);
        const y = ((frame * (0.4 + i * 0.02) + i * 97) % H);
        ctx.fillText(snippets[i % snippets.length], x, y);
      }

      // Floating bugs
      titleBugs.forEach((bug) => {
        bug.x += bug.vx;
        bug.y += bug.vy;
        if (bug.x < 0 || bug.x > W) bug.vx *= -1;
        if (bug.y < 0 || bug.y > H) bug.vy *= -1;

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = "#ff0040";
        ctx.beginPath();
        ctx.ellipse(bug.x, bug.y, bug.size * 0.5, bug.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.strokeStyle = "#ff0040";
        ctx.lineWidth = 1;
        for (let l = -1; l <= 1; l++) {
          const wobble = Math.sin(frame * 0.1 + l) * 2;
          ctx.beginPath();
          ctx.moveTo(bug.x - bug.size * 0.4, bug.y + l * 4);
          ctx.lineTo(bug.x - bug.size * 0.8, bug.y + l * 4 + wobble);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bug.x + bug.size * 0.4, bug.y + l * 4);
          ctx.lineTo(bug.x + bug.size * 0.8, bug.y + l * 4 - wobble);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

      ctx.textAlign = "center";

      // Title with breathing glow
      const glowIntensity = 15 + Math.sin(frame * 0.03) * 8;
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = glowIntensity;
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 34px monospace";
      ctx.fillText("LẬP TRÌNH VIÊN", W / 2, 170);

      ctx.shadowBlur = glowIntensity + 5;
      ctx.font = "bold 48px monospace";
      ctx.fillText("DIỆT BUG", W / 2, 230);
      ctx.shadowBlur = 0;

      // Subtitle
      ctx.fillStyle = "#ff004088";
      ctx.font = "12px monospace";
      ctx.fillText("// A developer's quest to ship bug-free code", W / 2, 260);

      // Animated bug icons
      const bugY = 300;
      for (let i = 0; i < 5; i++) {
        const bx = W / 2 - 100 + i * 50;
        const bounce = Math.sin(frame * 0.05 + i * 0.8) * 5;
        ctx.fillStyle = "#ff0040";
        ctx.shadowColor = "#ff0040";
        ctx.shadowBlur = 8;
        ctx.font = "24px monospace";
        ctx.fillText("🐛", bx, bugY + bounce);
      }
      ctx.shadowBlur = 0;

      // Controls section
      const boxY = 345;
      ctx.fillStyle = "rgba(0, 255, 100, 0.03)";
      ctx.fillRect(W / 2 - 220, boxY - 15, 440, 170);
      ctx.strokeStyle = "rgba(0, 255, 100, 0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 220, boxY - 15, 440, 170);

      ctx.font = "10px monospace";
      ctx.fillStyle = "#4b5563";
      ctx.fillText("// CONTROLS", W / 2, boxY + 5);

      ctx.font = "12px monospace";
      const controlPairs = [
        ["WASD / Arrows", "Di chuyển"],
        ["SPACE", "Bắn đạn {}"],
        ["SHIFT + Dir", "Dash (invincible)"],
      ];
      controlPairs.forEach(([key, desc], i) => {
        const y = boxY + 30 + i * 22;
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 12px monospace";
        ctx.fillText(key, W / 2 - 60, y);
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px monospace";
        ctx.fillText(desc, W / 2 + 80, y);
      });

      ctx.fillStyle = "#4b5563";
      ctx.font = "10px monospace";
      ctx.fillText("☕ Coffee = Speed   { } Refactor = Power   🐳 Docker = Drone", W / 2, boxY + 115);
      ctx.fillText("Combo kills → Score x5!   Boss mỗi 5 level   Auto weapon upgrade!", W / 2, boxY + 135);

      // Enter prompt (pulsing)
      const enterAlpha = 0.5 + Math.sin(frame * 0.06) * 0.4;
      ctx.globalAlpha = enterAlpha;
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 16px monospace";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 15;
      ctx.fillText("[ NHẤN ENTER ĐỂ BẮT ĐẦU ]", W / 2, 555);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Version
      ctx.fillStyle = "#2a2a35";
      ctx.font = "9px monospace";
      ctx.fillText("v2.0 — powered by React + Canvas API", W / 2, H - 8);

      ctx.textAlign = "left";

      // CRT effect on title too
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      titleRaf = requestAnimationFrame(drawTitle);
    }

    drawTitle();
    return () => { if (titleRaf) cancelAnimationFrame(titleRaf); };
  }, [started]);

  useEffect(() => {
    if (started) return;
    const handler = (e) => {
      if (e.key === "Enter") startGame();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, startGame]);

  return (
    <div className={styles.wrapper}>
      <HUD {...hudData} />
      <div className={styles.canvasWrap}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className={styles.canvas} />
        {gameOver && (
          <GameOver
            score={finalScore}
            level={finalLevel}
            maxCombo={finalCombo}
            onRestart={restartGame}
          />
        )}
      </div>
    </div>
  );
}
