"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, CheckCircle, Search, RefreshCw, ArrowRight,
  User, Clipboard, ShoppingCart, HelpCircle, Eye, Sparkles
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

type PrescriptionOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  doctorName: string;
  prescriptionDate: string;
  detectedText: string[];
  mappedItems: { medicineName: string; quantity: number }[];
};

const SAMPLE_ORDERS: PrescriptionOrder[] = [
  {
    id: "ord-1",
    customerName: "Anita Devi",
    customerPhone: "9876502222",
    doctorName: "Dr. Sinha",
    prescriptionDate: "2026-05-27",
    detectedText: ["Dolo 650 Tablet - Qty 10", "Glycomet GP 1 Tablet - Qty 15"],
    mappedItems: [
      { medicineName: "Dolo 650 Tablet", quantity: 10 },
      { medicineName: "Glycomet GP 1 Tablet", quantity: 15 },
    ],
  },
  {
    id: "ord-2",
    customerName: "Ravi Prasad",
    customerPhone: "9876501111",
    doctorName: "Dr. Mehta",
    prescriptionDate: "2026-05-28",
    detectedText: ["Azithral 500 Tablet - Qty 5", "Electral ORS Sachet - Qty 5"],
    mappedItems: [
      { medicineName: "Azithral 500 Tablet", quantity: 5 },
      { medicineName: "Electral ORS Sachet", quantity: 5 },
    ],
  },
];

export default function OnlinePrescriptionsHub() {
  const router = useRouter();
  const [orders, setOrders] = useState<PrescriptionOrder[]>(SAMPLE_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<PrescriptionOrder | null>(SAMPLE_ORDERS[0]);

  const handleUpdateQty = (idx: number, qty: number) => {
    if (!selectedOrder) return;
    const nextItems = selectedOrder.mappedItems.map((item, i) =>
      i === idx ? { ...item, quantity: Math.max(1, qty) } : item
    );
    setSelectedOrder({ ...selectedOrder, mappedItems: nextItems });
  };

  const handleConvertToPOS = () => {
    if (!selectedOrder) return;

    // Build the draft POS payload
    const draftPOS = {
      customerName: selectedOrder.customerName,
      customerPhone: selectedOrder.customerPhone,
      doctorName: selectedOrder.doctorName,
      items: selectedOrder.mappedItems.map((i) => ({
        medicineName: i.medicineName,
        quantity: i.quantity,
      })),
    };

    // Save to local storage for POS integration
    localStorage.setItem("pos_draft_bill", JSON.stringify(draftPOS));
    toast.success(`Successfully mapped ${selectedOrder.customerName}'s prescription! Redirecting to POS...`);

    // Route directly to retail Billing terminal with draft indicator
    router.push("/shop/billing?draft=true");
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Online Prescription Orders"
        description="EMedStore-style mobile prescription scanner — map patient uploads to active inventory & convert to bills instantly"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left: Incoming Queue List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Incoming Upload Queue
            </h3>
            <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 animate-pulse">
              {orders.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {orders.map((ord) => (
              <button
                key={ord.id}
                onClick={() => setSelectedOrder(ord)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 shadow-xs flex items-center justify-between ${
                  selectedOrder?.id === ord.id
                    ? "border-emerald-600 bg-emerald-50/10 ring-2 ring-emerald-600/5"
                    : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50"
                }`}
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-extrabold text-sm text-slate-800 leading-tight">
                      {ord.customerName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    📞 {ord.customerPhone} • {ord.doctorName}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Side-by-Side Review and Mapping tool */}
        {selectedOrder ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scanned Prescription Image Mock */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-600 px-1">
                <Eye className="h-4 w-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  Patient Prescription Image
                </h3>
              </div>

              {/* Doctor prescription paper mock */}
              <div className="glass-card p-6 bg-amber-50/20 border border-amber-200 relative overflow-hidden font-serif min-h-[380px] shadow-md flex flex-col justify-between">
                {/* Doctor header */}
                <div className="border-b border-amber-300 pb-3 text-center">
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                    {selectedOrder.doctorName}
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 italic">
                    Registered Medical Practitioner • Ranchi
                  </p>
                  <p className="text-[8px] text-slate-400 mt-1">Date: {selectedOrder.prescriptionDate}</p>
                </div>

                {/* RX Handwriting Mock */}
                <div className="py-6 flex-1 space-y-6">
                  <p className="text-2xl font-extrabold text-blue-600/70 select-none">Rx</p>
                  
                  {/* Handwritten drug list mock */}
                  <div className="pl-6 space-y-4 font-mono italic text-xs text-blue-700/80 tracking-wide select-none">
                    {selectedOrder.detectedText.map((txt) => (
                      <p key={txt} className="border-b border-amber-200/50 pb-1 w-fit">
                        - {txt}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="border-t border-amber-300 pt-3 text-center text-[8px] text-slate-400 italic">
                  <p>Reg License No: RAN-2026-98124</p>
                  <p className="mt-0.5">⚡ Scanned via EMedStore White-label Patient Portal</p>
                </div>
              </div>
            </div>

            {/* POS Inventory Mapping Form */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-600 px-1">
                <Clipboard className="h-4 w-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  POS Inventory Mapping
                </h3>
              </div>

              <div className="glass-card p-5 space-y-4 shadow-md flex flex-col justify-between min-h-[380px]">
                <div className="space-y-4">
                  {/* Patient Info Card */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="text-xs text-slate-400 font-semibold">Patient Account</p>
                    <p className="font-extrabold text-sm text-slate-800">{selectedOrder.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Prescription validated and authorized ✓
                    </p>
                  </div>

                  {/* Mapping list */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Map to Active Inventory Drugs
                    </label>

                    {selectedOrder.mappedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 p-3 border border-slate-100 rounded-xl bg-white shadow-xs">
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-700 truncate">
                            {item.medicineName}
                          </p>
                          <span className="inline-block mt-0.5 text-[8px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                            In Stock
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                            className="w-12 px-1 py-0.5 text-xs border border-slate-200 rounded text-center font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                            min={1}
                          />
                          <span className="text-[10px] text-slate-400 font-bold">qty</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleConvertToPOS}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95 duration-150 mt-4"
                >
                  Convert to POS Billing
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-16">Select an order from queue to begin mapping</p>
        )}
      </div>
    </div>
  );
}

// Chevron Right helper
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
