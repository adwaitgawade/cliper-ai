import type { ReactNode } from "react";
import styles from "./hero.module.css";

// Pure-CSS iPhone (titanium rim, black bezel, Dynamic Island, side buttons).
// All internal sizes are in `em`, so set `font-size` on the root to scale it.
export function IPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phone}>
      <span className={`${styles.phoneBtn} ${styles.btnAction}`} />
      <span className={`${styles.phoneBtn} ${styles.btnVolUp}`} />
      <span className={`${styles.phoneBtn} ${styles.btnVolDown}`} />
      <span className={`${styles.phoneBtn} ${styles.btnPower}`} />
      <div className={styles.phoneBezel}>
        <div className={styles.phoneScreen}>
          {children}
          <span className={styles.island} />
          <span className={styles.screenGlare} />
        </div>
      </div>
    </div>
  );
}
