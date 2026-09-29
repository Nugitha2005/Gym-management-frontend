import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { clamp } from "./particles/geometry";
import { ParticleCanvas } from "./particles/ParticleCanvas";
import type { Exercise } from "./particles/poses";
import { createTrackScene, type TrackInput } from "./particles/scenes";

/*
 * A small particle athlete who travels along the bottom of the landing page as you scroll:
 * he runs while you scroll (turning round when you scroll back up) and, when you stop, does the exercise
 * of the section you are reading. Sections opt in with data-workout="pushup" (see Exercise).
 * Desktop only, never blocks clicks, and switched off for prefers-reduced-motion.
 */
export function WorkoutTrack() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduce = useReducedMotion();
  if (!desktop || reduce) return null;
  return <Track />;
}

function Track() {
  const input = useRef<TrackInput>({ target: 0, exercise: "pushup", visible: false, lastScroll: 0 });

  useEffect(() => {
    const state = input.current;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-workout]"));
      if (sections.length === 0) return;
      const viewport = window.innerHeight;
      const y = window.scrollY;
      // The run starts as the first workout section comes up and ends at the bottom of the page
      const start = sections[0].getBoundingClientRect().top + y - viewport * 0.8;
      const end = document.documentElement.scrollHeight - viewport;
      state.target = clamp((y - start) / Math.max(1, end - start));
      state.visible = y > start;
      // The section crossing a line just below the middle of the screen sets the exercise
      const line = viewport * 0.55;
      for (const section of sections) {
        const r = section.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) {
          state.exercise = section.dataset.workout as Exercise;
          break;
        }
      }
    };
    const onScroll = () => {
      state.lastScroll = performance.now();
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // In front of the page (so cards never hide him) but it ignores the mouse; the navy halo keeps him
  // readable when he passes over a white card.
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[180px]">
      <ParticleCanvas
        sceneKey="track"
        createScene={() => createTrackScene(input.current)}
        ambient={0}
        interactive={false}
        lineWidth={1}
        halo={{ color: "--color-navy", width: 3 }}
      />
    </div>
  );
}
