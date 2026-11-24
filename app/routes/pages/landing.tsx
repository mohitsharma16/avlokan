export const handle = { public: true };

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Route } from "./+types/landing";
import { LandingNav } from "../components/landing/LandingNav";
import { HeroSection } from "../components/landing/HeroSection";
import { ProblemStory } from "../components/landing/ProblemStory";
import { ReviewStory } from "../components/landing/ReviewStory";
import { SharingScene } from "../components/landing/SharingScene";
import { WorkflowTransformation } from "../components/landing/WorkflowTransformation";
import { AudienceSection } from "../components/landing/AudienceSection";
import { FinalCTA } from "../components/landing/FinalCTA";
import { Footer } from "../components/landing/Footer";

export const meta: Route.MetaFunction = () => [
  { title: "Avlokan — Creative review, finally in focus" },
  {
    name: "description",
    content:
      "Avlokan is a creative review platform. Annotate the exact frame, discuss it in context, assign the fix, compare revisions and catch first-pass issues with AI — in one visual workflow.",
  },
  { property: "og:title", content: "Avlokan — Creative review, finally in focus" },
  {
    property: "og:description",
    content: "Frame-accurate annotation, timestamped feedback, revision comparison, AI-assisted review and expiring share links.",
  },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];

/** The landing page is a single continuous story: problem → product → workflow → outcome.
 *  It is always dark (`av-dark`), independent of the app theme the user has stored. */
export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Signed-in users go straight to their workspace; replace so Back does not bounce here.
  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  return (
    <div className="av-dark" style={{ position: "relative", background: "var(--color-bg)", color: "var(--color-text-primary)", overflowX: "clip" }}>
      <a href="#story" className="av-btn av-btn-primary av-btn-sm" style={{ position: "absolute", left: 12, top: -60, zIndex: 999 }} onFocus={(e) => (e.currentTarget.style.top = "12px")} onBlur={(e) => (e.currentTarget.style.top = "-60px")}>Skip to content</a>
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemStory />
        <ReviewStory />
        <SharingScene />
        <WorkflowTransformation />
        <AudienceSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
