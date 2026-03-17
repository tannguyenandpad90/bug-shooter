import styles from "./HUD.module.css";

export default function HUD({ hp, maxHp, score, level, speedActive, refactorActive, combo, weaponTier, dashReady, droneCount = 0 }) {
  const hpPercent = (hp / maxHp) * 100;
  const hpColor = hpPercent > 60 ? "#00ff88" : hpPercent > 30 ? "#f59e0b" : "#ff0040";
  const tierLabels = ["▪ SINGLE", "▪▪ DOUBLE", "▪▪▪ TRIPLE"];
  const isLowHp = hpPercent <= 30;

  return (
    <div className={`${styles.hud} ${isLowHp ? styles.hudDanger : ""}`}>
      <div className={styles.left}>
        <div className={styles.hpSection}>
          <div className={styles.hpLabel} style={{ color: hpColor }}>HP</div>
          <div className={styles.hpBarOuter}>
            <div
              className={`${styles.hpBarInner} ${isLowHp ? styles.hpBarDanger : ""}`}
              style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
            />
            <div className={styles.hpBarShine} />
          </div>
          <span className={styles.hpText} style={{ color: hpColor }}>{hp}/{maxHp}</span>
        </div>
        <div className={styles.tierBadge}>
          <span className={styles.tierText}>{tierLabels[weaponTier]}</span>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.scoreWrap}>
          <span className={styles.scorePrefix}>$&gt;</span>
          <span className={styles.score}>{score.toLocaleString()}</span>
        </div>
        <div className={styles.level}>
          <span className={styles.levelLabel}>LVL</span>
          <span className={styles.levelNum}>{level}</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.buffs}>
          {combo >= 3 && (
            <div className={`${styles.buff} ${combo >= 10 ? styles.buffHot : styles.buffCombo}`}>
              {combo}x COMBO
            </div>
          )}
          {speedActive && (
            <div className={`${styles.buff} ${styles.buffCoffee}`}>
              ☕ SPEED
            </div>
          )}
          {refactorActive && (
            <div className={`${styles.buff} ${styles.buffRefactor}`}>
              ◆ POWER
            </div>
          )}
          {droneCount > 0 && (
            <div className={`${styles.buff} ${styles.buffDocker}`}>
              🐳 x{droneCount}
            </div>
          )}
        </div>
        {dashReady ? (
          <div className={styles.dashReady}>⇧ DASH</div>
        ) : (
          <div className={styles.dashCooldown}>⇧ ···</div>
        )}
      </div>
    </div>
  );
}
