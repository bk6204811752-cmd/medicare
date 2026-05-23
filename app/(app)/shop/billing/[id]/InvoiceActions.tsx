"use client";

import Link from "next/link";
import { Send, Printer, ArrowLeft } from "lucide-react";

export function InvoiceActions({ whatsappText }: { whatsappText: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/shop/billing/history"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> History
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Printer className="h-4 w-4" /> Print Invoice
      </button>
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-med-green px-4 py-2 text-sm font-semibold text-white hover:bg-med-greenDark transition-all"
      >
        <Send className="h-4 w-4" /> WhatsApp Share
      </a>
    </div>
  );
}
