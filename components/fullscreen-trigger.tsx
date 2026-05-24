"use client";

import { useEffect, useState } from "react";
import { Minimize2, Maximize2 } from "lucide-react";

export function FullscreenTrigger() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showManualTrigger, setShowManualTrigger] = useState(false);

  useEffect(() => {
    const isDesktop =
      window.matchMedia("(hover: hover)").matches && window.innerWidth > 1024;

    if (!isDesktop) return;

    // Check if we've already triggered it this session
    const triggered = sessionStorage.getItem("autoFullscreenTriggered");
    if (triggered === "true") return;

    // Try immediately
    const tryFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          sessionStorage.setItem("autoFullscreenTriggered", "true");
        }
      } catch {
        // Blocked by browser - will retry on user gesture
        setShowManualTrigger(true);
      }
    };

    // Attempt immediately
    tryFullscreen();

    // Also trigger on the first click anywhere on the page
    const handleGesture = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          sessionStorage.setItem("autoFullscreenTriggered", "true");
          setShowManualTrigger(false);
        }
        document.removeEventListener("click", handleGesture);
        document.removeEventListener("keydown", handleGesture);
      } catch {
        // Keep listening if it failed
      }
    };

    document.addEventListener("click", handleGesture);
    document.addEventListener("keydown", handleGesture);

    return () => {
      document.removeEventListener("click", handleGesture);
      document.removeEventListener("keydown", handleGesture);
    };
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

  const handleManualEnter = async () => {
    try {
      await document.documentElement.requestFullscreen();
      sessionStorage.setItem("autoFullscreenTriggered", "true");
      setShowManualTrigger(false);
    } catch {
      // Ignored
    }
  };

  // If in fullscreen, show Exit button on hover
  if (isFullscreen) {
    return (
      <div className="group fixed top-0 right-0 z-[9999] h-16 w-40 no-print">
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

  // If browser blocked it and we haven't gone fullscreen yet, show a clean floating button to trigger it manually
  if (showManualTrigger) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] no-print">
        <button
          onClick={handleManualEnter}
          className="flex items-center gap-1.5 rounded-lg bg-med-green px-3.5 py-2 text-xs font-bold text-white shadow-lg hover:bg-med-greenDark transition-all active:scale-[0.95]"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Go Fullscreen
        </button>
      </div>
    );
  }

  return null;
}
