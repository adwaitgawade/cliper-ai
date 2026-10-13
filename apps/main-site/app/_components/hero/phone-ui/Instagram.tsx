import type { HeroClip } from "../clips";
import { AppScreen, Avatar, HEART_PATH, Icon, NavItem, pt } from "./shared";
import styles from "./instagram.module.css";

export function InstagramUI({ clip, live }: { clip: HeroClip; live: boolean }) {
  return (
    <AppScreen
      className={live ? styles.live : undefined}
      time="9:41"
      stage={
        <>
          <div className={styles.topBar}>
            <span className={styles.tabs}>
              <span className={styles.tabMuted}>Reels</span>
              <span>Friends</span>
              <span className={styles.friends}>
                <i style={{ background: "linear-gradient(135deg,#f9ce34,#ee2a7b)" }} />
                <i style={{ background: "linear-gradient(135deg,#6228d7,#ee2a7b)" }} />
                <i style={{ background: "linear-gradient(135deg,#4fd1c5,#3b82f6)" }} />
              </span>
            </span>
            <span className={styles.camera}>
              <Icon size={26}>
                <rect x="3" y="6.5" width="18" height="14" rx="4" />
                <circle cx="12" cy="13.5" r="3.6" />
                <path d="M9 6.5 10.4 4h3.2L15 6.5" />
              </Icon>
            </span>
          </div>

          <div className={styles.rail}>
            <span className={styles.action}>
              <span className={styles.heart}>
                <Icon size={28}>
                  <path d={HEART_PATH} />
                </Icon>
                <span className={styles.heartFilled}>
                  <Icon size={28} fill="#ff3040">
                    <path d={HEART_PATH} stroke="#ff3040" />
                  </Icon>
                </span>
              </span>
              {clip.likes}
            </span>
            <span className={styles.action}>
              <Icon size={27}>
                <path d="M20.7 16.4A9 9 0 1 0 17 20.1L21.3 21z" />
              </Icon>
              {clip.comments}
            </span>
            <span className={styles.action}>
              <Icon size={26}>
                <path d="m17 2.5 3 3-3 3M4 11V9.5a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3M20 13v1.5a4 4 0 0 1-4 4H4" />
              </Icon>
              {clip.reposts}
            </span>
            <span className={styles.action}>
              <Icon size={26}>
                <path d="M21.5 3 10.2 13.3M21.5 3 14.6 21.2l-4.4-7.9L2.5 9.6z" />
              </Icon>
              {clip.shares}
            </span>
            <span className={styles.action}>
              <Icon size={24} fill="currentColor">
                <circle cx="5" cy="12" r="1.6" stroke="none" />
                <circle cx="12" cy="12" r="1.6" stroke="none" />
                <circle cx="19" cy="12" r="1.6" stroke="none" />
              </Icon>
            </span>
            <span className={styles.audioThumb} />
          </div>

          <div className={styles.info}>
            <div className={styles.userRow}>
              <Avatar handle={clip.handle} size={32} className={styles.avatarRing} />
              <span className={styles.handle}>{clip.handle}</span>
              <svg viewBox="0 0 24 24" style={{ width: pt(13), height: pt(13), flex: "none" }} aria-hidden>
                <path
                  fill="#3897f0"
                  d="m12 1.5 2.4 1.8 3-.2 1 2.8 2.6 1.6-.6 3 1.3 2.7-2.2 2 .1 3-2.9.8-1.5 2.6-2.9-.8L12 22.5l-2.3-1.7-3 .2-1-2.8-2.6-1.6.6-3L2.4 11l2.2-2-.1-3 2.9-.8L8.9 2.6l2.9.8z"
                />
                <path
                  d="m8 12.2 2.7 2.7L16.2 9.4"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.follow}>Follow</span>
            </div>
            <div className={styles.audio}>
              <Icon size={12}>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </Icon>
              Original audio
            </div>
            <div className={styles.caption}>{clip.caption}</div>
          </div>

          <span className={styles.progress} />
        </>
      }
      nav={
        <nav className={styles.nav}>
          <NavItem
            icon={
              <Icon size={25}>
                <path d="M3.5 10.5 12 3.5l8.5 7V20a.8.8 0 0 1-.8.8H15v-6.3H9v6.3H4.3a.8.8 0 0 1-.8-.8z" />
              </Icon>
            }
          />
          <NavItem
            icon={
              <Icon size={25}>
                <circle cx="11" cy="11" r="7.5" />
                <path d="m20.5 20.5-4.2-4.2" />
              </Icon>
            }
          />
          <NavItem
            icon={
              <Icon size={25}>
                <rect x="3" y="3" width="18" height="18" rx="5.5" />
                <path d="M12 8v8M8 12h8" />
              </Icon>
            }
          />
          <NavItem
            icon={
              <Icon size={25}>
                <rect x="3" y="3" width="18" height="18" rx="5.5" fill="currentColor" />
                <path d="M3 8.5h18M8.6 3.2l2.8 5.2M14.6 3.2l2.8 5.2" stroke="#000" strokeWidth={1.6} />
                <path d="M10.2 11.6v5.6l4.6-2.8z" fill="#000" stroke="none" />
              </Icon>
            }
          />
          <NavItem
            icon={
              <Icon size={25}>
                <circle cx="12" cy="12" r="9.5" />
                <circle cx="12" cy="10" r="3.2" />
                <path d="M6 18.4c1.4-2 3.5-3 6-3s4.6 1 6 3" />
              </Icon>
            }
          />
        </nav>
      }
    />
  );
}
