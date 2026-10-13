import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** The shared social card: brand stage background, wordmark, headline and trust chips. */
export function ogImage({ eyebrow, title, subtitle, chips = [] }: { eyebrow: string; title: string; subtitle: string; chips?: string[] }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#f3eee4",
          backgroundColor: "#1a1533",
          backgroundImage: "radial-gradient(80% 90% at 50% 0%, #3b2f70 0%, #1a1533 60%, #0d0a1a 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5 }}>clippro</div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              color: "#d9cff7",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            {eyebrow}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 24 ? 72 : 84, fontWeight: 700, lineHeight: 1.04, letterSpacing: -2.5, maxWidth: 1056 }}>
            {title}
          </div>
          <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.35, color: "rgba(243,238,228,0.72)", maxWidth: 960 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {chips.map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
