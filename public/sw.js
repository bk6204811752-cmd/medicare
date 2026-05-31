// ─── Medicare Offline Service Worker ────────────────────────────
// Strategies:
//   1. App Shell (install-time): pre-cache critical routes
//   2. Runtime cache: stale-while-revalidate for pages + assets
//   3. Offline fallback: serve cached version when network fails
//   4. Background sync: queue failed POST requests for replay
// ────────────────────────────────────────────────────────────────

const CACHE_NAME = "medicare-v1";
const RUNTIME_CACHE = "medicare-runtime-v1";

// Critical routes to pre-cache on install
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
];

// ─── Install: Pre-cache app shell ────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] Pre-cache partial failure (non-fatal):", err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch: Network-first with cache fallback ────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PATCH/DELETE) — those go through normally
  // The offline queue in the app handles saving them to localStorage
  if (request.method !== "GET") return;

  // Skip API calls — they return JSON, not cacheable pages
  // Exception: we cache search/inventory APIs briefly for offline POS
  if (url.pathname.startsWith("/api/")) {
    // Cache inventory and medicine search responses for offline POS
    if (
      url.pathname.includes("/inventory") ||
      url.pathname.includes("/medicines/search") ||
      url.pathname.includes("/search")
    ) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 300));
      return;
    }
    // All other API calls — network only
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // For navigation requests (page loads) — network first, cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the successful response
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed — serve from cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Last resort: serve the cached root page as offline shell
            return caches.match("/").then((root) => {
              if (root) return root;
              return new Response(offlineHTML(), {
                status: 503,
                headers: { "Content-Type": "text/html" },
              });
            });
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images) — stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 86400));
    return;
  }

  // Everything else — network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Stale-while-revalidate helper ───────────────────────────
function staleWhileRevalidate(request, cacheName, maxAgeSec) {
  return caches.open(cacheName).then((cache) => {
    return cache.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Network failed — return cached if available
          if (cached) return cached;
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        });

      // Return cached immediately if available, but also kick off revalidation
      return cached || fetchPromise;
    });
  });
}

// ─── Offline HTML fallback ───────────────────────────────────
function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medicare — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      padding: 3rem 2.5rem;
      max-width: 420px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .icon {
      width: 80px; height: 80px;
      background: #fef3c7;
      border-radius: 1.25rem;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 2.5rem;
      border: 2px solid #fde68a;
    }
    h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; }
    p { font-size: 0.95rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
    .hint {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 0.75rem;
      padding: 1rem;
      font-size: 0.85rem;
      color: #166534;
      font-weight: 600;
      line-height: 1.5;
    }
    button {
      margin-top: 1.5rem;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 0.75rem;
      padding: 0.75rem 2rem;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #15803d; }
    button:active { transform: scale(0.97); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📴</div>
    <h1>You're Offline</h1>
    <p>Internet connection nahi hai. Jab bhi aap pehle se loaded POS page par hain, billing offline continue hogi — bills automatically sync honge jab connection wapas aayega.</p>
    <div class="hint">
      💡 Tip: POS billing page open rakhein — woh offline kaam karta hai aur bills queue mein save hote hain.
    </div>
    <button onclick="location.reload()">↻ Retry Connection</button>
  </div>
</body>
</html>`;
}

// ─── Message handler for cache invalidation ──────────────────
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data === "clearCache") {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});
