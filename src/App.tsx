import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "./components/Header";
import SearchOverlay from "./components/SearchOverlay";
import { contentErrors } from "./lib/content";
import { useRoute } from "./lib/router";
import About from "./pages/About";
import CoursePage from "./pages/CoursePage";
import Home from "./pages/Home";
import ProgressPage from "./pages/Progress";

export default function App() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Sneltoets "/" opent de zoekfunctie (behalve tijdens het typen).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [, section, courseId, mode, chapterId] = route.path.split("/");

  return (
    <div className="mx-auto min-h-dvh max-w-page px-5 pb-24 sm:px-10">
      {section === "course" && courseId ? (
        <CoursePage key={courseId} courseId={courseId} mode={mode} chapterId={chapterId} params={route.params} onSearch={openSearch} />
      ) : (
        <>
          <SiteHeader active={section === "about" ? "about" : section === "progress" ? "progress" : "courses"} onSearch={openSearch} />
          {section === "about" ? <About /> : section === "progress" ? <ProgressPage /> : <Home />}
        </>
      )}
      {contentErrors.length > 0 && (
        <p className="mt-10 border border-ink p-4 text-xs">Sommige inhoudsbestanden konden niet gelezen worden. Details in de console.</p>
      )}
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
