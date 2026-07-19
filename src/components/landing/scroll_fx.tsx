"use client";

import { useEffect } from "react";

/**
 * Scroll-triggered reveal for the landing page. Watches every element with
 * a [data-reveal] attribute and adds .in-view the first time it enters the
 * viewport; CSS in the landing page handles the actual transition.
 * Renders nothing.
 */
export default function ScrollFx() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (els.length === 0) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      els.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      // Trigger slightly before the element is fully visible so the motion
      // reads as "greeting" the scroll instead of lagging behind it.
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
