"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Turns a row of NavLinks that would otherwise wrap onto several lines (see
// AccountSection) into a single horizontally-scrollable strip -- the fix for
// the account/admin tabs eating a third of the screen on mobile and tablet.
// Native touch/trackpad swipe already scrolls it; this adds the extras a
// plain overflow-x-auto div doesn't give you for free: edge fades that only
// show up when there's actually more to scroll to, click-to-scroll arrows
// for a mouse, a vertical-wheel-to-horizontal-scroll shortcut for desktop
// trackpads/mice, and auto-revealing whichever tab is already active so
// deep-linking straight into e.g. a later admin section doesn't leave the
// selected tab hidden off-screen.
export function ScrollableTabs({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateEdges() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    updateEdges();
    el.querySelector<HTMLElement>("[data-active]")?.scrollIntoView({ inline: "center", block: "nearest" });

    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(el);
    el.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateEdges);
    };
  }, []);

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  function scrollByAmount(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-background to-transparent" />
          <button
            type="button"
            onClick={() => scrollByAmount(-160)}
            aria-label="Scroll tabs left"
            className="absolute inset-y-0 left-0 z-20 flex items-center pr-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ChevronLeft size={16} />
          </button>
        </>
      )}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="scrollbar-none flex items-center gap-4 overflow-x-auto scroll-smooth"
      >
        {children}
      </div>
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-background to-transparent" />
          <button
            type="button"
            onClick={() => scrollByAmount(160)}
            aria-label="Scroll tabs right"
            className="absolute inset-y-0 right-0 z-20 flex items-center pl-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}
