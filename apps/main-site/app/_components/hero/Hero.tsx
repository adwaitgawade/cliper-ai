"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HERO_CLIPS } from "./clips";
import { IPhoneFrame } from "./IPhoneFrame";
import styles from "./hero.module.css";

const N = HERO_CLIPS.length;
const TITLE = "Long videos in, viral clips out";

// Intro timeline (ms from mount), reverse-engineered from the reference:
// panel wipe -> nav blur-in -> wheel rises (centre-out) -> typewriter -> label/chip.
const T = { cards: 1500, title: 2000, firstSpin: 4800 };
const CARD_RISE_MS = 950;
const CARD_STAGGER_MS = 90;
const SPIN_MS = 950;
const DWELL_MS = 1900;
const TYPE_MS = 42;

type Geo = {
  W: number;
  H: number;
  phoneW: number;
  phoneH: number;
  phoneTop: number;
  cardW: number;
  cardH: number;
  // Cards ride an ellipse whose top sits behind the phone.
  cx: number;
  y0: number;
  rx: number;
  ry: number;
  step: number; // radians between neighbouring cards
  tilt: number; // card rotation as a fraction of its arc angle
  rise: number; // intro: how far below its slot a card starts
};

const DEG = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mod = (v: number, n: number) => ((v % n) + n) % n;
// Signed slot distance in [-N/2, N/2); the seam lands offscreen for N >= 8.
const wrapSlot = (v: number) => mod(v + N / 2, N) - N / 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

function computeGeo(W: number, H: number): Geo {
  if (W / H >= 0.9) {
    const phoneH = Math.min(H * 0.6, W * 0.42);
    const phoneTop = H * 0.13;
    const cardW = Math.min(150, Math.max(84, W * 0.092));
    return {
      W,
      H,
      phoneW: phoneH * 0.49,
      phoneH,
      phoneTop,
      cardW,
      cardH: (cardW * 16) / 9,
      cx: W / 2,
      y0: phoneTop + phoneH * 0.42,
      rx: W * 0.5,
      ry: H * 0.56,
      step: 26 * DEG,
      tilt: 0.6,
      rise: H * 0.75,
    };
  }
  const phoneH = Math.min(H * 0.48, W * 0.95);
  const phoneTop = H * 0.16;
  const cardW = W * 0.19;
  return {
    W,
    H,
    phoneW: phoneH * 0.49,
    phoneH,
    phoneTop,
    cardW,
    cardH: (cardW * 16) / 9,
    cx: W / 2,
    y0: phoneTop + phoneH * 0.4,
    rx: W * 0.8,
    ry: H * 0.4,
    step: 30 * DEG,
    tilt: 0.55,
    rise: H * 0.75,
  };
}

