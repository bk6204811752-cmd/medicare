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

  const requestFullscreen = async (showButtonOnFail = true) => {
    if (!isDesktop()) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        sessionStorage.setItem("autoFullscreenTriggered", "true");
        setHasExitedExplicitly(false);
        setShowManualTrigger(false);
      }
    } catch (err) {
      // Programmatic request failed. Only show manual button if requested.
      if (showButtonOnFail) {
        setShowManualTrigger(true);
      }
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
    requestFullscreen(false); // Don't show manual trigger button if immediate auto-request fails on mount

    // Auto-trigger on first user gesture (click/keydown)
    const handleGesture = async () => {
      if (sessionStorage.getItem("explicitlyExitedFullscreen") === "true") {
        document.removeEventListener("click", handleGesture);
        document.removeEventListener("keydown", handleGesture);
        return;
      }
      await requestFullscreen(true);
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
      const isPrinting = sessionStorage.getItem("isSystemPrinting") === "true" || sessionStorage.getItem("restoreFullscreenAfterPrint") === "true";
      
      if (!exitedSession && !document.fullscreenElement) {
        // Try requesting fullscreen, but fail silently if no user gesture is present
        await requestFullscreen(false);
        
        // Listen for next click to re-enter with user gesture
        const reEnterOnNextClick = async () => {
          const checkExited = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
          if (!checkExited && !document.fullscreenElement) {
            await requestFullscreen(!isPrinting); // Show manual button only if not printing
          }
          document.removeEventListener("click", reEnterOnNextClick);
        };
        document.addEventListener("click", reEnterOnNextClick);
      }
    };

    // Print event listeners to handle browser print dialog fullscreen exits
    let wasFullscreenBeforePrint = false;
    const handleBeforePrint = () => {
      wasFullscreenBeforePrint = !!document.fullscreenElement;
      sessionStorage.setItem("isSystemPrinting", "true");
      if (wasFullscreenBeforePrint) {
        sessionStorage.setItem("restoreFullscreenAfterPrint", "true");
      }
    };

    const handleAfterPrint = () => {
      sessionStorage.removeItem("isSystemPrinting");
      // Hide manual trigger button during this print focus transition
      setShowManualTrigger(false);
      
      // Setup listener on next interaction to restore fullscreen
      const restoreOnInteraction = async () => {
        const checkExited = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
        const restoreNeeded = sessionStorage.getItem("restoreFullscreenAfterPrint") === "true";
        if (!checkExited && restoreNeeded && !document.fullscreenElement) {
          sessionStorage.removeItem("restoreFullscreenAfterPrint");
          await requestFullscreen(false);
        }
        document.removeEventListener("click", restoreOnInteraction);
        document.removeEventListener("keydown", restoreOnInteraction);
      };
      
      document.addEventListener("click", restoreOnInteraction);
      document.addEventListener("keydown", restoreOnInteraction);
      
      // Auto clear after 2 seconds if no interaction
      setTimeout(() => {
        sessionStorage.removeItem("restoreFullscreenAfterPrint");
      }, 2000);
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      document.removeEventListener("click", handleGesture);
      document.removeEventListener("keydown", handleGesture);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    function handleChange() {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      
      const exitedSession = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
      const isPrinting = sessionStorage.getItem("isSystemPrinting") === "true" || sessionStorage.getItem("restoreFullscreenAfterPrint") === "true";

      if (!active && !exitedSession) {
        // If exiting fullscreen was due to print or auto focus change, suppress manual trigger display
        if (isPrinting) {
          setShowManualTrigger(false);
        }

        const reEnter = async () => {
          const checkExited = sessionStorage.getItem("explicitlyExitedFullscreen") === "true";
          if (!checkExited && !document.fullscreenElement) {
            await requestFullscreen(!isPrinting); // Show manual button only if not printing
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

  // If manual trigger is required and we are not printing/restoring
  const isPrintingState = typeof window !== "undefined" && 
    (sessionStorage.getItem("isSystemPrinting") === "true" || sessionStorage.getItem("restoreFullscreenAfterPrint") === "true");

  if (showManualTrigger && !isPrintingState) {
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
