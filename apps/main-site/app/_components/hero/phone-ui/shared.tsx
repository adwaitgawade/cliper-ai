import type { ReactNode } from "react";
import styles from "./shared.module.css";

// App chrome drawn over the phone screen. `--pt` is one point of a 393pt-wide
// iPhone (set on the phone wrapper), so measurements match the real apps.
export const pt = (n: number) => `calc(${n} * var(--pt))`;

export function Icon({
  children,
  size = 26,
  fill = "none",
  strokeWidth = 1.9,
}: {
  children: ReactNode;
  size?: number;
  fill?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: pt(size), height: pt(size) }}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const HEART_PATH =
  "M12 20.5s-7.6-4.6-9.5-9.1C1.1 8 3.2 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 3 1.5-1.9 3-3 5.1-3 3.7 0 5.8 3.5 4.4 6.9-1.9 4.5-9.5 9.1-9.5 9.1z";
export const SHARE_ARROW_PATH = "M13.5 4.5 21.5 12l-8 7.5v-4.3c-5 0-8.3 1.6-11 5.3 1-5.3 4-10.4 11-11.3z";

/** Root of one app's UI: status bar + a stage (video area, above the nav) + the nav. */
export function AppScreen({
  className,
  time,
  stage,
  nav,
}: {
  className?: string;
  time: string;
  stage: ReactNode;
  nav: ReactNode;
}) {
  return (
    <div className={`${styles.ui} ${className ?? ""}`} aria-hidden>
      <div className={styles.stage}>
        <div className={styles.scrimTop} />
        <div className={styles.scrimBottom} />
        {stage}
      </div>
      <StatusBar time={time} />
      {nav}
      <span className={styles.homeIndicator} />
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div className={styles.statusBar}>
      <span className={styles.time}>{time}</span>
      <span className={styles.statusIcons}>
        <svg viewBox="0 0 18 12" style={{ width: pt(18), height: pt(12) }} fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" style={{ width: pt(16), height: pt(12) }} fill="currentColor">
          <path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .8 10.4 10.4 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4z" />
          <path d="M8 6.1c1.3 0 2.5.5 3.5 1.3l1.2-1.3A7 7 0 0 0 8 4.3a7 7 0 0 0-4.7 1.8l1.2 1.3c1-.8 2.2-1.3 3.5-1.3z" />
          <path d="M8 9.4c.5 0 1 .2 1.3.5L8 11.4 6.7 9.9c.3-.3.8-.5 1.3-.5z" />
        </svg>
        <svg viewBox="0 0 27 13" style={{ width: pt(27), height: pt(13) }}>
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2.2" y="2.2" width="19.6" height="8.6" rx="2.4" fill="currentColor" />
          <path d="M25 4.4v4.2c.9-.3 1.5-1.2 1.5-2.1s-.6-1.8-1.5-2.1z" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

/** Bottom nav item: icon with an optional label underneath. */
export function NavItem({ icon, label, dim }: { icon: ReactNode; label?: string; dim?: boolean }) {
  return (
    <span className={`${styles.navItem} ${dim ? styles.dim : ""}`}>
      {icon}
      {label && <span>{label}</span>}
    </span>
  );
}

export function Avatar({ handle, size, className }: { handle: string; size: number; className?: string }) {
  return (
    <span
      className={`${styles.avatar} ${className ?? ""}`}
      style={{ width: pt(size), height: pt(size), fontSize: pt(size * 0.44) }}
    >
      {handle[0].toUpperCase()}
    </span>
  );
}
