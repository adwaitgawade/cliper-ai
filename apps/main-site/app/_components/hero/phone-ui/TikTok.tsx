import type { HeroClip } from "../clips";
import { AppScreen, Avatar, HEART_PATH, Icon, NavItem, SHARE_ARROW_PATH } from "./shared";
import styles from "./tiktok.module.css";

export function TikTokUI({ clip, live }: { clip: HeroClip; live: boolean }) {
  return (
    <AppScreen
      className={live ? styles.live : undefined}
      time="9:41"
      stage={
        <>
          <div className={styles.topBar}>
            <span className={styles.liveIcon}>
              <Icon size={26} strokeWidth={1.7}>
                <rect x="2.5" y="6.5" width="19" height="14" rx="3.5" />
                <path d="m8 2.5 4 4 4-4" />
              </Icon>
              <b>LIVE</b>
            </span>
            <span className={styles.tabs}>
              <span className={styles.tabMuted}>
                Following
                <i className={styles.liveBadge}>LIVE</i>
              </span>
              <span className={styles.tabActive}>For you</span>
            </span>
            <span className={styles.search}>
              <Icon size={26} strokeWidth={2}>
                <circle cx="11" cy="11" r="7.5" />
                <path d="m20.5 20.5-4.2-4.2" />
              </Icon>
            </span>
          </div>

          <div className={styles.rail}>
            <span className={styles.follow}>
              <Avatar handle={clip.handle} size={46} className={styles.avatarRing} />
              <i className={styles.plus}>+</i>
            </span>
            <span className={styles.action}>
              <span className={styles.heart}>
                <Icon size={36} fill="currentColor" strokeWidth={0}>
                  <path d={HEART_PATH} />
                </Icon>
              </span>
              {clip.likes}
            </span>
            <span className={styles.action}>
              <Icon size={34} fill="currentColor" strokeWidth={0}>
                <path d="M12 3.5c5.2 0 9.5 3.6 9.5 8s-4.3 8-9.5 8c-1 0-2-.1-2.9-.4L5 21l.9-3.9c-2.1-1.5-3.4-3.4-3.4-5.6 0-4.4 4.3-8 9.5-8z" />
                <g fill="rgba(0,0,0,0.55)">
                  <circle cx="8" cy="11.5" r="1.2" />
                  <circle cx="12" cy="11.5" r="1.2" />
                  <circle cx="16" cy="11.5" r="1.2" />
                </g>
              </Icon>
              {clip.comments}
            </span>
            <span className={styles.action}>
              <span className={styles.bookmark}>
                <Icon size={32} fill="currentColor" strokeWidth={0}>
                  <path d="M6 2.5h12a1 1 0 0 1 1 1v18l-7-4.6-7 4.6v-18a1 1 0 0 1 1-1z" />
                </Icon>
              </span>
              {clip.reposts}
            </span>
            <span className={styles.action}>
              <Icon size={32} fill="currentColor" strokeWidth={0}>
                <path d={SHARE_ARROW_PATH} />
              </Icon>
              {clip.shares}
            </span>
            <span className={styles.disc}>
              <Avatar handle={clip.handle} size={22} />
            </span>
          </div>

          <div className={styles.info}>
            <span className={styles.handle}>@{clip.handle}</span>
            <span className={styles.caption}>{clip.caption}</span>
            <span className={styles.tags}>{clip.tags}</span>
            <span className={styles.meta}>
              <Icon size={14} strokeWidth={2}>
                <path d="M3 5h9M7.5 3v2M4.5 5c.6 2.6 2.6 5 5.5 6.2M10.5 5C9.8 7.8 7.6 10.2 4 11.8M12.5 21l4.2-9 4.3 9M14 18h5.4" />
              </Icon>
              Show translation
            </span>
            <span className={styles.meta}>
              <Icon size={14} strokeWidth={2}>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </Icon>
              original sound - {clip.handle}
            </span>
          </div>

          <span className={styles.scrubber}>
            <span className={styles.scrubFill} />
          </span>
        </>
      }
      nav={
        <nav className={styles.nav}>
          <NavItem
            label="Home"
            icon={
              <Icon size={25} fill="currentColor" strokeWidth={0}>
                <path d="M2.5 11 12 3l9.5 8h-2.3v9.5h-5.5v-6h-3.4v6H4.8V11z" />
              </Icon>
            }
          />
          <NavItem
            label="Shop"
            dim
            icon={
              <Icon size={25} strokeWidth={1.8}>
                <path d="M4.5 8h15l-1 12.5h-13z" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8M9.5 13.5c1.4 1.3 3.6 1.3 5 0" />
              </Icon>
            }
          />
          <span className={styles.create}>
            <span>+</span>
          </span>
          <NavItem
            label="Inbox"
            dim
            icon={
              <span className={styles.inbox}>
                <Icon size={25} strokeWidth={1.8}>
                  <path d="M4 4.5h16v12H10l-4.5 3.5v-3.5H4z" />
                </Icon>
                <i className={styles.badge}>55</i>
              </span>
            }
          />
          <NavItem
            label="Profile"
            dim
            icon={
              <Icon size={25} strokeWidth={1.8}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2" />
              </Icon>
            }
          />
        </nav>
      }
    />
  );
}
