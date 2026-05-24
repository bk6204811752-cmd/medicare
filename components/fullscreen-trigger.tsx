"use client";

import { useEffect, useState } from "react";
import { Minimize2, Maximize2 } from "lucide-react";

export function FullscreenTrigger() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showManualTrigger, setShowManualTrigger] = useState(false);
  const [hasExitedExplicitly, setHasExitedExplicitly] = useState(false);

  // Check if browser is desktop
  const isDesktop = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: hover)").matches && window.innerWidth > 1024;
  };

  const requestFullscreen = async () => {
    if (!isDesktop()) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        sessionStorage.setItem("autoFullscreenTriggered", "true");
        setHasExitedExplicitly(false);
        setShowManualTrigger(false);
      }
    } catch (err) {
      // Programmatic request failed, show manual button
      setShowManualTrigger(true);
    }
  };

  const handleExplicitExit = async () => {
    setHasExitedExplicitly(true);
    sessionStorage.setItem("explicitlyExitedFullscreen", "true");
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
    }
    setShowManualTrigger(true);
  };

  const handleManualEnter = async () => {
    setHasExitedExplicitly(false);
    sessionStorage.removeItem("explicitlyExitedFullscreen");
    await requestFullscreen();
  };

  useEffect(() => {
    if (!isDesktop()) return;

    // Check if user previously exited in this session
    const exited = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
    if (exited) {
      setHasExitedExplicitly(true);
      setShowManualTrigger(true);
      return;
    }

    // Try going fullscreen immediately
    requestFullscreen();

    // Auto-trigger on first user gesture (click/keydown)
    const handleGesture = async () => {
      if (sessionStorage.getItem("explicitlyExitedFullscreen") === "true") {
        document.removeEventListener("click", handleGesture);
        document.removeEventListener("keydown", handleGesture);
        return;
      }
      await requestFullscreen();
      // Remove listeners once fullscreen is successful
      if (document.fullscreenElement) {
        document.removeEventListener("click", handleGesture);
        document.removeEventListener("keydown", handleGesture);
      }
    };

    document.addEventListener("click", handleGesture);
    document.addEventListener("keydown", handleGesture);

    // Listen to window focus (re-focusing after file picker or dialog closes)
    const handleWindowFocus = async () => {
      const exitedSession = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
      if (!exitedSession && !document.fullscreenElement) {
        // Try requesting fullscreen immediately
        await requestFullscreen();
        
        // If immediate fails, listen for next click to re-enter
        const reEnterOnNextClick = async () => {
          const checkExited = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
          if (!checkExited && !document.fullscreenElement) {
            await requestFullscreen();
          }
          document.removeEventListener("click", reEnterOnNextClick);
        };
        document.addEventListener("click", reEnterOnNextClick);
      }
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("click", handleGesture);
      document.removeEventListener("keydown", handleGesture);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    function handleChange() {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      
      // If we exited fullscreen but did NOT click explicit exit,
      // it means browser exited fullscreen automatically (e.g. from file upload dialog).
      // We will queue up a listener to re-enter on the next click/action.
      const exitedSession = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
      if (!active && !exitedSession) {
        const reEnter = async () => {
          const checkExited = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
          if (!checkExited && !document.fullscreenElement) {
            await requestFullscreen();
          }
          document.removeEventListener("click", reEnter);
          document.removeEventListener("keydown", reEnter);
        };
        document.addEventListener("click", reEnter);
        document.addEventListener("keydown", reEnter);
      }
    }

    document.addEventListener("fullscreenchange", handleChange);
    handleChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  // While in fullscreen, do not render any exit buttons
  if (isFullscreen) {
    return null;
  }

  // If manual trigger is required
  if (showManualTrigger) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] no-print">
        <button
          onClick={handleManualEnter}
          className="flex items-center gap-2 rounded-full bg-med-green px-5 py-3 text-xs font-bold text-white shadow-2xl hover:bg-med-greenDark transition-all active:scale-[0.95] border border-white/20"
        >
          <Maximize2 className="h-4 w-4" />
          Go Fullscreen
        </button>
      </div>
    );
  }

  return null;
}
