import React, { useEffect, useRef } from "react";
import { useMotionValue } from "framer-motion";
import { ProductWindow } from "./ReviewScene";
import { useCinematic } from "../motion/useScrollProgress";

const CHAPTERS = [
  { id: "annotate", label: "Annotate", title: "Say exactly what needs to change.", body: "Draw directly on the frame. Point to the problem. Leave context where it matters.", start: 0.20, frame: 0.32 },
  { id: "act", label: "Act", title: "Feedback shouldn't stop at comments.", body: "Turn a comment into a task, assign it to a teammate, and follow it from open to resolved.", start: 0.36, frame: 0.49 },
  { id: "revise", label: "Revise", title: "Every revision. One timeline.", body: "Each new upload lands beside the last one. Compare any two revisions side by side and see what changed.", start: 0.62, frame: 0.68 },
  { id: "ai", label: "Check", title: "Let AI catch what humans shouldn't have to.", body: "A first-pass review of typography, contrast, layout and accessibility — with findings pinned to the frame, inside the same review.", start: 0.77, frame: 0.88 },
  { id: "done", label: "Close", title: "Every task resolved. Every revision on the record.", body: "When the feedback is done, the review is done.", start: 0.92, frame: 0.99 },
];

function ChapterPreview({ frame }: { frame: number }) {
  const progress = useMotionValue(frame);
  return <ProductWindow p={progress} />;
}

export function ReviewStory() {
  const cinematic = useCinematic();
  const chapters = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(CHAPTERS[0].frame);

  useEffect(() => {
    if (!cinematic || !chapters.current) return;
    const blocks = Array.from(chapters.current.children);
    let pending = 0;

    const update = () => {
      pending = 0;
      const midpoint = window.innerHeight / 2;
      let index = blocks.length - 1;
      while (index > 0 && blocks[index].getBoundingClientRect().top > midpoint) index--;
      const bounds = blocks[index].getBoundingClientRect();
      const chapter = CHAPTERS[index];
      // Finish the transition early and hold the example while the visitor reads.
      const fraction = Math.min(1, Math.max(0, (midpoint - bounds.top) / (bounds.height * 0.4)));
      progress.set(chapter.start + fraction * (chapter.frame - chapter.start));
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(pending);
    };
  }, [cinematic, progress]);

  return (
    <section id="story" className="av-review-story" aria-label="How a review works">
      <nav aria-label="Review chapters" className="av-review-links">
        {CHAPTERS.map(c => <a key={c.id} href={`#${c.id}`} className="av-nav-link">{c.label}</a>)}
      </nav>
      <div className="av-review-layout">
        <div ref={chapters}>
          {CHAPTERS.map(c => (
            <article key={c.id} id={c.id} className="av-review-chapter">
              <div>
                <p className="av-eyebrow">{c.label}</p>
                <h2 className="av-h2">{c.title}</h2>
                <p className="av-lede">{c.body}</p>
              </div>
              {!cinematic && <div className="av-review-inline" aria-hidden="true"><ChapterPreview frame={c.frame} /></div>}
            </article>
          ))}
        </div>
        <div className="av-review-stage" aria-hidden="true">
          {cinematic && <ProductWindow p={progress} />}
        </div>
      </div>
    </section>
  );
}

export default ReviewStory;
