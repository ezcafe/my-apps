import type { SVGProps } from "react";

/** Dedicated Baby hamburger glyphs — stroke uses currentColor. */
export function IconBabyHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 11.5 12 4l8 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.5V20h10v-9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBabyInsights(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M5 19V10M12 19V5M19 19v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Activities ledger — list rows (distinct from Insights chart bars). */
export function IconBabyActivities(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M8 7h11M8 12h11M8 17h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 7h.01M5 12h.01M5 17h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBabyFeed(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M8 4h5a3 3 0 0 1 3 3v2H8V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 9v8a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBabySleep(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M14 5a7 7 0 1 0 5.5 11.4A6 6 0 0 1 14 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBabyDiaper(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M5 7h14v4c0 4-3 7-7 7s-7-3-7-7V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 10h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Breast glyph — same stroke style as the other Baby nav icons. */
export function IconBabyBreast(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 4c-3.5 0-6 2.8-6 6.2 0 3.4 2.2 6.3 5.2 8.3a1.5 1.5 0 0 0 1.6 0c3-2 5.2-4.9 5.2-8.3C18 6.8 15.5 4 12 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.5a1.5 1.5 0 1 0 0.01 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBabyMeasure(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M5 19 19 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 19h-3v-3M19 8V5h-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBabyVaccine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="m9 3 2 2-7 7 2 2 7-7 2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14 8 2 2M5 16l-2 2M7 18l-2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBabySettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1L15 3h-6l-.5 2.9a7.6 7.6 0 0 0-1.7 1L4.5 6.4l-2 3.4 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1L9 21h6l.5-2.9a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Bottle / formula amount glyph. */
export function IconBabyBottle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 3h6v3H9V3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 6h4l1 3v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V9l1-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Pump / breast-pump outline. */
export function IconBabyPump(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4v2H8V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 10h6v7a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 4V2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Drop / amount glyph for Pump amount. */
export function IconBabyDrop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3c3.5 4.5 6 7.8 6 11a6 6 0 1 1-12 0c0-3.2 2.5-6.5 6-11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Droplet / ml glyph for bottle Custom (icon-only). */
export function IconBabyDroplet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3.5c0 0-6 7.2-6 11.2a6 6 0 0 0 12 0C18 10.7 12 3.5 12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wet diaper tile — droplet. */
export function IconBabyDiaperWet(props: SVGProps<SVGSVGElement>) {
  return <IconBabyDroplet {...props} />;
}

/** Poop-only diaper tile — soft blob. */
export function IconBabyDiaperPoop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 6c-1.2 0-2.2.7-2.6 1.7-.8-.3-1.7 0-2.1.8-.9.1-1.6.9-1.6 1.9 0 2.2 2.8 4.6 6.3 4.6s6.3-2.4 6.3-4.6c0-1-.7-1.8-1.6-1.9-.4-.8-1.3-1.1-2.1-.8C14.2 6.7 13.2 6 12 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mixed diaper tile — droplet + small blob. */
export function IconBabyDiaperMixed(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M8 4.5c0 0-3.5 4.2-3.5 6.5a3.5 3.5 0 0 0 7 0C11.5 8.7 8 4.5 8 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15 11c-.8 0-1.5.5-1.8 1.2-.6-.2-1.2 0-1.5.6-.6.1-1.1.7-1.1 1.4 0 1.6 2 3.3 4.4 3.3s4.4-1.7 4.4-3.3c0-.7-.5-1.3-1.1-1.4-.3-.6-.9-.8-1.5-.6C16.5 11.5 15.8 11 15 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dry diaper tile — empty diaper outline. */
export function IconBabyDiaperDry(props: SVGProps<SVGSVGElement>) {
  return <IconBabyDiaper {...props} />;
}