export function Hero() {
  const panelRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const screenRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const motion = useRef({
    geo: null as Geo | null,
    pos: 0,
    from: 0,
    to: 0,
    spinStart: -Infinity,
    t0: 0,
    reduced: false,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
  });

  const [geo, setGeo] = useState<Geo | null>(null);
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [typed, setTyped] = useState(0);

  const spinTo = useCallback((target: number) => {
    const m = motion.current;
    if (target === m.to) return;
    const now = performance.now();
    // Start from wherever the wheel is right now so interrupted spins stay continuous.
    m.from = m.pos;
    m.to = target;
    m.spinStart = now;
    setPrev(mod(Math.round(m.from), N));
    setActive(mod(target, N));
  }, []);

  const schedule = useCallback(
    (delay: number) => {
      const m = motion.current;
      clearTimeout(m.timer);
      if (m.reduced) return;
      const run = (d: number) => {
        m.timer = setTimeout(() => {
          // Hold position while the tab is hidden instead of queueing spins.
          const visible = !document.hidden;
          if (visible) spinTo(m.to + 1);
          run(visible ? SPIN_MS + DWELL_MS : DWELL_MS);
        }, d);
      };
      run(delay);
    },
    [spinTo],
  );

  // Measure the panel; geometry drives both React layout (phone) and the rAF wheel.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const g = computeGeo(width, height);
      motion.current.geo = g;
      setGeo(g);
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  // Wheel loop: positions are computed along the ellipse every frame, because CSS
  // transitions would interpolate cards along straight chords instead of the arc.
  useEffect(() => {
    const m = motion.current;
    m.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    m.t0 = performance.now() - (m.reduced ? 1e5 : 0);
    let raf = 0;

    const tick = (now: number) => {
      const g = m.geo;
      if (g) {
        const p = m.reduced ? 1 : clamp01((now - m.spinStart) / SPIN_MS);
        m.pos = m.from + (m.to - m.from) * easeInOutCubic(p);
        const since = now - m.t0;

        for (let k = 0; k < N; k++) {
          const el = cardRefs.current[k];
          if (!el) continue;
          const rel = wrapSlot(m.pos - k);
          const delay = T.cards + Math.min(Math.abs(rel), 3) * CARD_STAGGER_MS;
          const e = easeOutQuart(clamp01((since - delay) / CARD_RISE_MS));
          const a = rel * g.step + (1 - e) * Math.sign(rel) * 0.35;
          const x = g.cx + g.rx * Math.sin(a) - g.cardW / 2;
          const y = g.y0 + g.ry * (1 - Math.cos(a)) + (1 - e) * g.rise - g.cardH / 2;
          const fade = clamp01((3.8 - Math.abs(rel)) / 0.5);
          el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${a * g.tilt}rad)`;
          el.style.opacity = String(Math.min(1, e * 2) * fade);
          el.tabIndex = Math.abs(rel) < 2.5 && Math.abs(rel) > 0.5 ? 0 : -1;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    schedule(T.firstSpin);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(m.timer);
    };
  }, [schedule]);

  // Typewriter title.
  useEffect(() => {
    const reduced = motion.current.reduced;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(
      () => {
        if (reduced) return setTyped(TITLE.length);
        interval = setInterval(() => {
          setTyped((n) => {
            if (n + 1 >= TITLE.length) clearInterval(interval);
            return Math.min(TITLE.length, n + 1);
          });
        }, TYPE_MS);
      },
      reduced ? 0 : T.title,
    );
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, []);

  // Only the clip on the phone plays; the outgoing one keeps playing under the wipe.
  useEffect(() => {
    const videos = screenRefs.current;
    videos[active]?.play().catch(() => {});
    const t = setTimeout(() => {
      videos.forEach((v, i) => {
        if (v && i !== active) v.pause();
      });
    }, SPIN_MS);
    return () => clearTimeout(t);
  }, [active]);

  const onCardClick = (k: number) => {
    const m = motion.current;
    const delta = wrapSlot(k - mod(m.to, N));
    if (delta === 0) return;
    spinTo(m.to + delta);
    schedule(SPIN_MS + DWELL_MS * 2);
  };

  const clip = HERO_CLIPS[active];
  const panelVars = geo
    ? ({
        "--card-w": `${geo.cardW}px`,
        "--card-h": `${geo.cardH}px`,
        "--phone-w": `${geo.phoneW}px`,
        "--phone-h": `${geo.phoneH}px`,
        "--phone-top": `${geo.phoneTop}px`,
        "--spin-ms": `${SPIN_MS}ms`,
      } as CSSProperties)
    : undefined;

  return (
    <div className={styles.shell}>
      <section ref={panelRef} className={styles.panel} style={panelVars} aria-label="ClipPro">
        <div className={styles.backdrop} aria-hidden />
        <div className={styles.curtain} aria-hidden />

        <header className={styles.nav}>
          <Link href="/" className={styles.logo}>
            clippro
          </Link>
          <nav className={styles.navPill} aria-label="Main">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#start" className={styles.navCta}>
              Get started
            </a>
          </nav>
          <a href="#login" className={styles.navLogin}>
            Log in
          </a>
        </header>

        <div className={styles.wheel}>
          {HERO_CLIPS.map((c, k) => (
            <button
              key={c.src}
              ref={(el) => {
                cardRefs.current[k] = el;
              }}
              type="button"
              className={styles.card}
              style={{ opacity: 0 }}
              onClick={() => onCardClick(k)}
              aria-label={`Show ${c.label} clip`}
            >
              <video
                className={styles.cardVideo}
                src={`${c.src}#t=1.5`}
                muted
                playsInline
                preload="metadata"
                aria-hidden
              />
              <span className={styles.cardTag}>{c.duration}</span>
            </button>
          ))}
        </div>

        {geo && (
          <div className={styles.phoneWrap}>
            <IPhoneFrame>
              {HERO_CLIPS.map((c, k) => (
                <video
                  key={c.src}
                  ref={(el) => {
                    screenRefs.current[k] = el;
                  }}
                  className={`${styles.screenVideo} ${
                    k === active
                      ? prev === null
                        ? styles.screenCurrent
                        : styles.screenIn
                      : k === prev
                        ? styles.screenOut
                        : ""
                  }`}
                  src={`${c.src}#t=0.1`}
                  muted
                  loop
                  playsInline
                  autoPlay={k === 0}
                  preload={k === active || k === mod(active + 1, N) ? "auto" : "metadata"}
                  aria-hidden
                />
              ))}
            </IPhoneFrame>

            <div className={styles.meta}>
              <div className={styles.labelMask} aria-live="polite">
                {prev !== null && (
                  <span key={`out-${prev}-${active}`} className={styles.labelOut} aria-hidden>
                    {HERO_CLIPS[prev].label}
                  </span>
                )}
                <span key={`in-${active}`} className={prev === null ? styles.labelStatic : styles.labelIn}>
                  {clip.label}
                </span>
              </div>
              <div className={styles.chip}>
                <span key={active} className={styles.chipScore}>
                  {clip.score}
                </span>
                <span className={styles.chipLabel}>viral score</span>
              </div>
            </div>
          </div>
        )}

        <h1 className={styles.title} aria-label={TITLE}>
          <span aria-hidden>
            {TITLE.slice(0, typed)}
            {typed > 0 && typed < TITLE.length && <span className={styles.caret}>_</span>}
            <span className={styles.ghost}>{TITLE.slice(typed)}</span>
          </span>
        </h1>
      </section>
    </div>
  );
}
