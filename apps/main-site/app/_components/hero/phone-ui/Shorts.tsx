import type { HeroClip } from "../clips";
import { AppScreen, Avatar, Icon, NavItem, SHARE_ARROW_PATH } from "./shared";
import styles from "./shorts.module.css";

const THUMB_PATH =
  "M2.5 10h3.8v11H2.5zM8.3 21h9.1a2 2 0 0 0 2-1.6l1.6-7.4a2 2 0 0 0-2-2.5h-5.3l.8-4.1a1.8 1.8 0 0 0-3.2-1.4L8.3 9.6z";

export function ShortsUI({ clip, live }: { clip: HeroClip; live: boolean }) {
  return (
    <AppScreen
      className={live ? styles.live : undefined}
      time="9:41"
      stage={
        <>
          <div className={styles.topBar}>
            <Icon size={26} strokeWidth={2.4}>
              <path d="m15 4-8 8 8 8" />
            </Icon>
            <span className={styles.topRight}>
              <Icon size={24} strokeWidth={2.2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </Icon>
              <Icon size={24} fill="currentColor" strokeWidth={0}>
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </Icon>
            </span>
          </div>
          <span className={styles.chip}>
            <Icon size={14} strokeWidth={1.8}>
              <rect x="3" y="8" width="18" height="13" rx="2" />
              <path d="M6 5h12M8 2h8M10.5 12v5l4-2.5z" />
            </Icon>
            Subscriptions
          </span>

          <div className={styles.rail}>
            <span className={styles.action}>
              <span className={styles.thumb}>
                <Icon size={30} fill="currentColor" strokeWidth={0}>
                  <path d={THUMB_PATH} />
                </Icon>
              </span>
              {clip.likes}
            </span>
            <span className={styles.action}>
              <span className={styles.flip}>
                <Icon size={30} fill="currentColor" strokeWidth={0}>
                  <path d={THUMB_PATH} />
                </Icon>
              </span>
              Dislike
            </span>
            <span className={styles.action}>
              <Icon size={30} fill="currentColor" strokeWidth={0}>
                <path d="M3 3.5h18v14H8.5L3 21.5z" />
                <path d="M7 8.5h10M7 12.5h7" stroke="#000" strokeWidth={1.8} />
              </Icon>
              {clip.comments}
            </span>
            <span className={styles.action}>
              <Icon size={30} fill="currentColor" strokeWidth={0}>
                <path d={SHARE_ARROW_PATH} />
              </Icon>
              Share
            </span>
            <span className={styles.action}>
              <Icon size={30} fill="currentColor" strokeWidth={0}>
                <path d="M4 12a8 8 0 0 1 13.7-5.6L20 4v6h-6l2.3-2.3A5.8 5.8 0 0 0 6.2 12z" />
                <path d="M20 12a8 8 0 0 1-13.7 5.6L4 20v-6h6l-2.3 2.3a5.8 5.8 0 0 0 10.1-4.3z" />
              </Icon>
              Remix
            </span>
            <span className={styles.audioTile}>
              <Icon size={20} strokeWidth={2}>
                <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
              </Icon>
            </span>
          </div>

          <div className={styles.info}>
            <div className={styles.userRow}>
              <Avatar handle={clip.handle} size={32} />
              <span className={styles.handle}>@{clip.handle}</span>
              <span className={styles.subscribe}>Subscribe</span>
            </div>
            <span className={styles.caption}>
              {clip.caption} {clip.tags}
            </span>
            <span className={styles.audio}>
              <Icon size={12} strokeWidth={2}>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </Icon>
              Original sound · {clip.handle}
            </span>
          </div>

          <span className={styles.progress}>
            <span className={styles.progressFill} />
          </span>
        </>
      }
      nav={
        <nav className={styles.nav}>
          <NavItem
            label="Home"
            icon={
              <Icon size={24} fill="currentColor" strokeWidth={0}>
                <path d="M3 10.5 12 3l9 7.5V21h-6.2v-6.5H9.2V21H3z" />
              </Icon>
            }
          />
          <NavItem
            label="Shorts"
            icon={
              <Icon size={24} fill="currentColor" strokeWidth={0}>
                <path d="m17.6 9.4-2.3 1.2 2.1 1.1a3.6 3.6 0 0 1 0 6.3l-6.9 3.7a3.6 3.6 0 0 1-3.4-6.3l2.3-1.2-2.1-1.1a3.6 3.6 0 0 1 0-6.3l6.9-3.7a3.6 3.6 0 0 1 3.4 6.3z" />
                <path d="M10.2 9.6v4.8l4-2.4z" fill="#0f0f0f" />
              </Icon>
            }
          />
          <span className={styles.create}>
            <Icon size={38} strokeWidth={1.1}>
              <circle cx="12" cy="12" r="10.5" />
              <path d="M12 7v10M7 12h10" />
            </Icon>
          </span>
          <NavItem
            label="Subscriptions"
            icon={
              <span className={styles.subsIcon}>
                <Icon size={24} strokeWidth={1.7}>
                  <rect x="3" y="8" width="18" height="13" rx="2" />
                  <path d="M6 5h12M8 2h8M10.5 12v5l4-2.5z" />
                </Icon>
                <i className={styles.dot} />
              </span>
            }
          />
          <NavItem
            label="Library"
            icon={
              <Icon size={24} strokeWidth={1.7}>
                <rect x="6" y="3" width="15" height="15" rx="1.5" />
                <path d="M3 6v15h15M11 7.5v6l4.5-3z" />
              </Icon>
            }
          />
        </nav>
      }
    />
  );
}
