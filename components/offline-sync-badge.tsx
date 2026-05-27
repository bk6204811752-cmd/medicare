"use client";

import { useEffect, useState, useRef } from "react";
import {
  Wifi, WifiOff, RefreshCw, CheckCircle, Database,
  Sliders, AlertTriangle, Sparkles, X, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

type LocalAction = {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  status: "pending" | "syncing" | "synced";
};

const INITIAL_LOGS: LocalAction[] = [
  { id: "act-1", action: "POS Retail Invoice", details: "Ravi Prasad - ₹112.00 Dolo-650", timestamp: "01:02:15", status: "synced" },
  { id: "act-2", action: "Inventory Batch Upsert", details: "Dolo DL650A stock +150", timestamp: "01:03:45", status: "synced" },
  { id: "act-3", action: "B2B Supplier Purchase", details: "Saveo Connects - PO-SCAN-891", timestamp: "01:04:10", status: "synced" },
];

export function OfflineSyncBadge() {
  const [online, setOnline] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logs, setLogs] = useState<LocalAction[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Initialize and load queue from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("medicare_offline_queue");
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local sync queue:", e);
      }
    } else {
      localStorage.setItem("medicare_offline_queue", JSON.stringify(INITIAL_LOGS));
      setLogs(INITIAL_LOGS);
    }

    const isSimulatedOffline = localStorage.getItem("medicare_offline_mode") === "true";
    setOnline(!isSimulatedOffline);
  }, []);

  // Sync dispatcher and cross-tab listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSyncPush = () => {
      const saved = localStorage.getItem("medicare_offline_queue");
      if (saved) {
        try {
          setLogs(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to reload sync queue:", e);
        }
      }
    };

    window.addEventListener("medicare-sync-push", handleSyncPush);
    window.addEventListener("storage", handleSyncPush);

    return () => {
      window.removeEventListener("medicare-sync-push", handleSyncPush);
      window.removeEventListener("storage", handleSyncPush);
    };
  }, []);

  // Monitor real navigator network status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      const isSimulatedOffline = localStorage.getItem("medicare_offline_mode") === "true";
      if (!isSimulatedOffline) {
        setOnline(true);
        toast.success("📶 Internet reconnected! Synchronizing offline transactions...");
        triggerSyncSimulation();
      }
    };

    const handleOffline = () => {
      setOnline(false);
      toast.warning("📴 Internet disconnected. Medicare Marg-ERP Offline Mode is active.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [online, logs]);

  const triggerSyncSimulation = async () => {
    setSyncing(true);

    const currentLogsStr = localStorage.getItem("medicare_offline_queue") || "[]";
    let currentLogs: LocalAction[] = [];
    try {
      currentLogs = JSON.parse(currentLogsStr);
    } catch {
      currentLogs = [];
    }

    const pendings = currentLogs.filter((log) => log.status === "pending");
    if (pendings.length === 0) {
      setSyncing(false);
      return;
    }

    // Set syncing state
    const syncingLogs = currentLogs.map((log) =>
      log.status === "pending" ? { ...log, status: "syncing" as const } : log
    );
    setLogs(syncingLogs);
    localStorage.setItem("medicare_offline_queue", JSON.stringify(syncingLogs));

    let successCount = 0;
    let failCount = 0;

    for (const log of pendings) {
      const payload = (log as any).payload;
      const endpoint = (log as any).endpoint;

      if (payload && endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            successCount++;
            const currentQueue = JSON.parse(localStorage.getItem("medicare_offline_queue") || "[]");
            const updated = currentQueue.map((item: any) =>
              item.id === log.id ? { ...item, status: "synced" } : item
            );
            localStorage.setItem("medicare_offline_queue", JSON.stringify(updated));
            setLogs(updated);
          } else {
            failCount++;
            const currentQueue = JSON.parse(localStorage.getItem("medicare_offline_queue") || "[]");
            const updated = currentQueue.map((item: any) =>
              item.id === log.id ? { ...item, status: "pending" } : item
            );
            localStorage.setItem("medicare_offline_queue", JSON.stringify(updated));
            setLogs(updated);
          }
        } catch (err) {
          failCount++;
          const currentQueue = JSON.parse(localStorage.getItem("medicare_offline_queue") || "[]");
          const updated = currentQueue.map((item: any) =>
            item.id === log.id ? { ...item, status: "pending" } : item
          );
          localStorage.setItem("medicare_offline_queue", JSON.stringify(updated));
          setLogs(updated);
        }
      } else {
        // Fallback for seed mock pending logs
        successCount++;
        const currentQueue = JSON.parse(localStorage.getItem("medicare_offline_queue") || "[]");
        const updated = currentQueue.map((item: any) =>
          item.id === log.id ? { ...item, status: "synced" } : item
        );
        localStorage.setItem("medicare_offline_queue", JSON.stringify(updated));
        setLogs(updated);
      }
    }

    setSyncing(false);

    if (successCount > 0 && failCount === 0) {
      toast.success(`✓ Synchronized ${successCount} offline transactions to PostgreSQL database!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`⚠ Synchronized ${successCount} items, but ${failCount} items failed to sync.`);
    } else if (failCount > 0) {
      toast.error(`❌ Sync failed for ${failCount} offline items. We will retry upon reconnection.`);
    }
  };

  const handleToggleOfflineSimulator = () => {
    const nextMode = online ? "true" : "false";
    localStorage.setItem("medicare_offline_mode", nextMode);

    if (online) {
      setOnline(false);
      toast.warning("🔌 Simulated Go-Offline! Transactions will queue in local storage.", {
        description: "Marg ERP offline durability active."
      });
      // Append a pending offline action
      const newAct: LocalAction = {
        id: `act-${Date.now()}`,
        action: "Offline POS Queue",
        details: "Cached checkout line item locally",
        timestamp: new Date().toTimeString().slice(0, 8),
        status: "pending",
      };
      const updated = [newAct, ...logs];
      setLogs(updated);
      localStorage.setItem("medicare_offline_queue", JSON.stringify(updated));
    } else {
      setOnline(true);
      toast.success("🔌 Simulated Network Reconnect! Syncing local logs...");
      triggerSyncSimulation();
    }
  };

  return (
    <>
      {/* Navbar Glowing Badge */}
      <button
        onClick={() => setDrawerOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all border pointer-events-auto ${
          online
            ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100"
            : "bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-100 animate-pulse"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
        {online ? (
          <span className="flex items-center gap-1">
            <Wifi className="h-3.5 w-3.5" /> Synced
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <WifiOff className="h-3.5 w-3.5" /> Offline Mode
          </span>
        )}
      </button>

      {/* Sync Log Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in pointer-events-auto"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-slide-in pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6 overflow-y-auto flex-1 pr-1">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800">Marg Sync Engine</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Offline-First Data Ledger
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 hover:bg-slate-150 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Status and simulator toggle */}
              <div className="rounded-xl border p-4 space-y-3 bg-slate-50 border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Network Status:</span>
                  <span
                    className={`font-extrabold flex items-center gap-1 ${
                      online ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                    {online ? "Online" : "Offline (Local)"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Synchronizer:</span>
                  <span className="font-semibold text-slate-600">
                    {syncing ? "Active syncing..." : "Idle (all synchronized)"}
                  </span>
                </div>

                <button
                  onClick={handleToggleOfflineSimulator}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs py-2.5 transition-all active:scale-95 duration-100 shadow-sm"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  {online ? "Simulate Disconnection" : "Simulate Reconnection"}
                </button>
              </div>

              {/* Local Logs List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  Local Ledger Queue
                </h4>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-150 bg-white flex justify-between items-start gap-3 shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <h5 className="font-extrabold text-xs text-slate-700 leading-tight">
                          {log.action}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-semibold">{log.details}</p>
                        <span className="text-[8px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${
                            log.status === "synced"
                              ? "bg-emerald-50 text-emerald-700"
                              : log.status === "syncing"
                              ? "bg-blue-50 text-blue-700 animate-pulse"
                              : "bg-amber-50 text-amber-700 animate-bounce"
                          }`}
                        >
                          {log.status === "synced" ? (
                            "Synced"
                          ) : log.status === "syncing" ? (
                            "Syncing"
                          ) : (
                            "Queued"
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Footer credits */}
            <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Marg-ERP Sync Protocol Active
            </div>
          </div>
        </div>
      )}
    </>
  );
}
