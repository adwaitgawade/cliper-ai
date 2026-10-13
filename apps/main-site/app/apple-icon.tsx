import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon; also the Organization logo in structured data.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1533",
          backgroundImage: "radial-gradient(90% 90% at 50% 0%, #3b2f70 0%, #1a1533 70%)",
          color: "#f3eee4",
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: -6,
          paddingBottom: 14,
        }}
      >
        c
      </div>
    ),
    size,
  );
}
