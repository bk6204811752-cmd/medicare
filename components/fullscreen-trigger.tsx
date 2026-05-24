"use client";

import { useEffect, useState } from "react";
import { Minimize2 } from "lucide-react";

export function FullscreenTrigger() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const isDesktop =
      window.matchMedia("(hover: hover)").matches && window.innerWidth > 1024;

    if (isDesktop) {
      const timer = setTimeout(() => {
        try {
          document.documentElement.requestFullscreen();
        } catch {
          // Browser blocked fullscreen without a user gesture — silently ignore
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", handleChange);
    handleChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  if (!isFullscreen) return null;

  return (
    <div className="group fixed top-0 right-0 z-[9999] h-16 w-40">
      <button
        onClick={() => document.exitFullscreen()}
        className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-med-navy/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-med-navy/80"
      >
        <Minimize2 className="h-3.5 w-3.5" />
        Exit Fullscreen
      </button>
    </div>
  );
}
