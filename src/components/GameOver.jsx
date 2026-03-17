import { useState, useEffect } from "react";
import { saveScore, getLeaderboard } from "../api/saveScore";
import styles from "./GameOver.module.css";

export default function GameOver({ score, level, maxCombo, onRestart }) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await saveScore(name.trim(), score);
    setLeaderboard(getLeaderboard());
    setSaved(true);
    setSaving(false);
  };

  const getRank = () => {
    if (score >= 5000) return { title: "SENIOR DEVELOPER", color: "#a855f7" };
    if (score >= 2000) return { title: "MID-LEVEL DEV", color: "#f59e0b" };
    if (score >= 500) return { title: "JUNIOR DEV", color: "#00ff88" };
    return { title: "INTERN", color: "#6b7280" };
  };

  const rank = getRank();

  return (
    <div className={`${styles.overlay} ${visible ? styles.overlayVisible : ""}`}>
      <div className={`${styles.modal} ${visible ? styles.modalVisible : ""}`}>
        <div className={styles.glitch} data-text="GAME OVER">GAME OVER</div>

        <div className={styles.rankBadge} style={{ borderColor: `${rank.color}44`, color: rank.color }}>
          {rank.title}
        </div>

        <div className={styles.stats}>
          <div className={styles.statMain}>
            <span className={styles.scoreLabel}>// FINAL SCORE</span>
            <span className={styles.scoreValue}>{score.toLocaleString()}</span>
          </div>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Level</span>
              <span className={styles.statNum}>{level}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statLabel}>Max Combo</span>
              <span className={styles.statNum}>{maxCombo}x</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statLabel}>Bugs Fixed</span>
              <span className={styles.statNum}>{Math.floor(score / 10)}</span>
            </div>
          </div>
        </div>

        {!saved ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              <span className={styles.prompt}>$</span> git commit -m "
              <span className={styles.labelHighlight}>your_name</span>
              "
            </label>
            <div className={styles.inputWrap}>
              <span className={styles.inputPrefix}>&gt;</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                className={styles.input}
                placeholder="developer_name"
              />
            </div>
            <button type="submit" disabled={saving || !name.trim()} className={styles.btn}>
              {saving ? (
                <span className={styles.saving}>Pushing to remote<span className={styles.dots}>...</span></span>
              ) : (
                "[ git push origin score ]"
              )}
            </button>
          </form>
        ) : (
          <div className={styles.leaderboard}>
            <h3 className={styles.lbTitle}>
              <span className={styles.lbIcon}>★</span> LEADERBOARD
            </h3>
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`${styles.lbRow} ${entry.name === name && entry.score === score ? styles.lbRowHighlight : ""}`}
              >
                <span className={`${styles.lbRank} ${i < 3 ? styles[`lbRank${i}`] : ""}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className={styles.lbName}>{entry.name}</span>
                <span className={styles.lbScore}>{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onRestart} className={styles.restartBtn}>
          <span className={styles.restartIcon}>↻</span> git reset --hard && npm start
        </button>
      </div>
    </div>
  );
}
