"use client";

import { useCallback, useEffect, useState } from "react";

const observersByMargin = new Map<string, IntersectionObserver>();
const callbacksByElement = new Map<Element, Set<() => void>>();

function getSharedObserver(rootMargin: string): IntersectionObserver {
  let observer = observersByMargin.get(rootMargin);
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const callbacks = callbacksByElement.get(entry.target);
          if (!callbacks) continue;
          for (const cb of callbacks) cb();
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );
    observersByMargin.set(rootMargin, observer);
  }
  return observer;
}

function subscribe(element: Element, rootMargin: string, onVisible: () => void) {
  let callbacks = callbacksByElement.get(element);
  if (!callbacks) {
    callbacks = new Set();
    callbacksByElement.set(element, callbacks);
    getSharedObserver(rootMargin).observe(element);
  }
  callbacks.add(onVisible);
}

function unsubscribe(element: Element, rootMargin: string, onVisible: () => void) {
  const callbacks = callbacksByElement.get(element);
  if (!callbacks) return;
  callbacks.delete(onVisible);
  if (callbacks.size > 0) return;
  callbacksByElement.delete(element);
  getSharedObserver(rootMargin).unobserve(element);
}

/**
 * Sets `isInView` to true once the element intersects the viewport (with optional root margin).
 * Uses a shared module-level IntersectionObserver per rootMargin value.
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

    return () => {
      unsubscribe(el, rootMargin, onVisible);
    };
  }, [target, isInView, rootMargin]);

  return { ref, isInView };
}
