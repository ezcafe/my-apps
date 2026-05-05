"use client";

import { useCallback, useEffect, useState } from "react";

/** Parse IO-style rootMargin (subset of CSS margin syntax) into pixel insets. */
function parseRootMarginPixels(rootMargin: string): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const parts = rootMargin.trim().split(/\s+/).filter(Boolean);
  const px = (s: string) => Number.parseFloat(s.replace(/px$/i, "")) || 0;

  if (parts.length === 1) {
    const v = px(parts[0]!);
    return { top: v, right: v, bottom: v, left: v };
  }
  if (parts.length === 2) {
    const vertical = px(parts[0]!);
    const horizontal = px(parts[1]!);
    return {
      top: vertical,
      bottom: vertical,
      left: horizontal,
      right: horizontal,
    };
  }
  if (parts.length === 3) {
    return {
      top: px(parts[0]!),
      right: px(parts[1]!),
      bottom: px(parts[2]!),
      left: px(parts[1]!),
    };
  }
  if (parts.length >= 4) {
    return {
      top: px(parts[0]!),
      right: px(parts[1]!),
      bottom: px(parts[2]!),
      left: px(parts[3]!),
    };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/** Mirrors IntersectionObserver root=null + rootMargin overlap (layout viewport). */
function elementIntersectsInflatedViewport(
  el: HTMLElement,
  rootMargin: string,
): boolean {
  const m = parseRootMarginPixels(rootMargin);
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rootLeft = -m.left;
  const rootTop = -m.top;
  const rootRight = vw + m.right;
  const rootBottom = vh + m.bottom;

  return !(
    r.bottom <= rootTop ||
    r.top >= rootBottom ||
    r.right <= rootLeft ||
    r.left >= rootRight
  );
}

/**
 * Sets `isInView` to true once the element intersects the viewport (with optional root margin).
 * Uses a callback ref so effects re-run when the node mounts after conditional rendering (e.g. data fetch).
 * Geometry is rechecked on resize/scroll because IntersectionObserver updates can be unreliable on resize alone.
 */
export function useInViewOnce(rootMargin = "120px 0px") {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    setTarget(node);
  }, []);

  useEffect(() => {
    const el = target;
    if (!el || isInView) return;

    let finished = false;

    const cleanupListeners = () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onWinScroll, true);
      const vp = window.visualViewport;
      if (vp != null) {
        vp.removeEventListener("resize", onVpResize);
        vp.removeEventListener("scroll", onVpScroll);
      }
    };

    let observer: IntersectionObserver;

    const finish = () => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      cleanupListeners();
      setIsInView(true);
    };

    const checkGeometry = () => {
      if (finished) return;
      if (elementIntersectsInflatedViewport(el, rootMargin)) {
        finish();
      }
    };

    const onResize = () => checkGeometry();
    const onWinScroll = () => checkGeometry();
    const onVpResize = () => checkGeometry();
    const onVpScroll = () => checkGeometry();

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          finish();
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(el);

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onWinScroll, true);
    const visualViewport = window.visualViewport;
    if (visualViewport != null) {
      visualViewport.addEventListener("resize", onVpResize);
      visualViewport.addEventListener("scroll", onVpScroll);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(checkGeometry);
    });

    return () => {
      finished = true;
      observer.disconnect();
      cleanupListeners();
    };
  }, [target, isInView, rootMargin]);

  return { ref, isInView };
}
