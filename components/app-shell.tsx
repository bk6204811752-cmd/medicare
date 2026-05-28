"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, Box, ChevronLeft, ClipboardList, CreditCard, FileImage,
  Home, LogOut, Menu, Package, PackageCheck, PackageMinus, PackageX,
  Search, Settings, ShoppingCart, Store, Truck, Users, X, ShoppingBag,
  TrendingUp, Camera, RotateCcw
} from "lucide-react";
import { logoutAction } from "@/app/auth-actions";
import type { LocalUser } from "@/lib/local-db";
import { OfflineSyncBadge } from "@/components/offline-sync-badge";

type NavItem = { label: string; href: string; icon: React.ReactNode };

const shopNav: NavItem[] = [
  { label: "Dashboard", href: "/shop/dashboard", icon: <Home className="h-5 w-5" /> },
  { label: "Billing / POS", href: "/shop/billing", icon: <ShoppingCart className="h-5 w-5" /> },
  { label: "Inventory", href: "/shop/inventory", icon: <Package className="h-5 w-5" /> },
  { label: "Smart Reorder", href: "/shop/inventory/reorder", icon: <TrendingUp className="h-5 w-5" /> },
  { label: "Order Stockist", href: "/shop/order-stockist", icon: <ShoppingBag className="h-5 w-5" /> },
  { label: "Purchases", href: "/shop/purchases", icon: <Truck className="h-5 w-5" /> },
  { label: "AI Scan Invoice", href: "/shop/purchases/scan", icon: <Camera className="h-5 w-5" /> },
  { label: "Sale Returns", href: "/shop/sale-returns", icon: <PackageMinus className="h-5 w-5" /> },
  { label: "Purchase Returns", href: "/shop/purchase-returns", icon: <PackageX className="h-5 w-5" /> },
  { label: "Dead Stock Return", href: "/shop/purchase-returns/dead-stock", icon: <RotateCcw className="h-5 w-5" /> },
  { label: "Expiry Auto-Return", href: "/shop/purchase-returns/expiry", icon: <PackageX className="h-5 w-5" /> },
  { label: "Customers", href: "/shop/customers", icon: <Users className="h-5 w-5" /> },
  { label: "Patient Refills", href: "/shop/customers/refills", icon: <Bell className="h-5 w-5" /> },
  { label: "Suppliers", href: "/shop/suppliers", icon: <Box className="h-5 w-5" /> },
  { label: "Credit Ageing", href: "/shop/suppliers/credit-ageing", icon: <CreditCard className="h-5 w-5" /> },
  { label: "Reports", href: "/shop/reports", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Schedule H", href: "/shop/schedule-h", icon: <ClipboardList className="h-5 w-5" /> },
  { label: "Prescriptions", href: "/shop/prescriptions", icon: <FileImage className="h-5 w-5" /> },
  { label: "Online Orders", href: "/shop/prescriptions/online-orders", icon: <ClipboardList className="h-5 w-5" /> },
  { label: "Notifications", href: "/shop/notifications", icon: <Bell className="h-5 w-5" /> },
  { label: "Settings", href: "/shop/settings", icon: <Settings className="h-5 w-5" /> },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <Home className="h-5 w-5" /> },
  { label: "Shops", href: "/admin/shops", icon: <Store className="h-5 w-5" /> },
  { label: "Medicine Master", href: "/admin/medicine-master", icon: <PackageCheck className="h-5 w-5" /> },
  { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: <CreditCard className="h-5 w-5" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
];

const stockistNav: NavItem[] = [
  { label: "Dashboard", href: "/stockist/dashboard", icon: <Home className="h-5 w-5" /> },
  { label: "B2B Sales & POS", href: "/stockist/sales", icon: <ShoppingCart className="h-5 w-5" /> },
  { label: "Sales Returns", href: "/stockist/sales-returns", icon: <PackageMinus className="h-5 w-5" /> },
  { label: "Chemist Orders", href: "/stockist/orders", icon: <ClipboardList className="h-5 w-5" /> },
  { label: "Inventory", href: "/stockist/inventory", icon: <Package className="h-5 w-5" /> },
  { label: "Parties (Retailers)", href: "/stockist/parties", icon: <Users className="h-5 w-5" /> },
  { label: "Credit & Collection", href: "/stockist/collection", icon: <CreditCard className="h-5 w-5" /> },
  { label: "Sales Team", href: "/stockist/salesmen", icon: <Store className="h-5 w-5" /> },
  { label: "Purchase & Indent", href: "/stockist/purchases", icon: <Truck className="h-5 w-5" /> },
  { label: "Purchase Returns", href: "/stockist/purchase-returns", icon: <PackageX className="h-5 w-5" /> },
  { label: "Manufacturers (Suppliers)", href: "/stockist/suppliers", icon: <Box className="h-5 w-5" /> },
  { label: "Reports & GST", href: "/stockist/reports", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Settings", href: "/stockist/settings", icon: <Settings className="h-5 w-5" /> },
];

// ─── Isolated Search Modal — its state changes don't re-render sidebar/content ───
function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; type: string; title: string; subtitle: string; href: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  // Ctrl+K / Escape keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch, closeSearch]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json()).then((d) => setResults(d.data ?? [])).catch(() => {});
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  return (
    <>
      {/* Search trigger button */}
      <button onClick={openSearch}
        className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:bg-white hover:border-slate-300 transition-colors">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-slate-200 bg-white px-1.5 text-[10px] font-mono text-slate-400">Ctrl+K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 bg-black/30 animate-fade-in no-print" onClick={closeSearch}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg border border-slate-200 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none text-sm" placeholder="Search medicines, customers, invoices..." autoFocus />
              <button onClick={closeSearch} className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5">ESC</button>
            </div>
            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto p-2">
                {results.map((r) => (
                  <Link key={r.id} href={r.href} onClick={closeSearch}
                    className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-med-navy">{r.title}</span>
                    <span className="text-xs text-slate-500">{r.subtitle}</span>
                  </Link>
                ))}
              </div>
            )}
            {query.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function AppShell({ user, profilePicUrl, children }: { user: LocalUser; profilePicUrl?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = user.role === "super_admin";
  const isStockist = user.role === "stockist_admin" || user.role === "stockist_staff";
  const nav = isAdmin ? adminNav : (isStockist ? stockistNav : shopNav);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [currentProfilePic, setCurrentProfilePic] = useState(profilePicUrl);

  // Keep internal state in sync with prop changes
  useEffect(() => {
    setCurrentProfilePic(profilePicUrl);
  }, [profilePicUrl]);

  // Listen to profile picture update events
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setCurrentProfilePic(customEvent.detail);
      }
    };
    window.addEventListener("profile-pic-updated", handleUpdate);
    return () => window.removeEventListener("profile-pic-updated", handleUpdate);
  }, []);

  // Fetch notification count once (not on every navigation)
  useEffect(() => {
    if (!isAdmin) {
      Promise.all([
        fetch("/api/notifications").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/in-app-notifications").then((r) => r.json()).catch(() => ({ data: [] }))
      ]).then(([sys, inApp]) => {
        const sysCount = sys.data?.length ?? 0;
        const inAppUnreadCount = inApp.data?.filter((n: any) => !n.isRead).length ?? 0;
        setNotifCount(sysCount + inAppUnreadCount);
      }).catch(() => {});
    }
  }, [isAdmin]);

  // Fetch pending stockist orders count if stockist
  useEffect(() => {
    if (isStockist) {
      fetch("/api/stockist-orders/incoming")
        .then((r) => r.json())
        .then((d) => {
          const pending = d.data?.filter((o: any) => o.status === "pending").length ?? 0;
          setPendingOrdersCount(pending);
        })
        .catch(() => {});
    }
  }, [isStockist]);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Memoize active class computation
  const activeClass = useCallback((href: string) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return isActive
      ? "bg-med-greenSoft text-med-green border-l-[3px] border-med-green font-semibold"
      : "text-slate-600 hover:bg-slate-50 hover:text-med-navy border-l-[3px] border-transparent";
  }, [pathname]);

  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  return (
    <div className="flex h-screen overflow-hidden bg-med-mist">
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={closeMobile} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 lg:relative no-print
        ${collapsed ? "w-[68px]" : "w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          {!collapsed && (
            <Link href={isAdmin ? "/admin/dashboard" : (isStockist ? "/stockist/dashboard" : "/shop/dashboard")} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-med-green text-white font-extrabold text-xl leading-none">+</div>
              <span className="font-display text-lg font-bold text-med-navy">Medicare</span>
            </Link>
          )}
          <button onClick={toggleCollapsed} className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 text-slate-400">
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button onClick={closeMobile} className="flex lg:hidden h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${activeClass(item.href)}`}
              title={collapsed ? item.label : undefined}>
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.href === "/shop/notifications" && notifCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{notifCount}</span>
              )}
              {!collapsed && item.href === "/stockist/orders" && pendingOrdersCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">{pendingOrdersCount}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-3">
          {!collapsed && (
            <Link href="/shop/profile" className="mb-2 flex items-center gap-2.5 px-2 group">
              {currentProfilePic ? (
                <img src={currentProfilePic} alt={user.name} className="h-9 w-9 rounded-full object-cover border-2 border-med-green/20 shrink-0" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-med-greenSoft text-med-green text-sm font-bold border border-med-green/15">{(user.name || "U").charAt(0)}</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-med-navy truncate group-hover:text-med-green transition-colors">{user.name}</p>
                <p className="text-xs text-slate-500 truncate group-hover:text-slate-700 transition-colors">{user.tenantName || user.email}</p>
              </div>
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? "justify-center" : ""}`}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 no-print">
          <div className="flex items-center gap-3">
            <button onClick={openMobile} className="flex lg:hidden h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </button>
            <Link href={isAdmin ? "/admin/dashboard" : (isStockist ? "/stockist/dashboard" : "/shop/dashboard")} className="flex lg:hidden items-center gap-2 mr-2 hover:opacity-90 active:scale-95 transition-all">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-med-green text-white font-extrabold text-lg leading-none">+</div>
              <span className="font-display text-sm font-bold text-med-navy">Medicare</span>
            </Link>
            <SearchModal />
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && <OfflineSyncBadge />}
            {!isAdmin && (
              <Link href="/shop/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100">
                <Bell className="h-5 w-5 text-slate-500" />
                {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">{notifCount}</span>}
              </Link>
            )}
            <Link href="/shop/profile" className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden shadow-sm" title="View Profile">
              {currentProfilePic ? (
                <img src={currentProfilePic} alt={user.name} className="h-9 w-9 rounded-full object-cover border-2 border-med-green/20 hover:border-med-green transition-colors" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-med-green text-white text-sm font-bold hover:bg-med-greenDark transition-colors">{(user.name || "U").charAt(0)}</span>
              )}
            </Link>
          </div>
        </header>

        {/* Content — removed animate-fade-in to prevent flicker on navigation */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!isAdmin && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] lg:hidden h-16 no-print">
          {(isStockist ? [
            { label: "Dashboard", href: "/stockist/dashboard", icon: <Home className="h-5 w-5" /> },
            { label: "B2B Sales", href: "/stockist/sales", icon: <ShoppingCart className="h-5 w-5" /> },
            { label: "Inventory", href: "/stockist/inventory", icon: <Package className="h-5 w-5" /> },
            { label: "Parties", href: "/stockist/parties", icon: <Users className="h-5 w-5" /> },
          ] : [
            { label: "Dashboard", href: "/shop/dashboard", icon: <Home className="h-5 w-5" /> },
            { label: "Billing", href: "/shop/billing", icon: <ShoppingCart className="h-5 w-5" /> },
            { label: "Inventory", href: "/shop/inventory", icon: <Package className="h-5 w-5" /> },
            { label: "Customers", href: "/shop/customers", icon: <Users className="h-5 w-5" /> },
          ]).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center h-full transition-transform ${
                (pathname === item.href || pathname.startsWith(item.href + "/"))
                  ? "text-med-green border-t-2 border-med-green font-semibold scale-105"
                  : "text-slate-400 border-t-2 border-transparent"
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={openMobile}
            className="flex flex-1 flex-col items-center justify-center h-full text-slate-400 border-t-2 border-transparent"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1">More</span>
          </button>
        </nav>
      )}
    </div>
  );
}
