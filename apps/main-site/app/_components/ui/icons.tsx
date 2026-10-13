import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: ReactNode) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const LinkIcon = make(
  <>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </>,
);
export const UploadIcon = make(
  <>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
  </>,
);
export const ArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const Check = make(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const Sparkles = make(
  <>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </>,
);
export const Star = ({ size = 16, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden {...p}>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);
export const Plus = make(<path d="M12 5v14M5 12h14" />);
export const Captions = make(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="3" />
    <path d="M7 11.5h4M13 11.5h4M7 15h7" />
  </>,
);
export const Crop = make(
  <>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </>,
);
export const Calendar = make(
  <>
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </>,
);
export const Palette = make(
  <>
    <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3A1.4 1.4 0 0 1 12 21z" />
    <circle cx="7.5" cy="11" r="1" fill="currentColor" />
    <circle cx="10.5" cy="7" r="1" fill="currentColor" />
    <circle cx="15" cy="7.5" r="1" fill="currentColor" />
  </>,
);
export const Film = make(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M7 3v18M17 3v18M3 8h4M3 12h18M3 16h4M17 8h4M17 16h4" />
  </>,
);
export const Gauge = make(
  <>
    <path d="M12 14l4-4" />
    <path d="M3.5 18a10 10 0 1 1 17 0" />
  </>,
);
export const Scissors = make(
  <>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
  </>,
);
export const Code = make(<path d="m8 6-6 6 6 6M16 6l6 6-6 6" />);
export const Mic = make(
  <>
    <rect x="9" y="2.5" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </>,
);
export const Video = make(
  <>
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
  </>,
);
export const Briefcase = make(
  <>
    <rect x="2.5" y="7" width="19" height="13" rx="3" />
    <path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M2.5 12.5h19" />
  </>,
);
export const Megaphone = make(
  <>
    <path d="M3 10.5v3a1 1 0 0 0 1 1h3l8 5V4.5l-8 5H4a1 1 0 0 0-1 1z" />
    <path d="M19 9a4 4 0 0 1 0 6M7 14.5l1.5 5h3l-1.5-4.6" />
  </>,
);
export const Globe = make(
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5c2.5 2.6 3.8 5.8 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-5.8-3.8-9.5S9.5 5.1 12 2.5z" />
  </>,
);
export const Zap = make(<path d="M13 2.5 4 14h7l-1 7.5L19 10h-7z" />);
