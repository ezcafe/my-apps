import type { SVGProps } from "react";

export function IconFoods(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 11h16v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v4M14 11V8a1.5 1.5 0 0 1 3 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
