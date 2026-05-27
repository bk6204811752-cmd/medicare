"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingBag, Plus, X, Loader2, Search, CheckCircle2, Clock,
  Truck, Package, AlertCircle, ChevronDown, RefreshCw, Send,
  Building2, Phone, MapPin, Sparkles, Filter, Percent, ArrowRight,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type Stockist = {
  id: string; name: string; slug: string; city: string | null;
  state: string | null; phone: string | null; drugLicenseNo: string | null;
};

type OrderItem = { medicineName: string; quantity: string | number; ratePaisa: string | number };

type StockistOrder = {
  id: string; orderNo: string; status: string; totalPaisa: number;
  notes: string | null; orderDate: string; createdAt: string;
  stockistTenant: { id: string; name: string; city: string | null; phone: string | null };
  items: { id: string; medicineName: string; quantity: number; ratePaisa: number; totalPaisa: number }[];
};

type CatalogProduct = {
  name: string;
  generic: string;
  category: "pharma" | "consumables" | "equipment";
  ptr: number; // in Rupees
  mrp: number;
  manufacturer: string;
};

const B2B_CATALOG: CatalogProduct[] = [
  { name: "Paracetamol 650mg", generic: "Paracetamol", category: "pharma", ptr: 12.50, mrp: 19.50, manufacturer: "GSK Ltd" },
  { name: "Metformin 500mg ER", generic: "Metformin", category: "pharma", ptr: 8.40, mrp: 14.50, manufacturer: "Abbott Pharma" },
  { name: "Amoxicillin 250mg DT", generic: "Amoxicillin", category: "pharma", ptr: 18.90, mrp: 28.00, manufacturer: "Cipla India" },
  { name: "Cetirizine 10mg", generic: "Cetirizine Hydrochloride", category: "pharma", ptr: 4.20, mrp: 9.00, manufacturer: "Alkem Labs" },
  { name: "Disposable Syringes 2ml", generic: "Surgical Consumables", category: "consumables", ptr: 2.20, mrp: 5.00, manufacturer: "HMD India" },
  { name: "3-Ply Surgical Masks Box", generic: "Surgical Protections", category: "consumables", ptr: 95.00, mrp: 195.00, manufacturer: "3M Medical" },
  { name: "Digital Thermometer", generic: "Diagnostic Equipments", category: "equipment", ptr: 120.00, mrp: 250.00, manufacturer: "Omron Diagnostics" },
  { name: "Blood Pressure Monitor ER", generic: "Diagnostic Equipments", category: "equipment", ptr: 950.00, mrp: 1850.00, manufacturer: "Dr. Trust Co" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pending",     color: "bg-amber-100 text-amber-700 border-amber-200",   icon: <Clock className="h-3 w-3" /> },
  accepted:  { label: "Accepted",    color: "bg-sky-100 text-sky-700 border-sky-200",         icon: <CheckCircle2 className="h-3 w-3" /> },
  otp_sent:  { label: "OTP Sent",    color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  delivered: { label: "Delivered ✓", color: "bg-green-100 text-green-800 border-green-200",   icon: <Package className="h-3 w-3" /> },
  cancelled: { label: "Cancelled",   color: "bg-red-100 text-red-600 border-red-200",         icon: <X className="h-3 w-3" /> },
};

export default function OrderStockistPage() {
  const [stockists, setStockists]   = useState<Stockist[]>([]);
  const [orders, setOrders]         = useState<StockistOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Catalog tab states
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [compProductId, setCompProductId] = useState("med-dolo");

  const handleProcureCheapest = (prodName: string, rate: number) => {
    if (items.length === 1 && !items[0].medicineName.trim()) {
      setItems([{ medicineName: prodName, quantity: 100, ratePaisa: rate.toFixed(2) }]);
    } else {
      setItems((prev) => [...prev, { medicineName: prodName, quantity: 100, ratePaisa: rate.toFixed(2) }]);
    }

    if (!stockistId && stockists.length > 0) {
      setStockistId(stockists[0].id);
    }
    setShowForm(true);
    toast.success(`⚡ Routed ${prodName} to order checkout with cheapest rate of ₹${rate.toFixed(2)}!`);
  };

  // Form state
  const [stockistId, setStockistId]     = useState("");
  const [notes, setNotes]               = useState("");
  const [items, setItems]               = useState<OrderItem[]>([{ medicineName: "", quantity: "", ratePaisa: "" }]);
  const [stockistSearch, setStockistSearch] = useState("");

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [sRes, oRes] = await Promise.all([
        fetch("/api/stockists").then((r) => r.json()),
        fetch("/api/stockist-orders").then((r) => r.json()),
      ]);
      setStockists(sRes.data ?? []);
      setOrders(oRes.data ?? []);
    } catch {
      toast.error("Failed to load B2B procurement ledger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Pre-fill cart if routed with draft from Smart Reorder Engine
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("draft") === "true") {
        const draft = localStorage.getItem("b2b_draft_cart");
        if (draft) {
          try {
            const itemsParsed = JSON.parse(draft);
            setItems(
              itemsParsed.map((item: any) => ({
                medicineName: item.medicineName,
                quantity: item.quantity,
                ratePaisa: item.ratePaisa ? (item.ratePaisa / 100).toFixed(2) : "",
              }))
            );
            setShowForm(true);
            localStorage.removeItem("b2b_draft_cart");
            toast.success("Draft items pre-filled from Smart Reorder Engine!");
          } catch (e) {
            console.error("Failed to parse draft cart:", e);
          }
        }
      }
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredStockists = useMemo(() =>
    stockists.filter((s) =>
      s.name.toLowerCase().includes(stockistSearch.toLowerCase()) ||
      (s.city || "").toLowerCase().includes(stockistSearch.toLowerCase())
    ), [stockists, stockistSearch]);

  const addItem = () => setItems((p) => [...p, { medicineName: "", quantity: "", ratePaisa: "" }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) =>
    setItems((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const selectedStockist = stockists.find((s) => s.id === stockistId);

  const handleSubmit = async () => {
    if (!stockistId) { toast.error("Please select a stockist"); return; }
    if (items.some((i) => !i.medicineName.toString().trim() || !i.quantity || Number(i.quantity) < 1)) {
      toast.error("Fill all item fields with valid quantities");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stockist-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockistTenantId: stockistId,
          notes,
          items: items.map((i) => ({
            medicineName: i.medicineName,
            quantity: Number(i.quantity),
            ratePaisa: i.ratePaisa ? Math.round(Number(i.ratePaisa) * 100) : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`B2B Order ${data.data?.orderNo ?? ""} placed successfully!`);
      setShowForm(false);
      setStockistId(""); setNotes(""); setStockistSearch("");
      setItems([{ medicineName: "", quantity: "", ratePaisa: "" }]);
      fetchAll(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCatalogProduct = (prod: CatalogProduct) => {
    // If the first row is empty, fill it, otherwise add a new row
    if (items.length === 1 && !items[0].medicineName.trim()) {
      setItems([{ medicineName: prod.name, quantity: 50, ratePaisa: prod.ptr.toFixed(2) }]);
    } else {
      setItems((prev) => [...prev, { medicineName: prod.name, quantity: 50, ratePaisa: prod.ptr.toFixed(2) }]);
    }
    
    // Automatically select first available stockist if none selected
    if (!stockistId && stockists.length > 0) {
      setStockistId(stockists[0].id);
    }

    setShowForm(true);
    toast.success(`${prod.name} added to B2B ordering cart!`);
  };

  const filteredCatalog = useMemo(() => {
    return B2B_CATALOG.filter((prod) => {
      const matchesSearch =
        prod.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        prod.generic.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        prod.manufacturer.toLowerCase().includes(catalogSearch.toLowerCase());
      
      const matchesCat = catalogCategory === "all" || prod.category === catalogCategory;
      return matchesSearch && matchesCat;
    });
  }, [catalogSearch, catalogCategory]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const otpReadyCount = orders.filter((o) => o.status === "otp_sent").length;

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="B2B Procurement Marketplace"
        description="Saveo-style single-window B2B drug purchasing — comparative transparent PTR/PTS rates & guaranteed delivery SLAs"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm active:scale-95 duration-150"
            >
              <Plus className="h-4 w-4" /> Place B2B Order
            </button>
          </div>
        }
      />

      {/* Saveo SLA Banner & Status Summary */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* SLA Banner */}
        <div className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl p-4.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-1">
                Saveo SLA Delivery Channels <Sparkles className="h-3.5 w-3.5 fill-white" />
              </h3>
              <p className="text-xs text-emerald-100 font-semibold mt-0.5">
                Order within next 3h 15m to guarantee **Same-day Evening Delivery (before 8:00 PM)**!
              </p>
            </div>
          </div>
        </div>

        {/* Status Alert count */}
        {(pendingCount > 0 || otpReadyCount > 0) && (
          <div className="flex flex-wrap gap-2 md:w-auto items-center">
            {otpReadyCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 text-sm font-semibold text-emerald-700 animate-pulse">
                <CheckCircle2 className="h-4 w-4" />
                {otpReadyCount} OTP ready in Notifications!
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 text-sm font-semibold text-amber-700">
                <Clock className="h-4 w-4" />
                {pendingCount} pending stockist confirmation
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── SAVEO-STYLE B2B MULTI-STOCKIST PRICE COMPARISON ENGINE ─── */}
      <div className="glass-card p-5 border border-emerald-100 bg-emerald-50/5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
            <div>
              <h2 className="font-extrabold text-base text-slate-800">B2B Multi-Supplier Price Comparison Engine</h2>
              <p className="text-xs text-slate-400">Saveo Channel: Real-time PTR margin auditing across wholesalers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Select Drug:</span>
            <select
              value={compProductId}
              onChange={(e) => setCompProductId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="med-dolo">Dolo 650 Tablet (Paracetamol)</option>
              <option value="med-azithral">Azithral 500 Tablet (Azithromycin)</option>
              <option value="med-glycomet">Glycomet GP 1 Tablet (Metformin)</option>
            </select>
          </div>
        </div>
        {/* Comparison grid columns */}
        {(() => {
          const compData: Record<string, { name: string; rates: { stockist: string; price: number; margin: number; discount: number; gst: number; cheapest?: boolean }[] }> = {
            "med-dolo": {
              name: "Dolo 650 Tablet",
              rates: [
                { stockist: "Shankar Pharma Wholesalers", price: 12.50, margin: 36, discount: 0, gst: 12 },
                { stockist: "Saveo Premium Wholesales", price: 11.80, margin: 39, discount: 5, gst: 12, cheapest: true },
                { stockist: "Medikabazaar Logistics", price: 13.00, margin: 33, discount: 2, gst: 12 },
              ],
            },
            "med-azithral": {
              name: "Azithral 500 Tablet",
              rates: [
                { stockist: "Shankar Pharma Wholesalers", price: 82.00, margin: 31, discount: 0, gst: 12 },
                { stockist: "Saveo Premium Wholesales", price: 78.50, margin: 34, discount: 5, gst: 12, cheapest: true },
                { stockist: "Medikabazaar Logistics", price: 84.00, margin: 29, discount: 2, gst: 12 },
              ],
            },
            "med-glycomet": {
              name: "Glycomet GP 1 Tablet",
              rates: [
                { stockist: "Shankar Pharma Wholesalers", price: 92.00, margin: 28, discount: 0, gst: 12 },
                { stockist: "Saveo Premium Wholesales", price: 88.00, margin: 31, discount: 5, gst: 12, cheapest: true },
                { stockist: "Medikabazaar Logistics", price: 94.50, margin: 26, discount: 2, gst: 12 },
              ],
            },
          };

          const activeComp = compData[compProductId] || compData["med-dolo"];
          const cheapestRate = activeComp.rates.find((r) => r.cheapest)!;

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeComp.rates.map((rate) => {
                  const gstVal = rate.price * (rate.gst / 100);
                  const discVal = rate.price * (rate.discount / 100);
                  const landingCost = rate.price + gstVal - discVal;

                  return (
                    <div
                      key={rate.stockist}
                      className={`rounded-xl border p-4 flex flex-col justify-between relative transition-all duration-200 bg-white ${
                        rate.cheapest
                          ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/5"
                          : "border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      {rate.cheapest && (
                        <span className="absolute -top-2.5 left-4 bg-emerald-600 border border-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                          👑 Cheapest Source
                        </span>
                      )}

                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Wholesaler</p>
                        <h4 className="font-extrabold text-sm text-slate-800">{rate.stockist}</h4>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>Wholesale PTR</span>
                          <span className="font-bold text-slate-650">₹{rate.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>GST ({rate.gst}%)</span>
                          <span className="font-semibold text-slate-600">+₹{gstVal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>Scheme Disc ({rate.discount}%)</span>
                          <span className="font-semibold text-emerald-600">-₹{discVal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] text-slate-400 font-extrabold uppercase">Net Landing Cost</p>
                            <p className="text-lg font-black text-slate-800">₹{landingCost.toFixed(2)}</p>
                          </div>
                          <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0">
                            {rate.margin}% margin
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action trigger */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold text-slate-500">
                    Audit verified! procuring {activeComp.name} from **{cheapestRate.stockist}** saves you **₹{(activeComp.rates.find(r => !r.cheapest)!.price - cheapestRate.price).toFixed(2)} per unit** compared to local market.
                  </p>
                </div>
                <button
                  onClick={() => handleProcureCheapest(activeComp.name, cheapestRate.price)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 transition-all shadow-sm active:scale-95 duration-100"
                >
                  Procure cheapest (₹{cheapestRate.price.toFixed(2)})
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── SAVEO B2B MARKETPLACE CATALOG ──────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="h-4.5 w-4.5 text-emerald-600" /> B2B Drug Procurement Catalog
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
            {filteredCatalog.length} products listed
          </span>
        </div>

        {/* Search & Category Filter */}
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search wholesale drugs, consumables, diagnostic equipments..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
            />
          </div>

          <div className="flex gap-1.5 w-full sm:w-auto">
            {[
              { id: "all", label: "All Items" },
              { id: "pharma", label: "Pharma" },
              { id: "consumables", label: "Consumables" },
              { id: "equipment", label: "Equipment" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCatalogCategory(cat.id)}
                className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all border ${
                  catalogCategory === cat.id
                    ? "bg-slate-800 border-slate-800 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCatalog.map((prod) => {
            const margin = Math.round(((prod.mrp - prod.ptr) / prod.mrp) * 100);
            return (
              <div
                key={prod.name}
                className="glass-card p-4 flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all duration-200 border border-slate-100 group relative"
              >
                <span className="absolute top-3.5 right-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Percent className="h-2.5 w-2.5" /> {margin}% margin
                </span>

                <div className="space-y-1 pr-16">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{prod.manufacturer}</p>
                  <h3 className="font-extrabold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight line-clamp-1">
                    {prod.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">🧪 {prod.generic}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400 font-semibold">
                      PTR: <span className="font-bold text-slate-700">₹{prod.ptr.toFixed(2)}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      MRP: <span className="font-medium text-slate-500">₹{prod.mrp.toFixed(2)}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleAddCatalogProduct(prod)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-xs active:scale-95 duration-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── ORDERS LISTING SECTION ─────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="font-display text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Truck className="h-4.5 w-4.5 text-slate-600" /> B2B Order Procurement History
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-med-greenSoft text-med-green mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-med-navy">No Orders Yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Place your first order to a stockist. OTP delivery and auto purchase entry are fully automated.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-med-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Place First Order
            </button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              return (
                <div
                  key={order.id}
                  className="glass-card p-4 sm:p-5 hover:shadow-md transition-all duration-200 border border-slate-100 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-800 text-sm sm:text-base">{order.stockistTenant.name}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-400 mt-0.5">{order.orderNo}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{formatDate(order.orderDate)}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-extrabold text-slate-800">{formatCurrency(order.totalPaisa)}</p>
                      <p className="text-xs text-slate-400 font-semibold">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {order.items.slice(0, 6).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                        <span className="text-xs text-slate-700 font-semibold truncate">{item.medicineName}</span>
                        <span className="ml-2 shrink-0 text-xs font-bold text-slate-500">×{item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 6 && (
                      <div className="flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1.5 border border-slate-200">
                        <span className="text-xs text-slate-500 font-bold">+{order.items.length - 6} more</span>
                      </div>
                    )}
                  </div>

                  {order.status === "otp_sent" && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 animate-pulse">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-sm font-semibold text-emerald-700">
                        OTP is ready! Check{" "}
                        <a href="/shop/notifications" className="underline underline-offset-2 hover:text-emerald-900 font-bold">
                          Notifications
                        </a>{" "}
                        to show delivery person.
                      </p>
                    </div>
                  )}
                  {order.status === "delivered" && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
                      <Package className="h-4 w-4 text-green-600 shrink-0" />
                      <p className="text-sm font-semibold text-green-700">
                        Delivered! Purchase entry auto-created in your{" "}
                        <a href="/shop/purchases" className="underline underline-offset-2 hover:text-green-900 font-bold">
                          Purchases
                        </a>
                        .
                      </p>
                    </div>
                  )}
                  {order.notes && (
                    <p className="mt-2 text-xs text-slate-400 italic">Note: {order.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── PLACE ORDER MODAL ──────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="font-display text-xl font-bold text-med-navy">Place Stockist Order</h2>
                <p className="text-xs text-slate-400 mt-0.5">Order will go directly to the stockist's order queue</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Stockist Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Select Stockist <span className="text-red-500">*</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={stockistSearch}
                    onChange={(e) => setStockistSearch(e.target.value)}
                    placeholder="Search stockist by name or city..."
                    className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-semibold text-slate-700"
                  />
                </div>
                <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredStockists.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-4">No stockists found</p>
                  ) : filteredStockists.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStockistId(s.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        stockistId === s.id
                          ? "border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-600/10"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${stockistId === s.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-med-navy">{s.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {s.city && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" />{s.city}</span>}
                          {s.phone && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{s.phone}</span>}
                        </div>
                      </div>
                      {stockistId === s.id && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Order Items <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center">
                      <input
                        value={item.medicineName}
                        onChange={(e) => updateItem(i, "medicineName", e.target.value)}
                        placeholder="Medicine name"
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-500 outline-none font-semibold text-slate-700"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", e.target.value)}
                        placeholder="Qty"
                        min={1}
                        className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-center focus:border-emerald-500 outline-none font-extrabold text-slate-700"
                      />
                      <input
                        type="number"
                        value={item.ratePaisa}
                        onChange={(e) => updateItem(i, "ratePaisa", e.target.value)}
                        placeholder="Rate ₹"
                        step="0.01"
                        className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm focus:border-emerald-500 outline-none font-bold text-slate-700"
                      />
                      {items.length > 1 ? (
                        <button
                          onClick={() => removeItem(i)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : <div className="h-10 w-10" />}
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 px-0.5">
                    <p className="text-[10px] text-slate-400 font-medium">Medicine Name</p>
                    <p className="text-[10px] text-slate-400 font-medium text-center">Qty</p>
                    <p className="text-[10px] text-slate-400 font-medium">Rate (₹)</p>
                    <div />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions for the stockist..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none font-medium text-slate-700"
                />
              </div>

              {/* Summary */}
              {selectedStockist && (() => {
                const totalPaisa = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.ratePaisa) || 0) * 100, 0);
                const thresholdPaisa = 150000; // ₹1,500 threshold
                const pct = Math.min(100, Math.round((totalPaisa / thresholdPaisa) * 100));
                const remaining = thresholdPaisa - totalPaisa;

                return (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Stockist</span>
                      <span className="font-semibold text-med-navy">{selectedStockist.name}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                      <span>Items</span>
                      <span className="font-semibold text-med-navy">{items.filter((i) => i.medicineName).length}</span>
                    </div>

                    {/* Wholesaler Shipping Threshold progress bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-450 uppercase tracking-wide">Saveo Shipping Goal</span>
                        <span className={pct >= 100 ? "text-emerald-600 uppercase" : "text-amber-600"}>
                          {pct >= 100 ? "🎉 Free Delivery Unlocked!" : `₹${(totalPaisa / 100).toFixed(2)} / ₹1,500`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${pct >= 100 ? "bg-emerald-500" : "bg-amber-500"}`} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                      {pct < 100 && (
                        <p className="text-[9px] text-slate-400 font-semibold leading-tight">
                          💡 Add **₹{(remaining / 100).toFixed(2)}** more to unlock **FREE wholesaler shipping & same-day evening delivery**!
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between text-sm font-bold text-slate-700 border-t border-slate-200 pt-1.5">
                      <span>Total (approx.)</span>
                      <span className="text-emerald-600">
                        {formatCurrency(totalPaisa)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !stockistId}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-sm active:scale-95 duration-100"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {saving ? "Placing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
