"use client";

import { useCallback, useEffect, useState } from "react";

const observersByMargin = new Map<string, IntersectionObserver>();
const callbacksByElement = new Map<Element, Set<() => void>>();

type ScrollPending = {
  element: Element;
  rootMargin: string;
  onVisible: () => void;
};

/** Manual visibility checks for when Safari skips IntersectionObserver on scroll. */
const scrollPending = new Set<ScrollPending>();
let scrollFallbackAttached = false;
let scrollFallbackRaf = 0;

/** Safari historically accepts rootMargin more reliably as 4 explicit values. */
export function normalizeRootMargin(rootMargin: string): string {
  const margin = parseRootMarginPx(rootMargin);
  return `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`;
}

function getSharedObserver(rootMargin: string): IntersectionObserver | null {
  const normalized = normalizeRootMargin(rootMargin);
  let observer = observersByMargin.get(normalized);
  if (observer) return observer;
  if (typeof IntersectionObserver === "undefined") return null;
  try {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const callbacks = callbacksByElement.get(entry.target);
          if (!callbacks) continue;
          for (const cb of callbacks) cb();
        }
      },
      { root: null, rootMargin: normalized, threshold: 0 },
    );
    observersByMargin.set(normalized, observer);
    return observer;
  } catch {
    return null;
  }
}

function subscribe(element: Element, rootMargin: string, onVisible: () => void) {
  const observer = getSharedObserver(rootMargin);
  if (!observer) {
    onVisible();
    return;
  }
  let callbacks = callbacksByElement.get(element);
  if (!callbacks) {
    callbacks = new Set();
    callbacksByElement.set(element, callbacks);
    observer.observe(element);
  }
  callbacks.add(onVisible);
}

function unsubscribe(element: Element, rootMargin: string, onVisible: () => void) {
  const normalized = normalizeRootMargin(rootMargin);
  const callbacks = callbacksByElement.get(element);
  if (!callbacks) return;
  callbacks.delete(onVisible);
  if (callbacks.size > 0) return;
  callbacksByElement.delete(element);
  observersByMargin.get(normalized)?.unobserve(element);
}

function runScrollPendingChecks() {
  scrollFallbackRaf = 0;
  if (scrollPending.size === 0) return;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  for (const pending of [...scrollPending]) {
    try {
      if (
        rectIntersectsViewport(
          pending.element.getBoundingClientRect(),
          pending.rootMargin,
          viewport,
        )
      ) {
        pending.onVisible();
      }
    } catch {
      pending.onVisible();
    }
  }
}

function scheduleScrollPendingChecks() {
  if (scrollFallbackRaf) return;
  scrollFallbackRaf = requestAnimationFrame(runScrollPendingChecks);
}

function attachScrollFallback() {
  if (scrollFallbackAttached || typeof window === "undefined") return;
  scrollFallbackAttached = true;
  // capture:true so nested overflow scrollers (shell <main> on lg) still notify.
  window.addEventListener("scroll", scheduleScrollPendingChecks, {
    passive: true,
    capture: true,
  });
  window.addEventListener("resize", scheduleScrollPendingChecks, {
    passive: true,
  });
  window.visualViewport?.addEventListener("resize", scheduleScrollPendingChecks);
  window.visualViewport?.addEventListener("scroll", scheduleScrollPendingChecks);
}

function detachScrollFallbackIfIdle() {
  if (scrollPending.size > 0 || !scrollFallbackAttached) return;
  scrollFallbackAttached = false;
  if (scrollFallbackRaf) {
    cancelAnimationFrame(scrollFallbackRaf);
    scrollFallbackRaf = 0;
  }
  window.removeEventListener("scroll", scheduleScrollPendingChecks, true);
  window.removeEventListener("resize", scheduleScrollPendingChecks);
  window.visualViewport?.removeEventListener(
    "resize",
    scheduleScrollPendingChecks,
  );
  window.visualViewport?.removeEventListener(
    "scroll",
    scheduleScrollPendingChecks,
  );
}

/**
 * Keep a getBoundingClientRect poll tied to scroll/resize until the element
 * intersects. Safari/iOS IntersectionObserver often never fires for nodes
 * that mount below the fold and only enter view on user scroll.
 */
function subscribeScrollFallback(
  element: Element,
  rootMargin: string,
  onVisible: () => void,
): () => void {
  const pending: ScrollPending = { element, rootMargin, onVisible };
  scrollPending.add(pending);
  attachScrollFallback();
  return () => {
    scrollPending.delete(pending);
    detachScrollFallbackIfIdle();
  };
}

/** Parse IO rootMargin shorthand into expanded top/right/bottom/left px. */
export function parseRootMarginPx(rootMargin: string): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const parts = rootMargin.trim().split(/\s+/).filter(Boolean);
  const toPx = (token: string | undefined) => {
    if (!token) return 0;
    const match = /^(-?\d+(?:\.\d+)?)px$/.exec(token);
    return match ? Number(match[1]) : 0;
  };
  if (parts.length === 1) {
    const v = toPx(parts[0]);
    return { top: v, right: v, bottom: v, left: v };
  }
  if (parts.length === 2) {
    const y = toPx(parts[0]);
    const x = toPx(parts[1]);
    return { top: y, right: x, bottom: y, left: x };
  }
  if (parts.length === 3) {
    return {
      top: toPx(parts[0]),
      right: toPx(parts[1]),
      bottom: toPx(parts[2]),
      left: toPx(parts[1]),
    };
  }
  return {
    top: toPx(parts[0]),
    right: toPx(parts[1]),
    bottom: toPx(parts[2]),
    left: toPx(parts[3]),
  };
}

/** Whether `rect` intersects the viewport expanded by rootMargin. */
export function rectIntersectsViewport(
  rect: Pick<DOMRectReadOnly, "top" | "right" | "bottom" | "left">,
  rootMargin: string,
  viewport: { width: number; height: number } = {
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  },
): boolean {
  const margin = parseRootMarginPx(rootMargin);
  const top = -margin.top;
  const left = -margin.left;
  const bottom = viewport.height + margin.bottom;
  const right = viewport.width + margin.right;
  return (
    rect.bottom >= top &&
    rect.top <= bottom &&
    rect.right >= left &&
    rect.left <= right
  );
}

/**
 * Sets `isInView` to true once the element intersects the viewport (with optional root margin).
 * Uses a shared module-level IntersectionObserver per rootMargin value.
 *
 * Also runs layout/rAF checks and a shared scroll/resize fallback because Safari/iOS
 * can delay or skip IntersectionObserver delivery for nodes that mount below the fold
 * and only enter view while scrolling (common after expanding “More insights”).
 * If IntersectionObserver is missing or throws, fails open (`isInView = true`).
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

    const onVisible = () => setIsInView(true);
    subscribe(el, rootMargin, onVisible);
    const unsubscribeScroll = subscribeScrollFallback(el, rootMargin, onVisible);

    const checkNow = () => {
      try {
        if (rectIntersectsViewport(el.getBoundingClientRect(), rootMargin)) {
          setIsInView(true);
        }
      } catch {
        setIsInView(true);
      }
    };
    checkNow();
    const raf = requestAnimationFrame(checkNow);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribeScroll();
      unsubscribe(el, rootMargin, onVisible);
    };
  }, [target, isInView, rootMargin]);

  return { ref, isInView };
}
